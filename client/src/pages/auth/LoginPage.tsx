import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { Truck, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleQuickLogin = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    // Small timeout to allow the UI to reflect changes before submitting
    setTimeout(() => {
      handleSubmit(onSubmit)();
    }, 100);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      await login(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message || err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-md px-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl shadow-blue-500/30 mb-4">
            <Truck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Logistics ERP</h1>
          <p className="text-blue-200/60 text-[14px] mt-1 font-medium">Hệ thống quản lý vận chuyển hàng hóa</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.08] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Server Error */}
            {serverError && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-[13px] font-medium">
                <AlertCircle size={18} className="shrink-0" />
                {serverError}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-blue-100/80">Email</label>
              <input
                type="email"
                placeholder="admin@vuarau.com"
                autoComplete="email"
                {...register('email')}
                className={clsx(
                  'w-full px-4 py-3 bg-white/[0.06] border rounded-xl text-white text-[14px] placeholder:text-white/20 focus:outline-none focus:ring-2 focus:bg-white/[0.08] transition-all',
                  errors.email ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:ring-blue-500/30',
                )}
              />
              {errors.email && (
                <p className="text-red-400 text-[12px] font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-blue-100/80">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  {...register('password')}
                  className={clsx(
                    'w-full px-4 py-3 pr-12 bg-white/[0.06] border rounded-xl text-white text-[14px] placeholder:text-white/20 focus:outline-none focus:ring-2 focus:bg-white/[0.08] transition-all',
                    errors.password ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:ring-blue-500/30',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-[12px] font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-all duration-300',
                isSubmitting
                  ? 'bg-blue-600/50 text-white/60 cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.98]',
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          {/* Quick Test Login */}
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <p className="text-[10px] font-bold text-blue-100/30 uppercase tracking-[0.2em] whitespace-nowrap">Đăng nhập nhanh cho Test</p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Admin', email: 'admin_demo@vuarau.com', role: 'Quản trị' },
                { label: 'Kho', email: 'kho1@vuarau.com', role: 'Quản lý kho' },
                { label: 'Tài xế', email: 'xe1@vuarau.com', role: 'Tài xế' },
                { label: 'Khách', email: 'khach1@vuarau.com', role: 'Khách hàng' },
              ].map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email, 'password123')}
                  className="group relative flex flex-col items-center gap-1 p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.98]"
                >
                  <span className="text-[13px] font-bold text-blue-100/70 group-hover:text-blue-300 transition-colors">{account.label}</span>
                  <span className="text-[9px] font-medium text-blue-100/30 group-hover:text-blue-100/50 transition-colors uppercase tracking-wider">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-[12px] mt-6 font-medium">
          Logistics ERP v1.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
