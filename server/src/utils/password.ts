import bcrypt from 'bcryptjs';

const ROUNDS = 10;

/** bcrypt (chuỗi dạng $2a$/...) */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hashSync(plain, ROUNDS);
}

export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !plain) return false;
  // Chuỗi hash cũ (scrypt salt:key) không phải bcrypt — cần đặt lại mật khẩu
  if (!stored.startsWith('$2')) return false;
  return bcrypt.compareSync(plain, stored);
}
