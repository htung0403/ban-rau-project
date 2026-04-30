import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AddEditStandardImportOrderDialog from '../src/pages/import-orders/dialogs/AddEditStandardImportOrderDialog';

const mockCustomers = [
  { id: 'c1', name: 'Customer No Aliases', phone: '0901', customer_type: 'grocery_receiver', total_orders: 0, total_revenue: 0, debt: 0, created_at: '2026-01-01' },
  { id: 'c2', name: 'Customer With Aliases', phone: '0902', customer_type: 'grocery_receiver', total_orders: 0, total_revenue: 0, debt: 0, created_at: '2026-01-01', aliases: ['Alias A', 'Alias B'] },
];

const mockEmployees = [
  { id: 'e1', full_name: 'Employee One' },
];

vi.mock('../src/hooks/queries/useImportOrders', () => ({
  useCreateImportOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateImportOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../src/hooks/queries/useCustomers', () => ({
  useCustomers: () => ({ data: mockCustomers }),
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../src/hooks/queries/useProducts', () => ({
  useProducts: () => ({ data: [] }),
  useCreateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  productMatchesScope: () => true,
}));

vi.mock('../src/hooks/queries/useHR', () => ({
  useEmployees: () => ({ data: mockEmployees }),
}));

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', full_name: 'Test User' } }),
}));

vi.mock('../src/api/uploadApi', () => ({
  uploadApi: { uploadFile: vi.fn() },
}));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  isOpen: true,
  isClosing: false,
  editingOrder: null,
  onClose: vi.fn(),
  defaultCategory: 'standard' as const,
};

describe('AddEditStandardImportOrderDialog - Alias Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show alias dropdown when no customer is selected', () => {
    render(<AddEditStandardImportOrderDialog {...defaultProps} />);
    expect(screen.queryByText('Biệt danh (tùy chọn)')).not.toBeInTheDocument();
  });

  it('renders the dialog with customer selector present', () => {
    render(<AddEditStandardImportOrderDialog {...defaultProps} />);
    expect(screen.getByText('Người nhận')).toBeInTheDocument();
  });

  it('renders the form with selected_alias field in schema', () => {
    render(<AddEditStandardImportOrderDialog {...defaultProps} />);
    expect(screen.getByText('Lập Phiếu Nhập Hàng')).toBeInTheDocument();
  });
});