import {
  Users,
  Warehouse, Download, Upload, Truck as DeliveryIcon, Box,
  Banknote, Car, CalendarDays, ClipboardList, DollarSign, FileText, MapPin
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
        { icon: Box, title: 'Danh mục hàng hóa', description: 'Quản lý danh sách các mặt hàng.', colorScheme: 'blue', path: '/hang-hoa/danh-muc' },
        { icon: Warehouse, title: 'Danh sách kho', description: 'Quản lý danh sách các kho hàng.', colorScheme: 'teal', path: '/hang-hoa/kho' },
        { icon: Upload, title: 'Xuất hàng', description: 'Quản lý phiếu xuất kho.', colorScheme: 'red', path: '/hang-hoa/xuat-hang' },
        { icon: Download, title: 'Nhập hàng', description: 'Quản lý phiếu nhập kho.', colorScheme: 'green', path: '/hang-hoa/nhap-hang' },
        { icon: DeliveryIcon, title: 'Hàng cần giao', description: 'Danh sách các đơn hàng cần giao.', colorScheme: 'orange', path: '/hang-hoa/giao-hang' },
      ]
    }
  ],
  '/hanh-chinh-nhan-su': [
    {
      section: 'Hành chính nhân sự',
      items: [
        { icon: Users, title: 'Nhân sự', description: 'Quản lý danh sách nhân sự.', colorScheme: 'emerald', path: '/hanh-chinh-nhan-su/nhan-su' },
        { icon: CalendarDays, title: 'Nghỉ phép', description: 'Quản lý đơn nghỉ phép.', colorScheme: 'blue', path: '/hanh-chinh-nhan-su/nghi-phep' },
        { icon: ClipboardList, title: 'Chấm công', description: 'Bảng chấm công nhân viên.', colorScheme: 'purple', path: '/hanh-chinh-nhan-su/cham-cong' },
        { icon: DollarSign, title: 'Bảng lương', description: 'Tính lương và chốt lương.', colorScheme: 'green', path: '/hanh-chinh-nhan-su/luong' },
      ]
    }
  ],
  '/ke-toan': [
    {
      section: 'Kế toán',
      items: [
        { icon: Users, title: 'Danh sách KH', description: 'Quản lý danh sách khách hàng.', colorScheme: 'blue', path: '/ke-toan/khach-hang' },
        { icon: Banknote, title: 'Công nợ KH', description: 'Theo dõi công nợ khách hàng.', colorScheme: 'green', path: '/ke-toan/cong-no' },
        { icon: FileText, title: 'Báo cáo doanh thu', description: 'Báo cáo doanh thu theo ngày.', colorScheme: 'purple', path: '/ke-toan/doanh-thu' },
      ]
    }
  ],
  '/quan-ly-xe': [
    {
      section: 'Quản lý xe',
      items: [
        { icon: Car, title: 'Danh sách xe', description: 'Quản lý thông tin và lịch trình xe.', colorScheme: 'blue', path: '/quan-ly-xe/danh-sach' },
        { icon: MapPin, title: 'Điểm danh tài xế', description: 'Tài xế điểm danh Geolocation.', colorScheme: 'orange', path: '/quan-ly-xe/diem-danh' },
      ]
    }
  ],
};
