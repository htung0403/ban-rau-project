import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20',
    },
    primary: {
      icon: 'bg-primary/10 text-primary',
      button: 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20',
    },
  };

  const styles = variantStyles[variant];

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', styles.icon)}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl border border-border text-foreground text-[13px] font-bold hover:bg-muted transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              'px-5 py-2 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50',
              styles.button,
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
