'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChefHat,
  Lock,
  Mail,
  Building2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UtensilsCrossed,
  Layers,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';
import { apiPost } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { connectSocket } from '@/lib/socket';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  branchId: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [showBranchField, setShowBranchField] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      branchId: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const payload: any = {
        email: data.email.trim(),
        password: data.password,
      };
      if (data.branchId?.trim()) {
        payload.branchId = data.branchId.trim();
      }

      const result = await apiPost<{ accessToken: string; user: any }>('/auth/login', payload);
      setAuth(result.accessToken, result.user);
      connectSocket(result.accessToken);
      toast.success('Welcome back!', result.user.name);

      const isPlatformSuperAdmin =
        result.user?.roles?.includes('SUPER_ADMIN') ||
        result.user?.tenantId === 'tenant-platform' ||
        result.user?.permissions?.includes('tenants:manage');

      if (isPlatformSuperAdmin) {
        router.push('/super-admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Login failed. Please verify your credentials.';
      toast.error('Login Failed', message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row dark bg-zinc-950 text-foreground">
      {/* Left panel — Brand presentation & value proposition */}
      <div className="lg:w-[45%] bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-border/80 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="space-y-8 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-amber-500 flex items-center justify-center shadow-xl shadow-primary/25">
              <ChefHat className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-white font-black text-2xl tracking-tight leading-none">ROS</p>
              <p className="text-zinc-400 text-xs mt-1 font-medium">Restaurant Operating System</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-bold px-3 py-0.5">
              Next-Gen Hospitality Cloud
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              The unified operating system for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-orange-400">
                modern restaurants
              </span>
              .
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Real-time POS, smart Kitchen Display Systems (KDS), automated table QR ordering, inventory BOM recipes, and multi-branch intelligence.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            {[
              {
                icon: UtensilsCrossed,
                title: 'High-Speed Point of Sale & KDS',
                desc: 'Instant ticket dispatch, split bills, and kitchen station routing',
              },
              {
                icon: Layers,
                title: 'Live Table Management & QR Ordering',
                desc: 'Digital guest ordering with automated table synchronization',
              },
              {
                icon: ShieldCheck,
                title: 'Enterprise Multi-Tenant Security',
                desc: 'Role-based access control, audit vaults, and compliance taxes',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm"
                >
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{f.title}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Self-serve Onboard CTA Card in Sidebar */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 relative">
          <Link
            href="/onboard"
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-amber-500/10 to-primary/10 border border-primary/40 hover:border-primary text-xs font-bold text-primary transition-all group shadow-md shadow-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </div>
              <div>
                <p className="text-foreground font-bold">New Restaurant Owner?</p>
                <p className="text-[11px] text-muted-foreground font-normal">Self-onboard your restaurant in 2 minutes</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Right panel — Centered Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-6">
          {/* Top Banner on Mobile / Right Column */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3 sm:hidden">
            <div className="flex items-center gap-2.5">
              <ChefHat className="w-5 h-5 text-primary" />
              <div className="text-xs font-semibold text-foreground">Need a new restaurant account?</div>
            </div>
            <Link
              href="/onboard"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Onboard <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Form Container */}
          <div className="bg-card/50 border border-border/80 rounded-3xl p-8 shadow-2xl shadow-black/20 backdrop-blur-xl space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign In</h2>
              <p className="text-muted-foreground text-xs">
                Enter your credentials to access your restaurant workspace
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="admin@restaurant.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email?.message}
                  className="h-11 bg-background text-sm"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Password</label>
                </div>
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={errors.password?.message}
                  className="h-11 bg-background text-sm"
                  autoComplete="current-password"
                />
              </div>

              {/* Optional Branch ID */}
              {showBranchField ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Branch ID (Optional)</label>
                    <button
                      type="button"
                      onClick={() => setShowBranchField(false)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Hide
                    </button>
                  </div>
                  <Input
                    {...register('branchId')}
                    placeholder="e.g. branch-main"
                    leftIcon={<Building2 className="w-4 h-4" />}
                    className="h-11 bg-background text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank to automatically connect to your primary branch.
                  </p>
                </div>
              ) : (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowBranchField(true)}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium"
                  >
                    <Building2 className="w-3 h-3" /> Specify specific branch outlet
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 text-sm shadow-md shadow-primary/20 transition-all mt-2"
                loading={isSubmitting}
              >
                Sign In to Workspace
              </Button>

              {/* Onboard Footer Link */}
              <div className="pt-4 text-center text-xs text-muted-foreground border-t border-border/50 space-y-2">
                <p>
                  Don&apos;t have a restaurant on ROS yet?{' '}
                  <Link
                    href="/onboard"
                    className="font-bold text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1 transition-colors"
                  >
                    Onboard your restaurant <ArrowRight className="w-3 h-3" />
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
