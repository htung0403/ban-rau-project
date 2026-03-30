import React from 'react';
import { Copyright, Globe, Facebook, Users, MessageCircle, Video, Mail, Phone, ShieldCheck, Building2 } from 'lucide-react';

const CopyrightPage: React.FC = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Copyright size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thông tin Bản quyền</h1>
          <p className="text-muted-foreground text-sm">Quản lý sở hữu trí tuệ và thông tin nhà phát triển</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Developer Info */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <h2 className="text-[13px] font-bold text-primary uppercase tracking-wider">Đơn vị xây dựng & phát triển</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tên công ty / Tổ chức</h3>
                  <p className="text-lg font-bold text-foreground">CÔNG TY TNHH PHÁT TRIỂN CÔNG NGHỆ ABC</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Người đại diện</h3>
                    <p className="text-[14px] font-semibold text-foreground">Nguyễn Văn A</p>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Mã số thuế</h3>
                    <p className="text-[14px] font-semibold text-foreground">0123456789</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Địa chỉ trụ sở</h3>
                  <p className="text-[14px] text-foreground leading-relaxed">
                    Tòa nhà Innovation, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Permissions & Security */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-[13px] font-bold text-primary uppercase tracking-wider">Quyền hạn & bảo mật</h2>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                Phần mềm này cùng toàn bộ mã nguồn, giao diện và cơ sở dữ liệu thuộc quyền sở hữu trí tuệ duy nhất của Công ty ABC. 
                Mọi hành vi sao chép, chỉnh sửa hoặc phân phối lại mà không có sự đồng ý bằng văn bản đều là vi phạm pháp luật.
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-[14px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Phiên bản hiện tại:</span>
                  <span className="font-bold text-foreground">v2.4.0 (Stable)</span>
                </li>
                <li className="flex items-center gap-2 text-[14px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Ngày cấp phép:</span>
                  <span className="font-bold text-foreground">01/01/2024</span>
                </li>
                <li className="flex items-center gap-2 text-[14px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[12px]">Đã đăng ký bản quyền tại Cục Sở hữu trí tuệ</span>
                </li>
              </ul>

              <p className="text-[11px] text-muted-foreground/60 italic border-t border-border pt-4">
                © 2024 - 2026 Bản quyền thuộc về Công ty ABC. Được bảo vệ bởi hệ thống bảo vệ bản quyền số quốc tế.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Social Links */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="text-[13px] font-bold text-foreground uppercase tracking-wider mb-4">Liên kết cộng đồng</h2>
            <div className="space-y-2">
              {[
                { icon: Globe, label: 'Website chính thức' },
                { icon: Facebook, label: 'Fanpage Facebook' },
                { icon: Users, label: 'Group Cộng đồng' },
                { icon: MessageCircle, label: 'Cộng đồng Zalo' },
                { icon: Video, label: 'Kênh TikTok' },
              ].map((item, idx) => (
                <button key={idx} className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </div>

          {/* Technical Support */}
          <ContactCard 
            title="Liên hệ Kỹ thuật"
            name="Trần Văn Kỹ Thuật"
            role="Trưởng phòng Kỹ thuật"
            phone="0901 234 567"
            email="kythuat@company.com"
          />

          {/* Business Contact */}
          <ContactCard 
            title="Liên hệ Kinh doanh"
            name="Lê Thị Kinh Doanh"
            role="Trưởng phòng Kinh doanh"
            phone="0909 876 543"
            email="kinhdoanh@company.com"
          />
        </div>
      </div>
    </div>
  );
};

const ContactCard = ({ title, name, role, phone, email }: { title: string, name: string, role: string, phone: string, email: string }) => (
  <div className="bg-primary rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
    <h2 className="text-[15px] font-bold mb-1">{title}</h2>
    <div className="mb-4">
      <p className="text-[14px] font-bold">{name}</p>
      <p className="text-[12px] text-white/70">{role}</p>
    </div>
    <div className="space-y-0.5 mb-5 text-[12px] text-white/80 font-medium">
      <p>Số điện thoại: {phone}</p>
      <p>Email: {email}</p>
    </div>
    <div className="space-y-2">
      <button className="w-full py-2 bg-white text-primary text-[13px] font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
        <Mail size={16} />
        Email
      </button>
      <button className="w-full py-2 bg-white/20 text-white text-[13px] font-bold rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2 border border-white/20">
        <Phone size={16} />
        Số điện thoại
      </button>
    </div>
  </div>
);

const ChevronRight = ({...props}) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="feather feather-chevron-right"
    {...props}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default CopyrightPage;
