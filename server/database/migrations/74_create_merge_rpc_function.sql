-- Create atomic merge RPC function for customer merge operations
-- Performs all merge steps in a single transaction with advisory locking
CREATE OR REPLACE FUNCTION public.merge_customers_atomic(
    p_source_id UUID,
    p_target_id UUID,
    p_merged_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_source_name         VARCHAR(255);
    v_source_data         JSONB;
    v_source_user_id      UUID;
    v_source_is_loyal     BOOLEAN;
    v_source_customer_type VARCHAR(20);
    v_target_user_id      UUID;
    v_target_is_loyal     BOOLEAN;
    v_target_customer_type VARCHAR(20);
    v_affected_order_ids  JSONB;
    v_source_ledger_jsonb JSONB;
    v_new_ledger_ids      JSONB;
    v_merge_id            UUID;
    v_target_debt         NUMERIC;
    v_target_total_orders INTEGER;
    v_target_total_revenue NUMERIC;
BEGIN
    -- ============================================================
    -- 1. Validate both customers exist and are not soft-deleted
    -- ============================================================
    IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = p_source_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Source customer not found or already deleted: %', p_source_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = p_target_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Target customer not found or already deleted: %', p_target_id;
    END IF;

    -- ============================================================
    -- 2. Validate not merging into itself
    -- ============================================================
    IF p_source_id = p_target_id THEN
        RAISE EXCEPTION 'Cannot merge a customer into itself';
    END IF;

    -- ============================================================
    -- 3. Validate both have same customer_type
    -- ============================================================
    SELECT customer_type INTO v_source_customer_type
    FROM public.customers WHERE id = p_source_id;

    SELECT customer_type INTO v_target_customer_type
    FROM public.customers WHERE id = p_target_id;

    IF v_source_customer_type != v_target_customer_type THEN
        RAISE EXCEPTION 'Cannot merge customers of different types';
    END IF;

    -- ============================================================
    -- 4. Acquire advisory lock to prevent concurrent merge operations
    -- ============================================================
    PERFORM pg_advisory_xact_lock(
        hashtext(p_source_id::text || ':' || p_target_id::text)
    );

    -- ============================================================
    -- 5. Snapshot source customer into v_source_data JSONB
    -- ============================================================
    SELECT name, user_id, is_loyal
    INTO v_source_name, v_source_user_id, v_source_is_loyal
    FROM public.customers WHERE id = p_source_id;

    v_source_data := (
        SELECT jsonb_build_object(
            'id', id::TEXT,
            'name', name,
            'phone', phone,
            'address', address,
            'customer_type', customer_type,
            'user_id', user_id::TEXT,
            'is_loyal', is_loyal,
            'total_orders', total_orders,
            'total_revenue', total_revenue,
            'debt', debt,
            'aliases', to_jsonb(COALESCE(aliases, ARRAY[]::TEXT[])),
            'created_at', created_at::TEXT
        )
        FROM public.customers WHERE id = p_source_id
    );

    -- ============================================================
    -- 6. Collect affected order IDs into JSONB for undo tracking
    -- ============================================================
    v_affected_order_ids := jsonb_build_object(
        'import_orders', COALESCE(
            (SELECT jsonb_agg(id::TEXT) FROM public.import_orders WHERE customer_id = p_source_id),
            '[]'::JSONB
        ),
        'vegetable_orders', COALESCE(
            (SELECT jsonb_agg(id::TEXT) FROM public.vegetable_orders WHERE customer_id = p_source_id),
            '[]'::JSONB
        ),
        'export_orders', COALESCE(
            (SELECT jsonb_agg(id::TEXT) FROM public.export_orders WHERE customer_id = p_source_id),
            '[]'::JSONB
        ),
        'receipts', COALESCE(
            (SELECT jsonb_agg(id::TEXT) FROM public.receipts WHERE customer_id = p_source_id),
            '[]'::JSONB
        ),
        'payment_collections', COALESCE(
            (SELECT jsonb_agg(id::TEXT) FROM public.payment_collections WHERE customer_id = p_source_id),
            '[]'::JSONB
        )
    );

    -- Snapshot source ledger entries for undo tracking
    v_source_ledger_jsonb := COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id', id::TEXT,
            'customer_id', customer_id::TEXT,
            'amount', amount,
            'transaction_type', transaction_type,
            'reference_id', reference_id::TEXT,
            'notes', notes,
            'created_at', created_at::TEXT,
            'created_by', created_by::TEXT
        ))
        FROM public.customer_debt_ledger WHERE customer_id = p_source_id),
        '[]'::JSONB
    );

    -- ============================================================
    -- 7. Update FK references (5 tables — customer_debt_ledger in step 8)
    -- ============================================================
    UPDATE public.import_orders SET customer_id = p_target_id WHERE customer_id = p_source_id;
    UPDATE public.vegetable_orders SET customer_id = p_target_id WHERE customer_id = p_source_id;
    UPDATE public.export_orders SET customer_id = p_target_id WHERE customer_id = p_source_id;
    UPDATE public.receipts SET customer_id = p_target_id WHERE customer_id = p_source_id;
    UPDATE public.payment_collections SET customer_id = p_target_id WHERE customer_id = p_source_id;

    -- ============================================================
    -- 8. Handle customer_debt_ledger via DELETE+INSERT (NOT UPDATE)
    --    INSERT first to copy entries to target, then DELETE originals
    -- ============================================================
    WITH new_entries AS (
        INSERT INTO public.customer_debt_ledger (
            customer_id, amount, transaction_type, reference_id, notes, created_by, created_at
        )
        SELECT
            p_target_id, amount, transaction_type, reference_id, notes, created_by, created_at
        FROM public.customer_debt_ledger
        WHERE customer_id = p_source_id
        RETURNING id
    )
    SELECT COALESCE(jsonb_agg(id::TEXT), '[]'::JSONB)
    INTO v_new_ledger_ids
    FROM new_entries;

    DELETE FROM public.customer_debt_ledger WHERE customer_id = p_source_id;

    -- Add ledger data to affected_order_ids for undo tracking
    v_affected_order_ids := v_affected_order_ids || jsonb_build_object(
        'customer_debt_ledger', v_source_ledger_jsonb,
        'customer_debt_ledger_ids', v_new_ledger_ids
    );

    -- ============================================================
    -- 9. Add source name to target aliases (if not already present)
    -- ============================================================
    UPDATE public.customers
    SET aliases = array_append(COALESCE(aliases, ARRAY[]::TEXT[]), v_source_name)
    WHERE id = p_target_id
      AND NOT (v_source_name = ANY(COALESCE(aliases, ARRAY[]::TEXT[])));

    -- ============================================================
    -- 10. Handle user_id transfer
    --     Clear source first to avoid UNIQUE constraint violation
    -- ============================================================
    SELECT user_id INTO v_target_user_id FROM public.customers WHERE id = p_target_id;

    -- Always clear source user_id first to respect UNIQUE constraint
    UPDATE public.customers SET user_id = NULL WHERE id = p_source_id AND user_id IS NOT NULL;

    -- If target has no user_id and source had one, transfer it
    IF v_target_user_id IS NULL AND v_source_user_id IS NOT NULL THEN
        UPDATE public.customers SET user_id = v_source_user_id WHERE id = p_target_id;
    END IF;

    -- ============================================================
    -- 11. Merge is_loyal: set target's is_loyal = TRUE if either was loyal
    -- ============================================================
    SELECT is_loyal INTO v_target_is_loyal FROM public.customers WHERE id = p_target_id;

    IF v_source_is_loyal OR v_target_is_loyal THEN
        UPDATE public.customers SET is_loyal = TRUE WHERE id = p_target_id;
    END IF;

    -- ============================================================
    -- 12. Recalculate target stats from actual data
    -- ============================================================

    -- debt from ledger
    SELECT COALESCE(SUM(amount), 0) INTO v_target_debt
    FROM public.customer_debt_ledger
    WHERE customer_id = p_target_id;

    -- total_orders from import_orders + vegetable_orders
    SELECT COUNT(*)::INTEGER INTO v_target_total_orders
    FROM (
        SELECT id FROM public.import_orders WHERE customer_id = p_target_id
        UNION ALL
        SELECT id FROM public.vegetable_orders WHERE customer_id = p_target_id
    ) AS all_orders;

    -- total_revenue from import_orders + vegetable_orders
    SELECT COALESCE(SUM(total_amount), 0) INTO v_target_total_revenue
    FROM (
        SELECT total_amount FROM public.import_orders WHERE customer_id = p_target_id
        UNION ALL
        SELECT total_amount FROM public.vegetable_orders WHERE customer_id = p_target_id
    ) AS all_orders;

    UPDATE public.customers SET
        debt = v_target_debt,
        total_orders = v_target_total_orders,
        total_revenue = v_target_total_revenue
    WHERE id = p_target_id;

    -- ============================================================
    -- 13. Reset source stats to 0
    -- ============================================================
    UPDATE public.customers SET
        total_orders = 0,
        total_revenue = 0,
        debt = 0
    WHERE id = p_source_id;

    -- ============================================================
    -- 14. Soft-delete source customer
    -- ============================================================
    UPDATE public.customers
    SET deleted_at = NOW(), user_id = NULL
    WHERE id = p_source_id;

    -- ============================================================
    -- 15. Insert merge log into customer_merges
    -- ============================================================
    INSERT INTO public.customer_merges (
        source_id, target_id, source_name, source_data, affected_order_ids, merged_by
    ) VALUES (
        p_source_id, p_target_id, v_source_name, v_source_data, v_affected_order_ids, p_merged_by
    )
    RETURNING id INTO v_merge_id;

    -- ============================================================
    -- 16. Return merge record as JSONB
    -- ============================================================
    RETURN jsonb_build_object(
        'success', true,
        'merge_id', v_merge_id,
        'source_id', p_source_id,
        'target_id', p_target_id,
        'source_name', v_source_name,
        'source_data', v_source_data,
        'affected_order_ids', v_affected_order_ids,
        'merged_by', p_merged_by,
        'message', 'Customers merged successfully'
    );
END;
$$ LANGUAGE plpgsql;
