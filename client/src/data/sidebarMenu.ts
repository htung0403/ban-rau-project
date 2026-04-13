import {
  Home,
  Box,
  Contact,
  Users,
  Wallet,
  Car,
  Copyright
} from 'lucide-react';
import React from 'react';

export type SidebarItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

export const sidebarMenu: SidebarItem[] = [
  { icon: Home, label: 'Trang chủ', path: '/' },
  { icon: Box, label: 'Hàng hóa', path: '/hang-hoa' },
  { icon: Contact, label: 'Khách hàng', path: '/khach-hang' },
  { icon: Users, label: 'Hành chính nhân sự', path: '/hanh-chinh-nhan-su' },
  { icon: Wallet, label: 'Kế toán', path: '/ke-toan' },
  { icon: Car, label: 'Quản lý xe', path: '/quan-ly-xe' },
];

// Additional items seen on the dashboard
export const extraMenuItems: SidebarItem[] = [
  { icon: Copyright, label: 'Thông tin bản quyền', path: '/ban-quyen' }
];
