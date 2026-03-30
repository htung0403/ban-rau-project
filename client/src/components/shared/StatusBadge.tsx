import React from 'react';
import { clsx } from 'clsx';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Chờ xử lý' },
  processing: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Đang xử lý' },
  delivered: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Đã giao' },
  returned: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Trả lại' },
  in_progress: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Đang thực hiện' },
  completed: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Hoàn thành' },
  approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Đã duyệt' },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Từ chối' },
  draft: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', label: 'Nháp' },
  confirmed: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Đã chốt' },
  paid: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Đã thanh toán' },
  unpaid: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Chưa thanh toán' },
  partial: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Thanh toán một phần' },
  available: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Sẵn sàng' },
  in_transit: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Đang vận chuyển' },
  maintenance: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'Bảo trì' },
  assigned: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', label: 'Đã phân công' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const style = statusStyles[status] || { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: status };
  const displayLabel = label || style.label;

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap',
        style.bg, style.text,
        className,
      )}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
