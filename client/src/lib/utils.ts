import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function translateRole(role?: string) {
  if (!role) return '---';
  const mapping: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    staff: 'Nhân viên',
    driver: 'Tài xế',
    customer: 'Khách hàng',
  };
  return mapping[role.toLowerCase()] || role;
}
