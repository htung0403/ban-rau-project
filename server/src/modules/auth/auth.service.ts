import jwt from 'jsonwebtoken';
import { supabaseService } from '../../config/supabase';
import { env } from '../../config/env';
import { Role } from '../../types';
import { buildPhoneCandidates } from '../../utils/phoneAuth';
import { hashPassword, verifyPassword } from '../../utils/password';

const JWT_EXPIRES: jwt.SignOptions['expiresIn'] = '7d';

export class AuthService {
  static signAccessToken(userId: string): string {
    return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  static async login(phone: string, password: string) {
    const phoneCandidates = buildPhoneCandidates(phone);
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, password_hash, role, full_name, avatar_url, email, personal_email')
      .in('phone', phoneCandidates)
      .limit(1)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.id) {
      throw new Error('Không tìm thấy tài khoản với số điện thoại này');
    }

    if (!profile.password_hash) {
      throw new Error('Tài khoản chưa có mật khẩu đăng nhập. Liên hệ quản trị để thiết lập.');
    }

    const ok = await verifyPassword(password, profile.password_hash as string);
    if (!ok) {
      throw new Error('Sai mật khẩu');
    }

    const access_token = this.signAccessToken(profile.id);
    const displayEmail =
      (profile.email as string | null) || (profile.personal_email as string | null) || '';

    return {
      user: {
        id: profile.id,
        email: displayEmail,
        role: profile.role as Role,
        full_name: profile.full_name as string,
        avatar_url: (profile as any).avatar_url,
      },
      session: { access_token },
    };
  }

  static async logout(_token: string) {
    // JWT stateless — client xóa token là đủ
  }

  static async updatePassword(userId: string, newPassword: string) {
    const password_hash = await hashPassword(newPassword);
    const { error } = await supabaseService.from('profiles').update({ password_hash }).eq('id', userId);
    if (error) throw error;
  }

  static async updateProfile(
    userId: string,
    payload: {
      full_name?: string;
      avatar_url?: string;
      phone?: string | null;
      date_of_birth?: string | null;
      gender?: 'male' | 'female' | 'other' | null;
      citizen_id?: string | null;
      job_title?: string | null;
      department?: string | null;
      personal_email?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_phone?: string | null;
      emergency_contact_relationship?: string | null;
      city?: string | null;
      district?: string | null;
      ward?: string | null;
      address_line?: string | null;
      temporary_address?: string | null;
    }
  ) {
    const dbPayload: Record<string, unknown> = { ...payload };
    if (payload.personal_email !== undefined) {
      dbPayload.email = (payload.personal_email || '').trim() || null;
    }

    const { error } = await supabaseService.from('profiles').update(dbPayload).eq('id', userId);

    if (error) throw error;
    return { success: true };
  }
}
