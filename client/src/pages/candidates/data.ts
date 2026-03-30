import type { Candidate, FilterOption, InterviewSession } from './types';

export const candidatesData: Candidate[] = [
  {
    id: '1',
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@email.com',
    phone: '0901234567',
    birthYear: '1995',
    position: 'Lập trình viên Senior',
    positionId: 'DX-2025-001',
    status: 'interviewing',
    source: 'Website công ty',
    latestInterview: '16:00 - 10/02/2025',
    latestResult: 'Đạt, chờ vòng 2',
    createdAt: '17:00 - 15/01/2025',
    documents: [
      { id: 'd1', name: 'CV_Nguyen_Van_A.pdf', type: 'CV', link: '#' },
      { id: 'd2', name: 'Bang_dai_hoc.pdf', type: 'Bằng cấp', link: '#' },
    ],
  },
  {
    id: '2',
    name: 'Trần Thị B',
    email: 'tranthib@email.com',
    phone: '0912345678',
    birthYear: '—',
    position: 'Chuyên viên Tuyển dụng',
    positionId: 'DX-2025-002',
    status: 'hired',
    source: 'Giới thiệu nội bộ',
    latestInterview: '21:00 - 25/01/2025',
    latestResult: 'Trúng tuyển, đã gửi thư mời nhận việc',
    createdAt: '15:30 - 08/01/2025',
    documents: [{ id: 'd3', name: 'CV_Tran_Thi_B.pdf', type: 'CV', link: '#' }],
  },
  {
    id: '3',
    name: 'Lê Văn C',
    email: 'levanc@email.com',
    phone: '0987654321',
    birthYear: '1992',
    position: 'Lập trình viên Senior',
    positionId: 'DX-2025-001',
    status: 'new',
    source: 'Vieclam24h / Job board',
    latestInterview: '—',
    latestResult: '—',
    createdAt: '18:00 - 01/02/2025',
    documents: [],
  },
  {
    id: '4',
    name: 'Phạm Thị D',
    email: 'phamthid@email.com',
    phone: '0777123456',
    birthYear: '—',
    position: 'Lập trình viên Frontend',
    positionId: 'DX-2025-004',
    status: 'rejected',
    source: 'LinkedIn',
    latestInterview: '17:00 - 18/01/2025',
    latestResult: 'Từ chối',
    createdAt: '16:00 - 20/12/2024',
    documents: [{ id: 'd4', name: 'CV_Pham_Thi_D.pdf', type: 'CV', link: '#' }],
  },
];

export const statusConfig: Record<Candidate['status'], { label: string; classes: string }> = {
  new: { label: 'Mới', classes: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  interviewing: { label: 'Mời phỏng vấn', classes: 'bg-sky-500/10 text-sky-600 border-sky-100' },
  hired: { label: 'Nhận việc', classes: 'bg-indigo-500/10 text-indigo-600 border-indigo-100' },
  rejected: { label: 'Từ chối', classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-100' },
};

export const sourceConfig: Record<string, { label: string; classes: string }> = {
  'Website công ty': { label: 'Website công ty', classes: 'bg-sky-500/10 text-sky-500 border-sky-100' },
  'Giới thiệu nội bộ': { label: 'Giới thiệu nội bộ', classes: 'bg-indigo-500/10 text-indigo-500 border-indigo-100' },
  'Vieclam24h / Job board': { label: 'Vieclam24h / Job board', classes: 'bg-orange-500/10 text-orange-500 border-orange-100' },
  'LinkedIn': { label: 'LinkedIn', classes: 'bg-purple-500/10 text-purple-500 border-purple-100' },
};

export const statusOptions: FilterOption[] = [
  { id: 'new', label: 'Mới', count: 1 },
  { id: 'interviewing', label: 'Mời phỏng vấn', count: 1 },
  { id: 'rejected', label: 'Từ chối', count: 1 },
  { id: 'hired', label: 'Nhận việc', count: 1 },
];

export const positionOptions: FilterOption[] = [
  { id: 'DX-2025-001', label: 'DX-2025-001 · Lập trình viên Senior', count: 2 },
  { id: 'DX-2025-002', label: 'DX-2025-002 · Chuyên viên Tuyển dụng', count: 1 },
  { id: 'DX-2025-004', label: 'DX-2025-004 · Lập trình viên Frontend', count: 1 },
];

export const sourceOptions: FilterOption[] = [
  { id: 'Website công ty', label: 'Website công ty', count: 1 },
  { id: 'LinkedIn', label: 'LinkedIn', count: 1 },
  { id: 'Giới thiệu nội bộ', label: 'Giới thiệu nội bộ', count: 1 },
  { id: 'Vieclam24h / Job board', label: 'Vieclam24h / Job board', count: 1 },
];

export const mockInterviewSessions: InterviewSession[] = [
  {
    round: 1,
    date: '2026-03-10',
    time: '09:00',
    format: 'Trực tiếp',
    location: 'Phòng họp A, Tầng 3',
    status: 'Đã diễn ra',
    statusColor: 'emerald',
    evalStatus: 'Đạt',
    score: '8/10',
    comment: 'Ứng viên có kinh nghiệm tốt, giao tiếp tốt, thái độ tích cực. Cần thêm kinh nghiệm về quản lý nhóm.',
    result: 'Đạt',
  },
  {
    round: 2,
    date: '2026-03-17',
    time: '14:00',
    format: 'Trực tuyến',
    location: 'Google Meet (link gửi sau)',
    status: 'Chờ',
    statusColor: 'orange',
    evalStatus: 'Chưa đánh giá',
    score: '',
    comment: '',
    result: '',
  },
];
