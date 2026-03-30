import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Mail, Edit, Trash2, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { Candidate, InterviewSession } from '../types';

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onEditInterview: (idx: number) => void;
  onDeleteInterview: (idx: number) => void;
  candidateId: string | null;
  candidatesData: Candidate[];
  sessions: InterviewSession[];
  selectedIdx: number;
}

const InterviewDetailDialog: React.FC<Props> = ({
  isOpen,
  isClosing,
  onClose,
  onEditInterview,
  onDeleteInterview,
  candidateId,
  candidatesData,
  sessions,
  selectedIdx,
}) => {
  if (!isOpen && !isClosing) return null;

  const candidate = candidatesData.find(c => c.id === candidateId);
  const session = sessions[selectedIdx];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-350 ease-out',
          isClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full max-w-[750px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing
            ? 'dialog-slide-out'
            : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Chi tiết buổi phỏng vấn</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {candidate?.name ?? 'Ứng viên'} · Vòng {session?.round}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="px-6 py-3 bg-white border-b border-border flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-muted text-[12px] font-bold text-foreground transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            In đánh giá
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-bold transition-all hover:bg-primary/90 shadow-sm shadow-primary/20">
            <User size={14} />
            Đánh giá
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-muted text-[12px] font-bold text-foreground transition-all">
            <Mail size={14} />
            In thư mời
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* THÔNG TIN BUỔI PV */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin buổi PV</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Ứng viên</p>
                  <p className="text-[13px] font-semibold text-foreground">{candidate?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Vị trí ứng tuyển</p>
                  <p className="text-[13px] font-semibold text-foreground">{candidate?.position ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Vòng</p>
                  <p className="text-[13px] font-semibold text-foreground">Vòng {session?.round}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Ngày – Giờ</p>
                  <p className="text-[13px] font-semibold text-foreground">{session?.date} · {session?.time}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Hình thức</p>
                  <p className="text-[13px] font-semibold text-foreground">{session?.format}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Địa điểm</p>
                  <p className="text-[13px] font-semibold text-foreground">{session?.location}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Trạng thái</p>
                  {session?.statusColor === 'emerald' ? (
                    <span className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200 text-[12px] font-bold">
                      {session.status}
                    </span>
                  ) : session?.statusColor === 'orange' ? (
                    <span className="inline-flex px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-200 text-[12px] font-bold">
                      {session.status}
                    </span>
                  ) : (
                    <span className="inline-flex px-3 py-1 rounded-full bg-muted/30 text-muted-foreground border border-border text-[12px] font-bold">
                      {session?.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ĐÁNH GIÁ */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Đánh giá</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Điểm / Tiêu chí đánh giá</p>
                {session?.score ? (
                  <p className="text-[22px] font-bold text-primary">{session.score}</p>
                ) : (
                  <p className="text-[13px] text-muted-foreground italic">Chưa có điểm đánh giá</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Nhận xét đánh giá</p>
                {session?.comment ? (
                  <p className="text-[13px] text-foreground leading-relaxed bg-muted/10 border border-border rounded-xl px-4 py-3">
                    {session.comment}
                  </p>
                ) : (
                  <p className="text-[13px] text-muted-foreground italic">Chưa có nhận xét</p>
                )}
              </div>
            </div>
          </div>

          {/* KẾT QUẢ */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <ChevronRight size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Kết quả</span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Trạng thái đánh giá</p>
                {session?.evalStatus === 'Đạt' ? (
                  <span className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200 text-[12px] font-bold">Đạt</span>
                ) : session?.evalStatus === 'Không đạt' ? (
                  <span className="inline-flex px-3 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-200 text-[12px] font-bold">Không đạt</span>
                ) : (
                  <span className="inline-flex px-3 py-1 rounded-full bg-muted/30 text-muted-foreground border border-border text-[12px] font-bold">
                    {session?.evalStatus || 'Chưa đánh giá'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Kết quả</p>
                {session?.result === 'Đạt' ? (
                  <span className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200 text-[12px] font-bold">Đạt</span>
                ) : session?.result === 'Không đạt' ? (
                  <span className="inline-flex px-3 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-200 text-[12px] font-bold">Không đạt</span>
                ) : (
                  <span className="inline-flex px-3 py-1 rounded-full bg-muted/30 text-muted-foreground border border-border text-[12px] font-bold">
                    {session?.result || '—'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditInterview(selectedIdx)}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all"
            >
              <Edit size={14} />
              Sửa
            </button>
            <button
              onClick={() => onDeleteInterview(selectedIdx)}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 shadow-sm shadow-red-500/20 transition-all"
            >
              <Trash2 size={14} />
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default InterviewDetailDialog;
