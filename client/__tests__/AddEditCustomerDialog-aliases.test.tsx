import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEditCustomerDialog from '../src/pages/customers/dialogs/AddEditCustomerDialog';

vi.mock('../src/hooks/queries/useCustomers', () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCustomers: () => ({ data: [] }),
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
  onClose: vi.fn(),
  mode: 'create' as const,
};

describe('AddEditCustomerDialog - Alias Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders alias management section', () => {
    render(<AddEditCustomerDialog {...defaultProps} />);
    expect(screen.getByText('Biệt danh')).toBeInTheDocument();
    expect(screen.getByText('Thêm biệt danh')).toBeInTheDocument();
  });

  it('adds aliases when clicking add button', async () => {
    const user = userEvent.setup();
    render(<AddEditCustomerDialog {...defaultProps} />);

    expect(screen.queryByPlaceholderText('Nhập biệt danh')).not.toBeInTheDocument();

    const addBtn = screen.getByText('Thêm biệt danh');
    await user.click(addBtn);

    const inputs = screen.getAllByPlaceholderText('Nhập biệt danh');
    expect(inputs).toHaveLength(1);
  });

  it('removes aliases when clicking remove button', async () => {
    const user = userEvent.setup();
    render(<AddEditCustomerDialog {...defaultProps} />);

    const addBtn = screen.getByText('Thêm biệt danh');
    await user.click(addBtn);

    expect(screen.getAllByPlaceholderText('Nhập biệt danh')).toHaveLength(1);

    const removeBtn = screen.getByLabelText('Xóa biệt danh 1');
    await user.click(removeBtn);

    expect(screen.queryByPlaceholderText('Nhập biệt danh')).not.toBeInTheDocument();
  });

  it('populates aliases when editing a customer', () => {
    const customer = {
      id: '1',
      name: 'Test Customer',
      phone: '0901234567',
      address: '123 Test St',
      customer_type: 'grocery' as const,
      total_orders: 0,
      total_revenue: 0,
      debt: 0,
      aliases: ['Alias A', 'Alias B'],
      created_at: '2026-01-01',
    };

    render(
      <AddEditCustomerDialog
        {...defaultProps}
        mode="edit"
        customer={customer}
      />
    );

    const aliasInputs = screen.getAllByPlaceholderText('Nhập biệt danh');
    expect(aliasInputs).toHaveLength(2);
    expect((aliasInputs[0] as HTMLInputElement).value).toBe('Alias A');
    expect((aliasInputs[1] as HTMLInputElement).value).toBe('Alias B');
  });

  it('updates alias value when typing', async () => {
    const user = userEvent.setup();
    render(<AddEditCustomerDialog {...defaultProps} />);

    const addBtn = screen.getByText('Thêm biệt danh');
    await user.click(addBtn);

    const input = screen.getByPlaceholderText('Nhập biệt danh');
    await user.type(input, 'New Alias');

    expect((input as HTMLInputElement).value).toBe('New Alias');
  });

  it('shows no alias inputs by default in create mode', () => {
    render(<AddEditCustomerDialog {...defaultProps} />);
    expect(screen.queryByPlaceholderText('Nhập biệt danh')).not.toBeInTheDocument();
  });
});