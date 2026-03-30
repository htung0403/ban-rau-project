import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, MapPin, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import type { Candidate, InterviewFormState } from '../types';

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  isEditMode?: boolean;
  onClose: () => void;
  candidateId: string | null;
  candidatesData: Candidate[];
  ivForm: InterviewFormState;
  setIvField: <K extends keyof InterviewFormState>(key: K, value: InterviewFormState[K]) => void;
}

const AddEditInterviewDialog: React.FC<Props> = ({
  isOpen,
  isClosing,
  isEditMode = false,
  onClose,
  candidateId,
  candidatesData,
  ivForm,
  setIvField,
}) => {
  if (!isOpen && !isClosing) return null;

  const candidate = candidatesData.find(c => c.id === candidateId);

  const {
    ivRound, ivStatus, ivDate, ivTime, ivFormat, ivLocation,
    ivEvalStatus, ivEvalScore, ivEvalComment, ivResult, ivNote,
  } = ivForm;

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
            <h2 className="text-lg font-bold text-foreground">
              {isEditMode ? 'Chỉnh sửa lịch phỏng vấn' : 'Thêm lịch phỏng vấn'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
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
            <div className="p-5 space-y-4">
              {/* Ứng viên */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ứng viên <span className="text-red-500">*</span></label>
                <div className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-[13px] text-muted-foreground flex items-center justify-between">
                  <span>{candidate?.name} · {candidate?.positionId}</span>
                  <ChevronRight size={16} className="opacity-30" />
                </div>
              </div>

              {/* Vòng + Trạng thái */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground">Vòng <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={ivRound}
                    onChange={e => setIvField('ivRound', e.target.value)}
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                    Trạng thái
                  </label>
                  <SearchableSelect
                    options={[
                      { value: 'waiting', label: 'Chờ' },
                      { value: 'done', label: 'Đã diễn ra' },
                      { value: 'cancelled', label: 'Hủy' },
                    ]}
                    value={ivStatus}
                    onValueChange={(v: string) => setIvField('ivStatus', v)}
                    placeholder="Trạng thái"
                  />
                </div>
              </div>

              {/* Ngày + Giờ */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted-foreground/50" />
                    Ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ivDate}
                    onChange={e => setIvField('ivDate', e.target.value)}
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-muted-foreground/50 text-[12px]">&#9719;</span>
                    Giờ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={ivTime}
                    onChange={e => setIvField('ivTime', e.target.value)}
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              {/* Hình thức */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Hình thức <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={[
                    { value: 'direct', label: 'Trực tiếp' },
                    { value: 'online', label: 'Trực tuyến' },
                    { value: 'phone', label: 'Điện thoại' },
                  ]}
                  value={ivFormat}
                  onValueChange={(v: string) => setIvField('ivFormat', v)}
                  placeholder="Chọn hình thức"
                />
              </div>

              {/* Địa điểm */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                  <MapPin size={13} className="text-muted-foreground/50" />
                  Địa điểm / Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ivLocation}
                  onChange={e => setIvField('ivLocation', e.target.value)}
                  placeholder="Địa điểm hoặc link meeting"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
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
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Trạng thái đánh giá</label>
                <SearchableSelect
                  options={[
                    { value: 'none', label: 'Chưa đánh giá' },
                    { value: 'pass', label: 'Đạt' },
                    { value: 'fail', label: 'Không đạt' },
                    { value: 'pending', label: 'Chờ xem xét' },
                  ]}
                  value={ivEvalStatus}
                  onValueChange={(v: string) => setIvField('ivEvalStatus', v)}
                  placeholder="Chưa đánh giá"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Điểm / Tiêu chí đánh giá</label>
                <input
                  type="text"
                  value={ivEvalScore}
                  onChange={e => setIvField('ivEvalScore', e.target.value)}
                  placeholder="VD: 8/10 hoặc Đạt yêu cầu"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Nhận xét đánh giá</label>
                <textarea
                  rows={4}
                  value={ivEvalComment}
                  onChange={e => setIvField('ivEvalComment', e.target.value)}
                  className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Kết quả</label>
                <input
                  type="text"
                  value={ivResult}
                  onChange={e => setIvField('ivResult', e.target.value)}
                  placeholder="VD: Đạt, chờ vòng 2"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ghi chú</label>
                <textarea
                  rows={3}
                  value={ivNote}
                  onChange={e => setIvField('ivNote', e.target.value)}
                  className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
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
            Hủy
          </button>
          <button className="flex items-center gap-2 px-8 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all group">
            <User size={16} />
            {isEditMode ? 'Lưu thay đổi' : 'Thêm mới'}
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AddEditInterviewDialog;
