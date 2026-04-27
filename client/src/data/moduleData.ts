import {
  Users,
  Warehouse, Download, Upload, Truck as DeliveryIcon,
  Banknote, Car, CalendarDays, ClipboardList, ClipboardCheck, DollarSign, FileText, Settings2, MapPin,
  Send, Store, Receipt, History, Heart,
} from 'lucide-react';
import type { ModuleCardProps } from '../components/ui/ModuleCard';

export interface ModuleCardWithPath extends ModuleCardProps {
  path?: string;
}

// Comprehensive module data matching backend routes with navigation paths
export const moduleData: Record<string, { section: string; items: ModuleCardWithPath[] }[]> = {
  '/hang-hoa': [
    {
      section: 'Hàng hóa',
      items: [
        { icon: Warehouse, title: 'Tồn kho thực tế', description: 'Quản lý sản phẩm còn tồn kho chờ giao.', colorScheme: 'teal', path: '/hang-hoa/kho' },
        { icon: Upload, title: 'Xuất hàng', description: 'Quản lý phiếu xuất kho.', colorScheme: 'red', path: '/hang-hoa/xuat-hang' },
        { icon: Download, title: 'Nhập hàng', description: 'Quản lý phiếu nhập kho.', colorScheme: 'green', path: '/hang-hoa/nhap-hang' },
        { icon: DeliveryIcon, title: 'Hàng cần giao', description: 'Danh sách các đơn hàng cần giao.', colorScheme: 'orange', path: '/hang-hoa/giao-hang' },
        { icon: Settings2, title: 'Cài đặt hàng tạp hóa', description: 'Quản lý từ điển hàng tạp hóa.', colorScheme: 'slate', path: '/hang-hoa/cai-dat' },
      ]
    },
    {
      section: 'Hàng Rau',
      items: [
        { icon: Warehouse, title: 'Hàng trên Xe Tải Lớn', description: 'Hàng rau tồn kho chờ giao hàng.', colorScheme: 'teal', path: '/hang-hoa/kho-rau' },
        { icon: Download, title: 'Nhập hàng rau', description: 'Quản lý phiếu nhập kho mặt hàng rau.', colorScheme: 'green', path: '/hang-hoa/nhap-hang-rau' },
        { icon: ClipboardList, title: 'Bảng Hàng Rau', description: 'Bảng xem chi tiết các mặt hàng rau nhập.', colorScheme: 'purple', path: '/hang-hoa/hang-rau' },
        { icon: DeliveryIcon, title: 'Giao hàng rau', description: 'Danh sách các đơn hàng rau cần giao.', colorScheme: 'orange', path: '/hang-hoa/giao-hang-rau' },
        { icon: Settings2, title: 'Cài đặt hàng rau', description: 'Quản lý từ điển hàng vựa rau.', colorScheme: 'slate', path: '/hang-hoa/cai-dat-rau' },
      ]
    }
  ],
  '/chi-phi': [
    {
      section: 'Chi phí',
      items: [
        {
          icon: Receipt,
          title: 'Phiếu chi phí',
          description: 'Tạo, sửa, xóa và duyệt phiếu chi phí.',
          colorScheme: 'amber',
          path: '/chi-phi/phieu',
        },
        {
          icon: History,
          title: 'Lịch sử',
          description: 'Xem phiếu theo thời điểm cập nhật gần nhất.',
          colorScheme: 'slate',
          path: '/chi-phi/lich-su',
        },
      ],
    },
  ],
  '/khach-hang': [
    {
      section: 'Khách hàng Rau',
      items: [
        { icon: Send, title: 'DS người gửi rau', description: 'Danh sách khách hàng gửi rau.', colorScheme: 'green', path: '/khach-hang/nguoi-gui-rau' },
        { icon: Store, title: 'DS người nhận rau (Vựa)', description: 'Danh sách vựa nhận rau.', colorScheme: 'emerald', path: '/khach-hang/vua-rau' },
      ]
    },
    {
      section: 'Khách hàng Tạp hóa',
      items: [
        { icon: Send, title: 'DS người gửi hàng tạp hóa', description: 'Danh sách khách hàng gửi hàng tạp hóa.', colorScheme: 'blue', path: '/khach-hang/nguoi-gui-tap-hoa' },
        { icon: Heart, title: 'DS KH thân thiết', description: 'Quản lý khách hàng thân thiết.', colorScheme: 'amber', path: '/khach-hang/khach-hang-than-thiet' },
        { icon: Store, title: 'DS người nhận hàng tạp hóa', description: 'Danh sách khách hàng nhận hàng tạp hóa.', colorScheme: 'purple', path: '/khach-hang/nguoi-nhan-tap-hoa' },
      ]
    }
  ],
  '/hanh-chinh-nhan-su': [
    {
      section: 'Nhân sự',
      items: [
        { icon: Users, title: 'Nhân sự', description: 'Quản lý danh sách nhân sự.', colorScheme: 'emerald', path: '/hanh-chinh-nhan-su/nhan-su' },
        { icon: ClipboardCheck, title: 'Duyệt đơn', description: 'Duyệt phiếu lương, ứng lương, chấm công bù.', colorScheme: 'cyan', path: '/hanh-chinh-nhan-su/duyet-don' },
        { icon: CalendarDays, title: 'Nghỉ phép', description: 'Quản lý đơn nghỉ phép.', colorScheme: 'blue', path: '/hanh-chinh-nhan-su/nghi-phep' },
      ]
    },
    {
      section: 'Chấm công',
      items: [
        { icon: ClipboardList, title: 'Chấm công', description: 'Bảng chấm công nhân viên.', colorScheme: 'purple', path: '/hanh-chinh-nhan-su/cham-cong' },
        { icon: MapPin, title: 'Cấu hình chấm công', description: 'Các điểm chấm công (GPS, bán kính); thay đổi được lưu ngay.', colorScheme: 'cyan', path: '/hanh-chinh-nhan-su/cau-hinh-cham-cong' },
      ]
    },
    {
      section: 'Tiền lương',
      items: [
        { icon: DollarSign, title: 'Bảng lương', description: 'Tính lương và chốt lương.', colorScheme: 'green', path: '/hanh-chinh-nhan-su/luong' },
        { icon: Banknote, title: 'Ứng lương', description: 'Tạo đơn ứng lương.', colorScheme: 'red', path: '/hanh-chinh-nhan-su/ung-luong' },
        { icon: Settings2, title: 'Cài đặt lương', description: 'Cấu hình mức lương cơ bản.', colorScheme: 'orange', path: '/hanh-chinh-nhan-su/cai-dat-luong' },
      ]
    },
    {
      section: 'Quản trị',
      items: [
        { icon: Settings2, title: 'Phân quyền', description: 'Tạo quyền và cấp quyền theo trang cho nhân sự.', colorScheme: 'slate', path: '/hanh-chinh-nhan-su/phan-quyen' },
      ]
    },
  ],
  '/ke-toan': [
    {
      section: 'Kế toán',
      items: [
        { icon: Users, title: 'Danh sách KH Tạp hóa', description: 'Quản lý khách hàng tạp hóa.', colorScheme: 'blue', path: '/ke-toan/khach-hang-tap-hoa' },
        { icon: Users, title: 'Danh sách KH Rau', description: 'Quản lý khách hàng rau.', colorScheme: 'green', path: '/ke-toan/khach-hang-rau' },
        { icon: Users, title: 'Danh sách Vựa', description: 'Quản lý vựa.', colorScheme: 'emerald', path: '/ke-toan/vua-rau' },
        { icon: Banknote, title: 'Công nợ KH', description: 'Theo dõi công nợ khách hàng.', colorScheme: 'orange', path: '/ke-toan/cong-no' },
        { icon: Banknote, title: 'Thu tiền SG', description: 'Tiền cước thu tại SG khi nhập tạp hóa (đã trả).', colorScheme: 'teal', path: '/ke-toan/thu-tien-sg' },
        { icon: FileText, title: 'Hóa đơn tạp hóa', description: 'Quản lý xuất hóa đơn đơn hàng tạp hóa.', colorScheme: 'cyan', path: '/ke-toan/hoa-don-tap-hoa' },
        { icon: FileText, title: 'Hóa đơn rau', description: 'Quản lý xuất hóa đơn đơn hàng rau.', colorScheme: 'green', path: '/ke-toan/hoa-don-rau' },
        { icon: FileText, title: 'Báo cáo doanh thu', description: 'Báo cáo doanh thu theo ngày.', colorScheme: 'purple', path: '/ke-toan/doanh-thu' },
      ]
    }
  ],
  '/quan-ly-xe': [
    {
      section: 'Quản lý xe',
      items: [
        { icon: Car, title: 'Danh sách xe', description: 'Quản lý thông tin và lịch trình xe.', colorScheme: 'blue', path: '/quan-ly-xe/danh-sach' },
        { icon: Banknote, title: 'Thu tiền hàng', description: 'Quản lý thu nộp tiền giao hàng.', colorScheme: 'green', path: '/quan-ly-xe/thu-tien' },
        // { icon: MapPin, title: 'Điểm danh tài xế', description: 'Tài xế điểm danh Geolocation.', colorScheme: 'orange', path: '/quan-ly-xe/check-in' },
      ]
    }
  ],
};
