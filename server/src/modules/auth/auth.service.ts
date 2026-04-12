import { supabaseAnon, supabaseService } from '../../config/supabase';
import { Role } from '../../types';

export class AuthService {
  private static buildPhoneCandidates(rawInput: string): string[] {
    const raw = rawInput.trim();
    const digits = raw.replace(/\D/g, '');
    const candidates = new Set<string>([raw, digits]);

    if (digits.startsWith('84') && digits.length >= 10) {
      candidates.add(`+${digits}`);
      candidates.add(`0${digits.slice(2)}`);
    } else if (digits.startsWith('0') && digits.length >= 10) {
      candidates.add(`84${digits.slice(1)}`);
      candidates.add(`+84${digits.slice(1)}`);
    }

    return Array.from(candidates).filter(Boolean);
  }

  static async login(phone: string, password: string) {
    const phoneCandidates = this.buildPhoneCandidates(phone);
    const { data: phoneProfile, error: phoneProfileError } = await supabaseService
      .from('profiles')
      .select('id, phone')
      .in('phone', phoneCandidates)
      .limit(1)
      .maybeSingle();

    if (phoneProfileError) throw phoneProfileError;
    if (!phoneProfile?.id) {
      throw new Error('Không tìm thấy tài khoản với số điện thoại này');
    }

    const { data: userData, error: userError } = await (supabaseService.auth as any).admin.getUserById(phoneProfile.id);
    if (userError) throw userError;

    const resolvedEmail = userData?.user?.email;
    if (!resolvedEmail) {
      throw new Error('Tài khoản chưa có email đăng nhập hợp lệ');
    }

    const email = resolvedEmail.toLowerCase();

    console.log(`DEBUG: Target login: ${email}`);
    
    const { data, error } = await (supabaseAnon.auth as any).signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('DEBUG: Auth step error object:', error);
      throw error;
    }

    console.log('DEBUG: Auth successful, fetching profile details...');
    
    // Fetch profile to return role
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', data.user?.id)
      .single();

    if (profileError) {
      console.error('DEBUG: Profile query error:', profileError);
      throw new Error(`Profile query failed: ${profileError.message}`);
    }

    return {
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: profile?.role as Role,
        full_name: profile?.full_name,
        avatar_url: (profile as any)?.avatar_url,
      },
      session: data.session,
    };
  }

  static async logout(token: string) {
    // Note: client side usually handles token deletion, 
    // but we can call supabase signout if needed.
    const { error } = await (supabaseAnon.auth as any).signOut();
    if (error) throw error;
  }

  static async updatePassword(userId: string, newPassword: string) {
    // Manager or User themselves can update password via service role for administrative ease
    const { error } = await (supabaseService.auth as any).admin.updateUserById(userId, {
      password: newPassword,
    });
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
    const { error } = await supabaseService
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  }
}
