import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Chưa có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào. Hãy bắt đầu bằng cách thêm mới.',
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        {icon || <Inbox size={28} className="text-muted-foreground/40" />}
      </div>
      <h3 className="text-[15px] font-bold text-foreground mb-1">{title}</h3>
      <p className="text-[13px] text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
