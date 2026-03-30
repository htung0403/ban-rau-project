import { supabaseAnon, supabaseService } from '../../config/supabase';
import { Role } from '../../types';

export class AuthService {
  static async login(email: string, password: string) {
    console.log(`DEBUG: Target login: ${email}`);
    
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
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
      .select('role, full_name')
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
      },
      session: data.session,
    };
  }

  static async logout(token: string) {
    // Note: client side usually handles token deletion, 
    // but we can call supabase signout if needed.
    const { error } = await supabaseAnon.auth.signOut();
    if (error) throw error;
  }

  static async updatePassword(userId: string, newPassword: string) {
    // Manager or User themselves can update password via service role for administrative ease
    const { error } = await supabaseService.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) throw error;
  }
}
