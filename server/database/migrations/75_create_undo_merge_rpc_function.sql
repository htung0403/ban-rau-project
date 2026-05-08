CREATE OR REPLACE FUNCTION public.undo_customer_merge(
    p_merge_id UUID,
    p_undone_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_source_id UUID;
    v_target_id UUID;
    v_source_name VARCHAR(255);
    v_source_data JSONB;
    v_affected_order_ids JSONB;
    v_table_name TEXT;
    v_order_id UUID;
    v_count INTEGER;
    v_source_row RECORD;
BEGIN
    -- ============================================================
    -- 1. Validate merge exists and hasn't been undone
    -- ============================================================
    SELECT
        cm.source_id,
        cm.target_id,
        cm.source_name,
        cm.source_data,
        cm.affected_order_ids
    INTO
        v_source_id,
        v_target_id,
        v_source_name,
        v_source_data,
        v_affected_order_ids
    FROM public.customer_merges cm
    WHERE cm.id = p_merge_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Merge record not found: %', p_merge_id;
    END IF;

    -- Check if already undone
    IF EXISTS (
        SELECT 1 FROM public.customer_merges
        WHERE id = p_merge_id AND undone_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Merge % has already been undone', p_merge_id;
    END IF;

    -- ============================================================
    -- 2. Acquire advisory lock to prevent concurrent operations
    -- ============================================================
    PERFORM pg_advisory_xact_lock(
        ('x' || v_source_id::TEXT)::BIT(64)::BIGINT
    );

    -- ============================================================
    -- 3. Reverse ALL FK updates — move rows back to source_id
    -- ============================================================

    -- 3a. import_orders
    UPDATE public.import_orders
    SET customer_id = v_source_id
    WHERE customer_id = v_target_id
      AND id IN (
          SELECT val::UUID
          FROM jsonb_array_elements_text(
              v_affected_order_ids->'import_orders'
          ) AS val
      );

    -- 3b. vegetable_orders
    UPDATE public.vegetable_orders
    SET customer_id = v_source_id
    WHERE customer_id = v_target_id
      AND id IN (
          SELECT val::UUID
          FROM jsonb_array_elements_text(
              v_affected_order_ids->'vegetable_orders'
          ) AS val
      );

    -- 3c. export_orders
    UPDATE public.export_orders
    SET customer_id = v_source_id
    WHERE customer_id = v_target_id
      AND id IN (
          SELECT val::UUID
          FROM jsonb_array_elements_text(
              v_affected_order_ids->'export_orders'
          ) AS val
      );

    -- 3d. receipts
    UPDATE public.receipts
    SET customer_id = v_source_id
    WHERE customer_id = v_target_id
      AND id IN (
          SELECT val::UUID
          FROM jsonb_array_elements_text(
              v_affected_order_ids->'receipts'
          ) AS val
      );

    -- 3e. payment_collections
    UPDATE public.payment_collections
    SET customer_id = v_source_id
    WHERE customer_id = v_target_id
      AND id IN (
          SELECT val::UUID
          FROM jsonb_array_elements_text(
              v_affected_order_ids->'payment_collections'
          ) AS val
      );

    -- ============================================================
    -- 4. Reverse customer_debt_ledger changes
    --    During merge, source ledger entries were moved to target.
    --    Undo: re-create entries under source_id, delete the duplicates from target_id.
    -- ============================================================
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'customer_debt_ledger'
    ) THEN
        IF v_affected_order_ids ? 'customer_debt_ledger' THEN
            INSERT INTO public.customer_debt_ledger (
                customer_id, amount, transaction_type,
                reference_id, notes, created_by, created_at
            )
            SELECT
                v_source_id,
                (entry->>'amount')::NUMERIC,
                entry->>'transaction_type',
                (entry->>'reference_id')::UUID,
                entry->>'notes',
                (entry->>'created_by')::UUID,
                (entry->>'created_at')::TIMESTAMPTZ
            FROM jsonb_array_elements(
                v_affected_order_ids->'customer_debt_ledger'
            ) AS entry;

            DELETE FROM public.customer_debt_ledger
            WHERE customer_id = v_target_id
              AND id IN (
                  SELECT (val::UUID)
                  FROM jsonb_array_elements_text(
                      v_affected_order_ids->'customer_debt_ledger_ids'
                  ) AS val
              );
        END IF;
    END IF;

    -- ============================================================
    -- 5. Restore source customer from source_data snapshot
    --    id and created_at stay unchanged; restore everything else
    -- ============================================================
    UPDATE public.customers SET
        name       = v_source_data->>'name',
        phone      = v_source_data->>'phone',
        address    = v_source_data->>'address',
        customer_type = v_source_data->>'customer_type',
        is_loyal   = COALESCE((v_source_data->>'is_loyal')::BOOLEAN, FALSE),
        user_id    = COALESCE((v_source_data->>'user_id')::UUID, NULL),
        aliases    = COALESCE(
                        ARRAY(SELECT jsonb_array_elements_text(v_source_data->'aliases')),
                        ARRAY[]::TEXT[]
                     ),
        deleted_at = NULL  -- un-soft-delete
    WHERE id = v_source_id;

    -- ============================================================
    -- 6. Remove source name from target's aliases
    -- ============================================================
    UPDATE public.customers
    SET aliases = array_remove(aliases, v_source_name)
    WHERE id = v_target_id;

    -- ============================================================
    -- 7. Recalculate target customer's stats from actual data
    -- ============================================================
    WITH order_stats AS (
        SELECT
            v_target_id AS cid,
            COUNT(*) AS total_orders,
            COALESCE(SUM(debt_amount), 0) AS total_debt,
            COALESCE(SUM(
                CASE WHEN payment_status = 'paid' THEN debt_amount
                     ELSE paid_amount END
            ), 0) AS total_revenue
        FROM (
            SELECT debt_amount, paid_amount, payment_status
            FROM public.import_orders WHERE customer_id = v_target_id AND deleted_at IS NULL
            UNION ALL
            SELECT debt_amount, paid_amount, payment_status
            FROM public.vegetable_orders WHERE customer_id = v_target_id AND deleted_at IS NULL
            UNION ALL
            SELECT debt_amount, paid_amount, payment_status
            FROM public.export_orders WHERE customer_id = v_target_id
        ) AS all_orders
    ),
    receipt_total AS (
        SELECT
            v_target_id AS cid,
            COALESCE(SUM(amount), 0) AS total_receipts
        FROM public.receipts
        WHERE customer_id = v_target_id
    )
    UPDATE public.customers c SET
        total_orders = os.total_orders,
        total_revenue = os.total_revenue,
        debt = GREATEST(os.total_debt - rt.total_receipts, 0)
    FROM order_stats os, receipt_total rt
    WHERE c.id = os.cid AND c.id = rt.cid;

    -- ============================================================
    -- 8. Recalculate source customer's stats from actual data
    -- ============================================================
    WITH order_stats AS (
        SELECT
            v_source_id AS cid,
            COUNT(*) AS total_orders,
            COALESCE(SUM(debt_amount), 0) AS total_debt,
            COALESCE(SUM(
                CASE WHEN payment_status = 'paid' THEN debt_amount
                     ELSE paid_amount END
            ), 0) AS total_revenue
        FROM (
            SELECT debt_amount, paid_amount, payment_status
            FROM public.import_orders WHERE customer_id = v_source_id AND deleted_at IS NULL
            UNION ALL
            SELECT debt_amount, paid_amount, payment_status
            FROM public.vegetable_orders WHERE customer_id = v_source_id AND deleted_at IS NULL
            UNION ALL
            SELECT debt_amount, paid_amount, payment_status
            FROM public.export_orders WHERE customer_id = v_source_id
        ) AS all_orders
    ),
    receipt_total AS (
        SELECT
            v_source_id AS cid,
            COALESCE(SUM(amount), 0) AS total_receipts
        FROM public.receipts
        WHERE customer_id = v_source_id
    )
    UPDATE public.customers c SET
        total_orders = os.total_orders,
        total_revenue = os.total_revenue,
        debt = GREATEST(os.total_debt - rt.total_receipts, 0)
    FROM order_stats os, receipt_total rt
    WHERE c.id = os.cid AND c.id = rt.cid;

    -- ============================================================
    -- 9. Mark merge as undone
    -- ============================================================
    UPDATE public.customer_merges
    SET undone_at = NOW(),
        undone_by = p_undone_by
    WHERE id = p_merge_id;

    -- ============================================================
    -- 10. Return confirmation
    -- ============================================================
    RETURN jsonb_build_object(
        'success', true,
        'merge_id', p_merge_id,
        'source_id', v_source_id,
        'target_id', v_target_id,
        'source_name', v_source_name,
        'message', 'Customer merge has been successfully undone'
    );
END;
$$ LANGUAGE plpgsql;