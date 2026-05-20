import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import type { Customer } from '../../../types';
import { useCreateCustomerAccount } from '../../../hooks/queries/useCustomers';

interface Props {
  customer: Customer | null;
  onClose: () => void;
}

const CreateCustomerAccountDialog: React.FC<Props> = ({ customer, onClose }) => {
  const createAccountMutation = useCreateCustomerAccount();
  const [form, setForm] = useState({ phone: '', email: '', password: 'ResetPassword123' });

  useEffect(() => {
    if (customer) {
      setForm({
        phone: customer.phone || '',
        email: '',
        password: 'ResetPassword123',
      });
    }
  }, [customer]);

  if (!customer) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await createAccountMutation.mutateAsync({
      customer_id: customer.id,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      password: form.password,
      full_name: customer.name,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <h3 className="text-[15px] font-bold text-foreground">Tạo tài khoản khách hàng</h3>
          <p className="text-[12px] text-muted-foreground mt-1">{customer.name}</p>
        </div>

        <div className="p-5 space-y-4">
          <Field
            label="Số điện thoại đăng nhập"
            value={form.phone}
            required
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          />
          <Field
            label="Email (tuỳ chọn)"
            type="email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          />
          <Field
            label="Mật khẩu tạm"
            value={form.password}
            required
            minLength={6}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
        </div>

        <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={createAccountMutation.isPending}
            className="px-4 py-2 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={createAccountMutation.isPending}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {createAccountMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Tạo tài khoản
          </button>
        </div>
      </form>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}> = ({ label, value, onChange, type = 'text', required, minLength }) => (
  <div className="space-y-1.5">
    <label className="text-[12px] font-semibold text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value}
      required={required}
      minLength={minLength}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
    />
  </div>
);

export default CreateCustomerAccountDialog;
