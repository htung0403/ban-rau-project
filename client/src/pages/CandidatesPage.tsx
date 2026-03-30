import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, Search, Plus, Filter,
  Edit, Trash2, X, BarChart2, Users, TrendingUp,
  ChevronRight, List, Columns, GripVertical,
  RotateCcw, Tag as TagIcon, Briefcase,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  candidatesData, statusConfig, sourceConfig,
  statusOptions, positionOptions, sourceOptions, mockInterviewSessions,
} from './candidates/data';
import type { Candidate, CandidateDocument, CandidateFormState, InterviewFormState, FilterOption, InterviewSession } from './candidates/types';
import AddEditCandidateDialog from './candidates/dialogs/AddEditCandidateDialog';
import CandidateDetailDialog from './candidates/dialogs/CandidateDetailDialog';
import AddEditInterviewDialog from './candidates/dialogs/AddEditInterviewDialog';
import InterviewDetailDialog from './candidates/dialogs/InterviewDetailDialog';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

type ColDef = { label: string; thClass: string; tdClass: string; renderContent: (c: import('./candidates/types').Candidate) => React.ReactNode };
const COLUMN_DEFS: Record<string, ColDef> = {
  name:         { label: 'Họ tên',           thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-40 border-r border-border/40',  tdClass: 'px-4 py-4 truncate border-r border-border/40',   renderContent: (c) => <span className="text-[13px] font-bold text-foreground">{c.name}</span> },
  email:        { label: 'Email',            thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-45',                              tdClass: 'px-4 py-4 truncate border-r border-border/40',   renderContent: (c) => <span className="text-[12px] text-muted-foreground font-medium">{c.email}</span> },
  phone:        { label: 'SĐT',             thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-25',                              tdClass: 'px-4 py-4 truncate',                             renderContent: (c) => <span className="text-[12px] text-muted-foreground font-medium">{c.phone}</span> },
  birthYear:    { label: 'Năm sinh',         thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-20',                              tdClass: 'px-4 py-4 text-center',                          renderContent: (c) => <span className="text-[12px] text-muted-foreground font-medium">{c.birthYear}</span> },
  position:     { label: 'Vị trí ứng tuyển', thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-[170px]',                         tdClass: 'px-4 py-4 truncate',                             renderContent: (c) => <div className="flex flex-col"><span className="text-[12px] font-bold text-foreground leading-tight">{c.positionId}</span><span className="text-[11px] text-muted-foreground opacity-70 truncate">{c.position}</span></div> },
  status:       { label: 'Trạng thái',       thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-[110px]',                         tdClass: 'px-4 py-4',                                      renderContent: (c) => <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap block text-center', statusConfig[c.status].classes)}>{statusConfig[c.status].label}</span> },
  source:       { label: 'Nguồn',            thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-35',                              tdClass: 'px-4 py-4',                                      renderContent: (c) => <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap block text-center', sourceConfig[c.source]?.classes || 'bg-muted text-muted-foreground')}>{c.source}</span> },
  latestDate:   { label: 'Ngày PV gần nhất', thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-[150px]',                         tdClass: 'px-4 py-4 whitespace-nowrap',                    renderContent: (c) => <span className="text-[12px] text-muted-foreground/80 font-medium tabular-nums">{c.latestInterview}</span> },
  latestResult: { label: 'Kết quả gần nhất', thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-[150px]',                         tdClass: 'px-4 py-4 truncate',                             renderContent: (c) => <span className="text-[11px] text-muted-foreground/80 font-medium">{c.latestResult}</span> },
  createdAt:    { label: 'Ngày tạo',         thClass: 'px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-35 border-r border-border/40',    tdClass: 'px-4 py-4 whitespace-nowrap border-r border-border/40', renderContent: (c) => <span className="text-[12px] text-muted-foreground/80 font-medium tabular-nums">{c.createdAt}</span> },
};
const DEFAULT_COL_ORDER = Object.keys(COLUMN_DEFS);

const CandidatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalClosing, setIsAddModalClosing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  // Interview Modal State
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isInterviewModalClosing, setIsInterviewModalClosing] = useState(false);
  const [ivRound, setIvRound] = useState('1');
  const [ivStatus, setIvStatus] = useState('waiting');
  const [ivDate, setIvDate] = useState('');
  const [ivTime, setIvTime] = useState('09:00');
  const [ivFormat, setIvFormat] = useState('direct');
  const [ivLocation, setIvLocation] = useState('');
  const [ivEvalStatus, setIvEvalStatus] = useState('none');
  const [ivEvalScore, setIvEvalScore] = useState('');
  const [ivEvalComment, setIvEvalComment] = useState('');
  const [ivResult, setIvResult] = useState('');
  const [ivNote, setIvNote] = useState('');

  // Interview Edit Mode
  const [isInterviewEditMode, setIsInterviewEditMode] = useState(false);

  // Interview Sessions state
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>(mockInterviewSessions);

  // Interview Detail Modal State
  const [isInterviewDetailOpen, setIsInterviewDetailOpen] = useState(false);
  const [isInterviewDetailClosing, setIsInterviewDetailClosing] = useState(false);
  const [selectedInterviewIdx, setSelectedInterviewIdx] = useState<number>(0);

  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [searchText, setSearchText] = useState('');

  // Selected Filters
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBirthYear, setFormBirthYear] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [formLatestInterview, setFormLatestInterview] = useState('');
  const [formLatestResult, setFormLatestResult] = useState('');
  const [formInternalNotes, setFormInternalNotes] = useState('');
  const [formDocuments, setFormDocuments] = useState<CandidateDocument[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COL_ORDER);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COL_ORDER);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const dragColIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Mobile filter sheet state
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [mobileFilterClosing, setMobileFilterClosing] = useState(false);
  const [mobileFilterSearch, setMobileFilterSearch] = useState('');
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>('status');
  // Pending selections (applied only on "Áp dụng")
  const [pendingStatuses, setPendingStatuses] = useState<string[]>([]);
  const [pendingPositions, setPendingPositions] = useState<string[]>([]);
  const [pendingSources, setPendingSources] = useState<string[]>([]);

  const closeMobileFilter = () => {
    setMobileFilterClosing(true);
    setTimeout(() => {
      setShowMobileFilter(false);
      setMobileFilterClosing(false);
    }, 280);
  };
  const openMobileFilter = () => {
    setPendingStatuses(selectedStatuses);
    setPendingPositions(selectedPositions);
    setPendingSources(selectedSources);
    setMobileFilterSearch('');
    setMobileExpandedSection(null);
    setShowMobileFilter(true);
  };
  const applyMobileFilter = () => {
    setSelectedStatuses(pendingStatuses);
    setSelectedPositions(pendingPositions);
    setSelectedSources(pendingSources);
    closeMobileFilter();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bundled form state objects for dialog props
  const formState: CandidateFormState = {
    formName,
    formEmail,
    formPhone,
    formAddress,
    formBirthYear,
    formBirthDate,
    formSource,
    formPosition,
    formStatus,
    formLatestInterview,
    formLatestResult,
    formInternalNotes,
    formDocuments,
  };

  const setFormField = <K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) => {
    const map: Record<keyof CandidateFormState, (v: CandidateFormState[K]) => void> = {
      formName: setFormName as (v: CandidateFormState[K]) => void,
      formEmail: setFormEmail as (v: CandidateFormState[K]) => void,
      formPhone: setFormPhone as (v: CandidateFormState[K]) => void,
      formAddress: setFormAddress as (v: CandidateFormState[K]) => void,
      formBirthYear: setFormBirthYear as (v: CandidateFormState[K]) => void,
      formBirthDate: setFormBirthDate as (v: CandidateFormState[K]) => void,
      formSource: setFormSource as (v: CandidateFormState[K]) => void,
      formPosition: setFormPosition as (v: CandidateFormState[K]) => void,
      formStatus: setFormStatus as (v: CandidateFormState[K]) => void,
      formLatestInterview: setFormLatestInterview as (v: CandidateFormState[K]) => void,
      formLatestResult: setFormLatestResult as (v: CandidateFormState[K]) => void,
      formInternalNotes: setFormInternalNotes as (v: CandidateFormState[K]) => void,
      formDocuments: setFormDocuments as unknown as (v: CandidateFormState[K]) => void,
    };
    map[key](value);
  };

  const ivForm: InterviewFormState = {
    ivRound,
    ivStatus,
    ivDate,
    ivTime,
    ivFormat,
    ivLocation,
    ivEvalStatus,
    ivEvalScore,
    ivEvalComment,
    ivResult,
    ivNote,
  };

  const setIvField = <K extends keyof InterviewFormState>(key: K, value: InterviewFormState[K]) => {
    const map: Record<keyof InterviewFormState, (v: InterviewFormState[K]) => void> = {
      ivRound: setIvRound as (v: InterviewFormState[K]) => void,
      ivStatus: setIvStatus as (v: InterviewFormState[K]) => void,
      ivDate: setIvDate as (v: InterviewFormState[K]) => void,
      ivTime: setIvTime as (v: InterviewFormState[K]) => void,
      ivFormat: setIvFormat as (v: InterviewFormState[K]) => void,
      ivLocation: setIvLocation as (v: InterviewFormState[K]) => void,
      ivEvalStatus: setIvEvalStatus as (v: InterviewFormState[K]) => void,
      ivEvalScore: setIvEvalScore as (v: InterviewFormState[K]) => void,
      ivEvalComment: setIvEvalComment as (v: InterviewFormState[K]) => void,
      ivResult: setIvResult as (v: InterviewFormState[K]) => void,
      ivNote: setIvNote as (v: InterviewFormState[K]) => void,
    };
    map[key](value);
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormBirthYear('');
    setFormBirthDate('');
    setFormSource('');
    setFormPosition('');
    setFormStatus('');
    setFormLatestInterview('');
    setFormLatestResult('');
    setFormInternalNotes('');
    setFormDocuments([]);
  };

  const populateForm = (candidate: Candidate) => {
    setFormName(candidate.name);
    setFormEmail(candidate.email);
    setFormPhone(candidate.phone);
    setFormAddress('Q.1, TP.HCM'); // Mock data or from candidate if available
    setFormBirthYear(candidate.birthYear);
    setFormBirthDate('1995-05-15'); // Mock data or from candidate if available
    setFormSource(candidate.source);
    setFormPosition(candidate.positionId);
    setFormStatus(candidate.status);
    setFormLatestInterview(candidate.latestInterview);
    setFormLatestResult(candidate.latestResult);
    setFormInternalNotes('Ưu tiên gọi lại sau Tết.'); // Mock data
    setFormDocuments(candidate.documents.map(d => ({ ...d })));
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsAddModalOpen(true);
  };

  const closeAddModal = (callback?: () => void) => {
    setIsAddModalClosing(true);
    setTimeout(() => {
      setIsAddModalOpen(false);
      setIsAddModalClosing(false);
      if (callback) callback();
    }, 350);
  };

  const openInterviewModal = () => {
    setIsInterviewEditMode(false);
    setIvRound('1');
    setIvStatus('waiting');
    setIvDate('');
    setIvTime('09:00');
    setIvFormat('direct');
    setIvLocation('');
    setIvEvalStatus('none');
    setIvEvalScore('');
    setIvEvalComment('');
    setIvResult('');
    setIvNote('');
    setIsInterviewModalOpen(true);
  };

  const openInterviewEditModal = (idx: number) => {
    const session = interviewSessions[idx];
    if (!session) return;
    const statusMap: Record<string, string> = { 'Chờ': 'waiting', 'Đã diễn ra': 'done', 'Hủy': 'cancelled' };
    const formatMap: Record<string, string> = { 'Trực tiếp': 'direct', 'Trực tuyến': 'online', 'Điện thoại': 'phone' };
    const evalMap: Record<string, string> = { 'Đạt': 'pass', 'Không đạt': 'fail', 'Chưa đánh giá': 'none', 'Chờ xem xét': 'pending' };
    setIsInterviewEditMode(true);
    setIvRound(String(session.round));
    setIvStatus(statusMap[session.status] ?? 'waiting');
    setIvDate(session.date);
    setIvTime(session.time);
    setIvFormat(formatMap[session.format] ?? 'direct');
    setIvLocation(session.location);
    setIvEvalStatus(evalMap[session.evalStatus] ?? 'none');
    setIvEvalScore(session.score);
    setIvEvalComment(session.comment);
    setIvResult(session.result);
    setIvNote('');
    setIsInterviewModalOpen(true);
  };

  const closeInterviewModal = (callback?: () => void) => {
    setIsInterviewModalClosing(true);
    setTimeout(() => {
      setIsInterviewModalOpen(false);
      setIsInterviewModalClosing(false);
      if (callback) callback();
    }, 350);
  };

  const openInterviewDetail = (idx: number) => {
    setSelectedInterviewIdx(idx);
    setIsInterviewDetailOpen(true);
  };

  const closeInterviewDetail = (callback?: () => void) => {
    setIsInterviewDetailClosing(true);
    setTimeout(() => {
      setIsInterviewDetailOpen(false);
      setIsInterviewDetailClosing(false);
      if (callback) callback();
    }, 350);
  };

  const handleEditInterviewFromDetail = (idx: number) => {
    closeInterviewDetail(() => openInterviewEditModal(idx));
  };

  const handleDeleteInterview = (idx: number) => {
    setInterviewSessions(prev => prev.filter((_, i) => i !== idx));
    closeInterviewDetail();
  };

  const closeDetailModal = (callback?: () => void) => {
    setIsDetailClosing(true);
    setTimeout(() => {
      setSelectedCandidateId(null);
      setIsDetailClosing(false);
      if (callback) callback();
    }, 350);
  };

  const handleOpenEditModal = (candidateId: string) => {
    const candidate = candidatesData.find(c => c.id === candidateId);
    if (candidate) {
      populateForm(candidate);
      setIsEditMode(true);
      setIsAddModalOpen(true);
    }
  };

  const handleEditFromDetail = () => {
    if (selectedCandidateId) {
      const candidate = candidatesData.find(c => c.id === selectedCandidateId);
      if (candidate) {
        populateForm(candidate);
        setIsEditMode(true);
        closeDetailModal(() => setIsAddModalOpen(true));
      }
    }
  };

  const handleAddDocument = () => {
    if (selectedCandidateId) {
      const candidate = candidatesData.find(c => c.id === selectedCandidateId);
      if (candidate) {
        populateForm(candidate);
        setIsEditMode(true);
        setIsAddModalOpen(true); // Keep detail dialog open
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setFilterSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCandidates = candidatesData.filter(c => {
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const matchesText =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.positionId.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q) ||
        c.birthYear.includes(q) ||
        c.latestResult.toLowerCase().includes(q);
      if (!matchesText) return false;
    }
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(c.status)) return false;
    if (selectedPositions.length > 0 && !selectedPositions.includes(c.positionId)) return false;
    if (selectedSources.length > 0 && !selectedSources.includes(c.source)) return false;
    return true;
  });

  const hasActiveFilters = selectedStatuses.length > 0 || selectedPositions.length > 0 || selectedSources.length > 0;

  const toggleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedCandidates.includes(id)) {
      setSelectedCandidates(selectedCandidates.filter((item: string) => item !== id));
    } else {
      setSelectedCandidates([...selectedCandidates, id]);
    }
  };


  const renderDropdown = (type: string, options: FilterOption[], selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (activeDropdown !== type) return null;

    const filteredOptions = options.filter(opt =>
      opt.label.toLowerCase().includes(filterSearch.toLowerCase())
    );

    const toggleOption = (id: string) => {
      if (selected.includes(id)) {
        setSelected(selected.filter(item => item !== id));
      } else {
        setSelected([...selected, id]);
      }
    };

    const toggleAll = () => {
      if (selected.length === options.length) {
        setSelected([]);
      } else {
        setSelected(options.map(opt => opt.id));
      }
    };

    return (
      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={14} />
            <input
              autoFocus
              type="text"
              placeholder="Tìm kiếm..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-muted/20 border border-primary/20 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
          </div>
        </div>

        <div className="p-1 px-2 border-b border-border/60 bg-muted/5">
          <div className="flex items-center justify-between p-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                checked={selected.length === options.length && options.length > 0}
                onChange={toggleAll}
              />
              <span className="text-[13px] font-bold text-muted-foreground">Chọn tất cả</span>
            </label>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="text-[12px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Xóa chọn
              </button>
            )}
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto p-1 py-2">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <label
                key={opt.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                    checked={selected.includes(opt.id)}
                    onChange={() => toggleOption(opt.id)}
                  />
                  <span className="text-[13px] font-medium text-foreground tracking-tight">{opt.label}</span>
                </div>
                <span className="text-[12px] font-bold text-primary/40 group-hover:text-primary transition-colors">{opt.count}</span>
              </label>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              Không tìm thấy kết quả
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      {/* Top Sidebar Style Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setActiveTab('list')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all",
            activeTab === 'list'
              ? "bg-white text-primary shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List size={14} />
          Danh sách
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all",
            activeTab === 'stats'
              ? "bg-white text-primary shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart2 size={14} />
          Thống kê
        </button>
      </div>

      {activeTab === 'list' ? (
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {/* ── MOBILE TOOLBAR ── */}
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-border">
          <button
            onClick={() => navigate('/nhan-su')}
            className="p-2 rounded-xl border border-border bg-white text-muted-foreground shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              type="text"
              placeholder="Tìm kiếm . . ."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={openMobileFilter}
            className={clsx(
              'relative p-2 rounded-xl border shrink-0 transition-all',
              hasActiveFilters ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-white text-muted-foreground',
            )}
          >
            <Filter size={18} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                {selectedStatuses.length + selectedPositions.length + selectedSources.length}
              </span>
            )}
          </button>
          <button
            onClick={handleOpenAddModal}
            className="p-2 rounded-xl bg-primary text-white shrink-0 shadow-md shadow-primary/20"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* ── MOBILE CARD LIST ── */}
        <div className="md:hidden flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {filteredCandidates.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground italic">Không tìm thấy kết quả phù hợp</div>
          ) : filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              onClick={() => setSelectedCandidateId(candidate.id)}
              className="bg-white rounded-2xl border border-border shadow-sm p-4 cursor-pointer hover:shadow-md active:bg-muted/10 transition-all"
            >
              {/* Row 1: avatar + name + email + checkbox */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-foreground leading-tight">{candidate.name}</span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap', statusConfig[candidate.status].classes)}>
                      {statusConfig[candidate.status].label}
                    </span>
                    {candidate.source && (
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap', sourceConfig[candidate.source]?.classes || 'bg-muted text-muted-foreground border-border')}>
                        {candidate.source}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground font-medium mt-0.5 truncate">{candidate.email}</p>
                </div>
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary/20 mt-1 shrink-0"
                  checked={selectedCandidates.includes(candidate.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(candidate.id); }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {/* Row 2: position */}
              <div className="mt-3 pl-13">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Vị trí ứng tuyển</p>
                <p className="text-[13px] font-bold text-foreground">{candidate.positionId} · {candidate.position}</p>
              </div>
              {/* Row 3: interview info + actions */}
              <div className="mt-3 pl-13 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground/80 font-medium tabular-nums">
                  {candidate.latestInterview}
                </p>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenEditModal(candidate.id)}
                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile pagination */}
        <div className="md:hidden px-4 py-3 border-t border-border flex items-center justify-between bg-muted/5">
          <span className="text-[12px] text-muted-foreground font-medium">
            {filteredCandidates.length > 0 ? `1–${filteredCandidates.length}` : '0'}/Tổng {filteredCandidates.length}
          </span>
          <div className="flex items-center gap-1">
            <select className="bg-white border border-border rounded-lg px-2 py-1 focus:outline-none text-[11px] font-bold shadow-sm">
              <option>20 / trang</option>
              <option>50 / trang</option>
            </select>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-20" disabled><ChevronLeft size={15} /></button>
            <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-[11px] font-bold">1</div>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-20" disabled><ChevronRight size={15} /></button>
          </div>
        </div>

        {/* ── MOBILE FILTER BOTTOM SHEET (portal) ── */}
        {showMobileFilter && createPortal(
          <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className={clsx('absolute inset-0 bg-black/40 transition-opacity duration-300', mobileFilterClosing ? 'opacity-0' : 'opacity-100')}
              onClick={closeMobileFilter}
            />
            {/* Sheet */}
            <div className={clsx('relative bg-white rounded-t-3xl flex flex-col max-h-[85vh] shadow-2xl', mobileFilterClosing ? 'animate-out slide-out-to-bottom duration-300' : 'animate-in slide-in-from-bottom duration-300')}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-primary" />
                  <span className="text-[16px] font-bold text-foreground">Bộ lọc</span>
                  {hasActiveFilters && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                      {selectedStatuses.length + selectedPositions.length + selectedSources.length}
                    </span>
                  )}
                </div>
                <button onClick={closeMobileFilter} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground">
                  <X size={18} />
                </button>
              </div>
              {/* Accordion sections */}
              <div className="flex-1 overflow-y-auto">
                {([
                  { id: 'status',   label: 'Trạng thái',       icon: <TagIcon size={16} />,   options: statusOptions,   pending: pendingStatuses,   setPending: setPendingStatuses as React.Dispatch<React.SetStateAction<string[]>> },
                  { id: 'position', label: 'Vị trí ứng tuyển', icon: <Briefcase size={16} />, options: positionOptions,  pending: pendingPositions,  setPending: setPendingPositions as React.Dispatch<React.SetStateAction<string[]>> },
                  { id: 'source',   label: 'Nguồn',            icon: <Filter size={16} />,    options: sourceOptions,   pending: pendingSources,    setPending: setPendingSources as React.Dispatch<React.SetStateAction<string[]>> },
                ]).map((section) => {
                  const isOpen = mobileExpandedSection === section.id;
                  const filtered = section.options.filter(o =>
                    mobileFilterSearch === '' || section.id !== mobileExpandedSection || o.label.toLowerCase().includes(mobileFilterSearch.toLowerCase())
                  );
                  return (
                    <div key={section.id} className="border-b border-border/60">
                      <button
                        onClick={() => setMobileExpandedSection(isOpen ? null : section.id)}
                        className="w-full flex items-center justify-between px-5 py-4"
                      >
                        <div className="flex items-center gap-3 text-foreground">
                          <span className="text-muted-foreground">{section.icon}</span>
                          <span className="text-[15px] font-semibold">{section.label}</span>
                          {section.pending.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{section.pending.length}</span>
                          )}
                        </div>
                        <ChevronRight size={16} className={clsx('text-muted-foreground/50 transition-transform', isOpen ? 'rotate-90' : '')} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-3 animate-in slide-in-from-top-2 fade-in duration-200">
                          {/* Search within section */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={13} />
                            <input
                              type="text"
                              placeholder={`Tìm ${section.label.toLowerCase()}...`}
                              value={mobileFilterSearch}
                              onChange={(e) => setMobileFilterSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 rounded-xl bg-muted/20 border border-border/60 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 font-medium"
                            />
                          </div>
                          {/* Select all row */}
                          <div className="flex items-center justify-between mb-2 px-1">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                                checked={section.pending.length === section.options.length && section.options.length > 0}
                                onChange={() => section.setPending(
                                  section.pending.length === section.options.length ? [] : section.options.map(o => o.id)
                                )}
                              />
                              <span className="text-[13px] font-bold text-muted-foreground">Chọn tất cả</span>
                            </label>
                            {section.pending.length > 0 && (
                              <button onClick={() => section.setPending([])} className="text-[12px] font-bold text-primary">Xóa chọn</button>
                            )}
                          </div>
                          {/* Options */}
                          <div className="space-y-0.5">
                            {filtered.map(opt => (
                              <label key={opt.id} className="flex items-center justify-between px-1 py-2.5 rounded-xl hover:bg-muted/20 cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                                    checked={section.pending.includes(opt.id)}
                                    onChange={() => {
                                      section.setPending(prev => prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]);
                                    }}
                                  />
                                  <span className="text-[14px] font-medium text-foreground">{opt.label}</span>
                                </div>
                                <span className="text-[12px] font-bold text-muted-foreground tabular-nums">
                                  {candidatesData.filter((c) =>
                                    section.id === 'status' ? c.status === opt.id :
                                    section.id === 'position' ? c.positionId === opt.id :
                                    c.source === opt.id
                                  ).length}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Apply button */}
              <div className="p-4 border-t border-border bg-white">
                {(pendingStatuses.length + pendingPositions.length + pendingSources.length) > 0 && (
                  <button
                    onClick={() => { setPendingStatuses([]); setPendingPositions([]); setPendingSources([]); }}
                    className="w-full mb-2 py-2.5 rounded-2xl border border-dashed border-red-300 text-red-500 text-[14px] font-bold hover:bg-red-50 transition-all"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                )}
                <button
                  onClick={applyMobileFilter}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white text-[15px] font-bold shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {/* ── DESKTOP TOOLBAR ── */}
        <div className="hidden md:block p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => navigate('/nhan-su')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground text-[12px] font-bold transition-all bg-white shadow-sm shrink-0"
              >
                <ChevronLeft size={16} />
                Quay lại
              </button>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm . . ."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-8 py-1.5 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={columnPickerRef}>
                <button
                  onClick={() => setShowColumnPicker(v => !v)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold shadow-sm',
                    showColumnPicker
                      ? 'bg-primary/5 border-primary text-primary'
                      : 'bg-white border-border hover:bg-muted text-muted-foreground',
                  )}
                  title="Chọn cột hiển thị"
                >
                  <Columns size={15} />
                  <span>Cột hiển thị</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{visibleColumns.length}/{columnOrder.length}</span>
                </button>
                {showColumnPicker && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/5 flex items-center justify-between">
                      <span className="text-[12px] font-bold text-foreground">Cột hiển thị</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium">{visibleColumns.length}/{columnOrder.length}</span>
                        <button
                          onClick={() => { setVisibleColumns(DEFAULT_COL_ORDER); setColumnOrder(DEFAULT_COL_ORDER); }}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Đặt lại"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="py-1 max-h-72 overflow-y-auto">
                      {columnOrder.map((colId, idx) => (
                        <div
                          key={colId}
                          draggable
                          onDragStart={() => { dragColIdx.current = idx; }}
                          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                          onDrop={() => {
                            if (dragColIdx.current === null || dragColIdx.current === idx) return;
                            const next = [...columnOrder];
                            const [removed] = next.splice(dragColIdx.current, 1);
                            next.splice(idx, 0, removed);
                            setColumnOrder(next);
                            dragColIdx.current = null;
                            setDragOverIdx(null);
                          }}
                          onDragEnd={() => { dragColIdx.current = null; setDragOverIdx(null); }}
                          className={clsx(
                            'flex items-center gap-2 px-3 py-2 transition-colors select-none',
                            dragOverIdx === idx ? 'bg-primary/10 border-t-2 border-primary' : 'hover:bg-muted/20',
                          )}
                        >
                          <GripVertical size={14} className="text-muted-foreground/30 cursor-grab shrink-0" />
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4 shrink-0"
                              checked={visibleColumns.includes(colId)}
                              onChange={() => setVisibleColumns(prev =>
                                prev.includes(colId)
                                  ? prev.filter(id => id !== colId)
                                  : [...prev, colId]
                              )}
                            />
                            <span className="text-[13px] font-medium text-foreground">{COLUMN_DEFS[colId].label}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-6 py-1.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
              >
                <Plus size={18} />
                Thêm
              </button>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-2" ref={dropdownRef}>
            <div className="relative">
              <button
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'status' ? null : 'status');
                  setFilterSearch('');
                }}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold",
                  activeDropdown === 'status' || selectedStatuses.length > 0
                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                    : "bg-white border-border hover:bg-muted text-muted-foreground"
                )}
              >
                <TagIcon size={14} className={clsx(activeDropdown === 'status' || selectedStatuses.length > 0 ? "text-primary" : "text-muted-foreground/50")} />
                Trạng thái
                {selectedStatuses.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {selectedStatuses.length}
                  </span>
                )}
                <ChevronRight size={14} className={clsx("transition-transform ml-1 opacity-40", activeDropdown === 'status' ? "-rotate-90" : "rotate-90")} />
              </button>
              {renderDropdown('status', statusOptions, selectedStatuses, setSelectedStatuses)}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'position' ? null : 'position');
                  setFilterSearch('');
                }}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold",
                  activeDropdown === 'position' || selectedPositions.length > 0
                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                    : "bg-white border-border hover:bg-muted text-muted-foreground"
                )}
              >
                <Briefcase size={14} className={clsx(activeDropdown === 'position' || selectedPositions.length > 0 ? "text-primary" : "text-muted-foreground/50")} />
                Vị trí ứng tuyển
                {selectedPositions.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {selectedPositions.length}
                  </span>
                )}
                <ChevronRight size={14} className={clsx("transition-transform ml-1 opacity-40", activeDropdown === 'position' ? "-rotate-90" : "rotate-90")} />
              </button>
              {renderDropdown('position', positionOptions, selectedPositions, setSelectedPositions)}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'source' ? null : 'source');
                  setFilterSearch('');
                }}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold",
                  activeDropdown === 'source' || selectedSources.length > 0
                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                    : "bg-white border-border hover:bg-muted text-muted-foreground"
                )}
              >
                <Filter size={14} className={clsx(activeDropdown === 'source' || selectedSources.length > 0 ? "text-primary" : "text-muted-foreground/50")} />
                Nguồn
                {selectedSources.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {selectedSources.length}
                  </span>
                )}
                <ChevronRight size={14} className={clsx("transition-transform ml-1 opacity-40", activeDropdown === 'source' ? "-rotate-90" : "rotate-90")} />
              </button>
              {renderDropdown('source', sourceOptions, selectedSources, setSelectedSources)}
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setSelectedStatuses([]); setSelectedPositions([]); setSelectedSources([]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-red-300 text-red-500 text-[12px] font-bold hover:bg-red-50 transition-all"
              >
                <X size={13} />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Table Content Area */}
        <div className="hidden md:block flex-1 overflow-x-auto border-t border-border">
          <table className="w-full text-left border-collapse table-fixed min-w-300">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-4 py-3 w-12.5 border-r border-border/40">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary/20"
                    checked={filteredCandidates.length > 0 && selectedCandidates.length === filteredCandidates.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {columnOrder.filter(id => visibleColumns.includes(id)).map(id => (
                  <th key={id} className={COLUMN_DEFS[id].thClass}>{COLUMN_DEFS[id].label}</th>
                ))}
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight w-20 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={2 + visibleColumns.length} className="py-16 text-center text-[13px] text-muted-foreground italic">
                    Không tìm thấy kết quả phù hợp
                  </td>
                </tr>
              ) : filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={clsx(
                    "group transition-colors cursor-pointer",
                    selectedCandidates.includes(candidate.id) ? "bg-primary/5" : "hover:bg-muted/10"
                  )}
                >
                  <td className="px-4 py-4 border-r border-border/40" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary focus:ring-primary/20"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={() => toggleSelect(candidate.id)}
                    />
                  </td>
                  {columnOrder.filter(id => visibleColumns.includes(id)).map(id => (
                    <td key={id} className={COLUMN_DEFS[id].tdClass}>{COLUMN_DEFS[id].renderContent(candidate)}</td>
                  ))}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenEditModal(candidate.id)}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Chỉnh sửa"
                      >
                        <Edit size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="hidden md:flex px-4 py-4 border-t border-border items-center justify-between bg-muted/5">
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium">
            <span>{filteredCandidates.length > 0 ? `1-${filteredCandidates.length}` : '0'}/Tổng {filteredCandidates.length}</span>
            <div className="flex items-center gap-1 ml-2">
              <select className="bg-white border border-border rounded-lg px-2 py-1 focus:outline-none text-[11px] font-bold shadow-sm ring-1 ring-black/5">
                <option>20 / trang</option>
                <option>50 / trang</option>
                <option>100 / trang</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-20" disabled>
              <ChevronLeft size={16} />
              <ChevronLeft size={16} className="-ml-2.5" />
            </button>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-20" disabled>
              <ChevronLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-[12px] font-bold shadow-md shadow-primary/25">1</div>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-20" disabled>
              <ChevronRight size={16} />
            </button>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-20" disabled>
              <ChevronRight size={16} />
              <ChevronRight size={16} className="-ml-2.5" />
            </button>
          </div>
        </div>
      </div>
      ) : (
      /* ── STATS TAB ── */
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0 animate-in fade-in duration-300">
        {/* ── MOBILE STATS TOOLBAR ── */}
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-border shrink-0">
          <button
            onClick={() => navigate('/nhan-su')}
            className="p-2 rounded-xl border border-border bg-white text-muted-foreground shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="flex-1 text-[14px] font-bold text-foreground">Thống kê</span>
          <button
            onClick={openMobileFilter}
            className="relative p-2 rounded-xl border border-border bg-white text-muted-foreground"
          >
            <Filter size={16} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {selectedStatuses.length + selectedPositions.length + selectedSources.length}
              </span>
            )}
          </button>
        </div>

        {/* ── DESKTOP TOOLBAR ── */}
        <div className="hidden md:block p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-wrap" ref={dropdownRef}>
            <button
              onClick={() => navigate('/nhan-su')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground text-[12px] font-bold transition-all bg-white shadow-sm shrink-0"
            >
              <ChevronLeft size={16} />
              Quay lại
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="relative">
              <button
                onClick={() => { setActiveDropdown(activeDropdown === 'status' ? null : 'status'); setFilterSearch(''); }}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold',
                  activeDropdown === 'status' || selectedStatuses.length > 0
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'bg-white border-border hover:bg-muted text-muted-foreground',
                )}
              >
                <TagIcon size={14} className={clsx(activeDropdown === 'status' || selectedStatuses.length > 0 ? 'text-primary' : 'text-muted-foreground/50')} />
                Trạng thái
                {selectedStatuses.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{selectedStatuses.length}</span>
                )}
                <ChevronRight size={14} className={clsx('transition-transform ml-1 opacity-40', activeDropdown === 'status' ? '-rotate-90' : 'rotate-90')} />
              </button>
              {renderDropdown('status', statusOptions, selectedStatuses, setSelectedStatuses)}
            </div>

            <div className="relative">
              <button
                onClick={() => { setActiveDropdown(activeDropdown === 'position' ? null : 'position'); setFilterSearch(''); }}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold',
                  activeDropdown === 'position' || selectedPositions.length > 0
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'bg-white border-border hover:bg-muted text-muted-foreground',
                )}
              >
                <Briefcase size={14} className={clsx(activeDropdown === 'position' || selectedPositions.length > 0 ? 'text-primary' : 'text-muted-foreground/50')} />
                Vị trí
                {selectedPositions.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{selectedPositions.length}</span>
                )}
                <ChevronRight size={14} className={clsx('transition-transform ml-1 opacity-40', activeDropdown === 'position' ? '-rotate-90' : 'rotate-90')} />
              </button>
              {renderDropdown('position', positionOptions, selectedPositions, setSelectedPositions)}
            </div>

            <div className="relative">
              <button
                onClick={() => { setActiveDropdown(activeDropdown === 'source' ? null : 'source'); setFilterSearch(''); }}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold',
                  activeDropdown === 'source' || selectedSources.length > 0
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'bg-white border-border hover:bg-muted text-muted-foreground',
                )}
              >
                <Filter size={14} className={clsx(activeDropdown === 'source' || selectedSources.length > 0 ? 'text-primary' : 'text-muted-foreground/50')} />
                Nguồn
                {selectedSources.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{selectedSources.length}</span>
                )}
                <ChevronRight size={14} className={clsx('transition-transform ml-1 opacity-40', activeDropdown === 'source' ? '-rotate-90' : 'rotate-90')} />
              </button>
              {renderDropdown('source', sourceOptions, selectedSources, setSelectedSources)}
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setSelectedStatuses([]); setSelectedPositions([]); setSelectedSources([]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-red-300 text-red-500 text-[12px] font-bold hover:bg-red-50 transition-all"
              >
                <X size={13} />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Scrollable stats body */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 md:gap-4">
        {/* Summary KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Tổng ứng viên', value: filteredCandidates.length, icon: <Users size={18} />, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Mời phỏng vấn', value: filteredCandidates.filter(c => c.status === 'interviewing').length, icon: <BarChart2 size={18} />, color: 'text-sky-600', bg: 'bg-sky-500/10' },
            { label: 'Nhận việc', value: filteredCandidates.filter(c => c.status === 'hired').length, icon: <TrendingUp size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
            { label: 'Mới', value: filteredCandidates.filter(c => c.status === 'new').length, icon: <TagIcon size={18} />, color: 'text-blue-600', bg: 'bg-blue-500/10' },
            { label: 'Từ chối', value: filteredCandidates.filter(c => c.status === 'rejected').length, icon: <X size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          ].map((item, idx) => (
            <div key={item.label} className={clsx('bg-white rounded-2xl border border-border shadow-sm p-4 md:p-5 flex items-center gap-3 md:gap-4', idx === 0 && 'col-span-2 md:col-span-1')}>
              <div className={clsx('w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0', item.bg, item.color)}>
                {item.icon}
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                <p className={clsx('text-xl md:text-2xl font-bold mt-0.5', item.color)}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* PieChart – Theo trạng thái */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon size={15} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Theo trạng thái</span>
            </div>
            {(() => {
              const COLORS = ['#38bdf8', '#818cf8', '#fb923c', '#f87171'];
              const pieData = [
                { name: 'Mời PV',    value: filteredCandidates.filter(c => c.status === 'interviewing').length },
                { name: 'Nhận việc', value: filteredCandidates.filter(c => c.status === 'hired').length },
                { name: 'Mới',       value: filteredCandidates.filter(c => c.status === 'new').length },
                { name: 'Từ chối',  value: filteredCandidates.filter(c => c.status === 'rejected').length },
              ];
              return (
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="w-full max-w-55 md:w-40 md:max-w-none shrink-0 mx-auto md:mx-0">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} dataKey="value" paddingAngle={3}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                          formatter={(v, n) => [v, n]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 md:flex md:flex-col gap-2 md:gap-2.5 w-full md:flex-1">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                        <span className="text-[11px] text-muted-foreground font-medium flex-1 truncate">{d.name}</span>
                        <span className="text-[11px] font-bold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* BarChart – Theo vị trí */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={15} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Theo vị trí</span>
            </div>
            {(() => {
              const BAR_COLORS = ['#6366f1', '#38bdf8', '#fb923c', '#34d399', '#f87171', '#a78bfa'];
              const posData = Array.from(new Set(filteredCandidates.map(c => c.positionId))).map((pid, i) => ({
                name: pid,
                label: filteredCandidates.find(c => c.positionId === pid)?.position ?? pid,
                count: filteredCandidates.filter(c => c.positionId === pid).length,
                fill: BAR_COLORS[i % BAR_COLORS.length],
              }));
              return (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={posData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                      formatter={(v, _, props) => [v, (props.payload as { label?: string })?.label ?? '']}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {posData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* BarChart – Theo nguồn */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={15} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Theo nguồn</span>
            </div>
            {(() => {
              const BAR_COLORS = ['#6366f1', '#38bdf8', '#fb923c', '#34d399', '#f87171'];
              const srcData = Array.from(new Set(filteredCandidates.map(c => c.source))).map((src, i) => ({
                name: src.length > 12 ? src.slice(0, 12) + '…' : src,
                fullName: src,
                count: filteredCandidates.filter(c => c.source === src).length,
                fill: BAR_COLORS[i % BAR_COLORS.length],
              }));
              return (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={srcData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                      formatter={(v, _, props) => [v, (props.payload as { fullName?: string })?.fullName ?? '']}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {srcData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* Detail tables row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Table – Theo trạng thái */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <TagIcon size={14} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Theo trạng thái</span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted/20">
                  <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase">Trạng thái</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold text-muted-foreground uppercase">Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Object.entries(statusConfig).map(([key, cfg]) => {
                  const count = filteredCandidates.filter(c => c.status === key).length;
                  return (
                    <tr key={key} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border', cfg.classes)}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table – Theo vị trí */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Briefcase size={14} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Theo vị trí</span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted/20">
                  <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase">Vị trí</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold text-muted-foreground uppercase">Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.from(new Set(filteredCandidates.map(c => c.positionId))).map(pid => {
                  const pos = filteredCandidates.find(c => c.positionId === pid);
                  const count = filteredCandidates.filter(c => c.positionId === pid).length;
                  return (
                    <tr key={pid} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground text-[12px]">{pid}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{pos?.position}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table – Theo nguồn */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Filter size={14} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Theo nguồn</span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted/20">
                  <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase">Nguồn</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold text-muted-foreground uppercase">Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.from(new Set(filteredCandidates.map(c => c.source))).map(src => {
                  const count = filteredCandidates.filter(c => c.source === src).length;
                  return (
                    <tr key={src} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border', sourceConfig[src]?.classes ?? 'bg-muted text-muted-foreground border-border')}>
                          {src}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
      )}
      <AddEditCandidateDialog
        isOpen={isAddModalOpen}
        isClosing={isAddModalClosing}
        isEditMode={isEditMode}
        onClose={() => closeAddModal()}
        formState={formState}
        setFormField={setFormField}
        positionOptions={positionOptions}
      />
      <CandidateDetailDialog
        candidateId={selectedCandidateId}
        isClosing={isDetailClosing}
        onClose={() => closeDetailModal()}
        onEdit={handleEditFromDetail}
        onAddDocument={handleAddDocument}
        onOpenInterviewModal={openInterviewModal}
        onOpenInterviewDetail={openInterviewDetail}
        onOpenInterviewEdit={openInterviewEditModal}
        candidatesData={candidatesData}
        sessions={interviewSessions}
      />
      <AddEditInterviewDialog
        isOpen={isInterviewModalOpen}
        isClosing={isInterviewModalClosing}
        isEditMode={isInterviewEditMode}
        onClose={() => closeInterviewModal()}
        candidateId={selectedCandidateId}
        candidatesData={candidatesData}
        ivForm={ivForm}
        setIvField={setIvField}
      />
      <InterviewDetailDialog
        isOpen={isInterviewDetailOpen}
        isClosing={isInterviewDetailClosing}
        onClose={() => closeInterviewDetail()}
        onEditInterview={handleEditInterviewFromDetail}
        onDeleteInterview={handleDeleteInterview}
        candidateId={selectedCandidateId}
        candidatesData={candidatesData}
        sessions={interviewSessions}
        selectedIdx={selectedInterviewIdx}
      />
    </div>
  );
};

export default CandidatesPage;
