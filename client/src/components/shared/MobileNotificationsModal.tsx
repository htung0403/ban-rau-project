import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, CheckCheck, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useNotifications } from '../../context/NotificationContext';

interface MobileNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNotificationsModal: React.FC<MobileNotificationsModalProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      refreshNotifications();
    } else if (isRendered) {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayNotifications = isExpanded ? notifications : notifications.slice(0, 10);
  const hasMore = notifications.length > 10;

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info size={20} className="text-blue-500" />;
      case 'warning': return <AlertTriangle size={20} className="text-amber-500" />;
      case 'success': return <CheckCircle2 size={20} className="text-emerald-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  const getTypeStyles = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-transparent';
    switch (type) {
      case 'info': return 'bg-blue-500/5';
      case 'warning': return 'bg-amber-500/5';
      case 'success': return 'bg-emerald-500/5';
      default: return 'bg-transparent';
    }
  };

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div 
        ref={modalRef}
        className="absolute inset-0 bg-background flex flex-col"
        style={{
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Bell size={22} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">Thông báo</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                {unreadCount} mới
              </span>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors active:scale-90"
              >
                <CheckCheck size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/50">
              {displayNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={clsx(
                    "p-4 transition-colors cursor-pointer active:bg-muted/50",
                    getTypeStyles(notification.type, notification.is_read)
                  )}
                >
                  <div className="flex gap-3">
                    <div className={clsx(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                      notification.type === 'info' && "bg-blue-100",
                      notification.type === 'warning' && "bg-amber-100",
                      notification.type === 'success' && "bg-emerald-100"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={clsx(
                          "text-[15px] font-semibold leading-tight",
                          notification.is_read ? "text-foreground/70" : "text-foreground"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-relaxed mb-1.5 line-clamp-2">
                        {notification.description}
                      </p>
                      <span className="text-[11px] text-muted-foreground/60 font-medium">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Bell size={36} className="opacity-30" />
              </div>
              <p className="text-[14px] font-medium">Không có thông báo nào</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">Thông báo sẽ xuất hiện ở đây</p>
            </div>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-4 text-center text-[13px] font-semibold text-primary hover:bg-primary/5 border-t border-border active:bg-primary/10 transition-colors"
          >
            {isExpanded ? 'Thu gọn' : `Xem thêm ${notifications.length - 10} thông báo`}
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileNotificationsModal;