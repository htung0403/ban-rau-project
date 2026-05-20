export const CUSTOMER_ORDER_PAGE_PATH = '/tai-khoan/don-hang';
export const CUSTOMER_ORDER_CREATE_PATH = '/tai-khoan/don-hang/tao-don';

export type SupportedCustomerType =
  | 'grocery_sender'
  | 'grocery_receiver'
  | 'vegetable_sender'
  | 'vegetable_receiver';

type CustomerOrderBinding = 'sender' | 'receiver';
type CustomerOrderCategory = 'standard' | 'vegetable';

export type CustomerOrderPolicy = {
  customerType: SupportedCustomerType;
  orderCategory: CustomerOrderCategory;
  binding: CustomerOrderBinding;
};

const CUSTOMER_ORDER_POLICIES: Record<SupportedCustomerType, CustomerOrderPolicy> = {
  grocery_sender: {
    customerType: 'grocery_sender',
    orderCategory: 'standard',
    binding: 'sender',
  },
  grocery_receiver: {
    customerType: 'grocery_receiver',
    orderCategory: 'standard',
    binding: 'receiver',
  },
  vegetable_sender: {
    customerType: 'vegetable_sender',
    orderCategory: 'vegetable',
    binding: 'sender',
  },
  vegetable_receiver: {
    customerType: 'vegetable_receiver',
    orderCategory: 'vegetable',
    binding: 'receiver',
  },
};

export const resolveCustomerOrderPolicy = (customerType?: string | null): CustomerOrderPolicy | null => {
  if (!customerType) return null;
  return CUSTOMER_ORDER_POLICIES[customerType as SupportedCustomerType] ?? null;
};

export const isCustomerOrderEditable = (order: {
  status?: string | null;
  admin_confirmed_at?: string | null;
}) => {
  if (order.admin_confirmed_at) return false;
  return order.status === 'pending';
};

export const applyCustomerBinding = (
  payload: Record<string, unknown>,
  customer: { id: string; name: string },
  policy: CustomerOrderPolicy,
) => {
  const nextPayload = { ...payload, order_category: policy.orderCategory };

  if (policy.binding === 'sender') {
    return {
      ...nextPayload,
      sender_id: customer.id,
      sender_name: customer.name,
    };
  }

  return {
    ...nextPayload,
    customer_id: customer.id,
    receiver_name: customer.name,
  };
};
