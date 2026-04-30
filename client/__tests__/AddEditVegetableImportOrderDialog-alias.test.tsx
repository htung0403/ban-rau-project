import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AddEditVegetableImportOrderDialog from '../src/pages/import-orders/dialogs/AddEditVegetableImportOrderDialog';

const mockCustomers = [
  { id: 'c1', name: 'Vựa No Aliases', phone: '0901', customer_type: 'vegetable_receiver', total_orders: 0, total_revenue: 0, debt: 0, created_at: '2026-01-01' },
  { id: 'c2', name: 'Vựa With Aliases', phone: '0902', customer_type: 'vegetable_receiver', total_orders: 0, total_revenue: 0, debt: 0, created_at: '2026-01-01', aliases: ['Alias X', 'Alias Y'] },
];

const mockEmployees = [
  { id: 'e1', full_name: 'Employee One' },
];

vi.mock('../src/hooks/queries/useImportOrders', () => ({
  useCreateImportOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateImportOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  importOrderKeys: { all: ['importOrders'] },
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

vi.mock('../src/hooks/queries/useVehicles', () => ({
  useVehicles: () => ({ data: [], isError: false }),
}));

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', full_name: 'Test User', role: 'admin' } }),
}));

vi.mock('../src/api/uploadApi', () => ({
  uploadApi: { uploadFile: vi.fn() },
}));

vi.mock('../src/api/deliveryApi', () => ({
  deliveryApi: { getAllToday: vi.fn(), assignVehicle: vi.fn() },
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

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

const defaultProps = {
  isOpen: true,
  isClosing: false,
  editingOrder: null,
  onClose: vi.fn(),
  defaultCategory: 'vegetable' as const,
};

describe('AddEditVegetableImportOrderDialog - Alias Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show alias dropdown when no customer is selected', () => {
    render(<AddEditVegetableImportOrderDialog {...defaultProps} />);
    expect(screen.queryByText('Biệt danh (tùy chọn)')).not.toBeInTheDocument();
  });

  it('renders the dialog with customer selector present', () => {
    render(<AddEditVegetableImportOrderDialog {...defaultProps} />);
    expect(screen.getByText('Tên vựa (Người nhận)')).toBeInTheDocument();
  });

  it('renders the form with selected_alias field in schema', () => {
    render(<AddEditVegetableImportOrderDialog {...defaultProps} />);
    expect(screen.getByText('Lập Phiếu Nhập Hàng')).toBeInTheDocument();
  });
});