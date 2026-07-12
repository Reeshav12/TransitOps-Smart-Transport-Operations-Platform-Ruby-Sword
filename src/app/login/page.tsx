'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, useSession } from 'next-auth/react';
import { Loader2, LockKeyhole, Mail, Truck, ShieldCheck, BarChart3, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '@/lib/validation';

const DEMO_ACCOUNTS = [
  { email: 'fleet@transitops.com', role: 'Fleet Manager', color: 'bg-teal-500' },
  { email: 'driver@transitops.com', role: 'Driver', color: 'bg-emerald-500' },
  { email: 'safety@transitops.com', role: 'Safety Officer', color: 'bg-amber-500' },
  { email: 'finance@transitops.com', role: 'Financial Analyst', color: 'bg-rose-500' },
];

const DEMO_PASSWORD = 'TransitOps@123';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Login — TransitOps';
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      const res = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error('Invalid email or password. Please try again.');
        return;
      }
      toast.success('Welcome back to TransitOps!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', DEMO_PASSWORD);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-800 p-4 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-950">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        {/* Brand panel */}
        <motion.div
          className="hidden flex-col gap-6 text-white lg:flex"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Truck className="size-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TransitOps</h1>
              <p className="text-sm text-white/80">Smart Transport Operations Platform</p>
            </div>
          </div>
          <p className="max-w-md text-lg text-white/90">
            Manage your fleet, drivers, trips, and analytics — all in one place. Built for the Odoo
            Hackathon.
          </p>
          <ul className="space-y-3 text-sm text-white/90">
            <motion.li
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <ShieldCheck className="size-4 text-emerald-300" /> Role-based access control (4 roles)
            </motion.li>
            <motion.li
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Truck className="size-4 text-sky-300" /> Real-time fleet & trip tracking
            </motion.li>
            <motion.li
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Zap className="size-4 text-amber-300" /> Maintenance, fuel & expense logging
            </motion.li>
            <motion.li
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <BarChart3 className="size-4 text-purple-300" /> Analytics with CSV exports
            </motion.li>
          </ul>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
        <Card className="w-full max-w-md mx-auto shadow-2xl border-white/20">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="size-6" />
            </div>
            <CardTitle className="text-2xl">Sign in to TransitOps</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@transitops.com"
                    autoComplete="email"
                    className="pl-9"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-9"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border bg-muted/40 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Demo accounts — click to autofill (password: <code className="font-mono">{DEMO_PASSWORD}</code>):
              </p>
              <div className="grid gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className={`size-2 rounded-full ${acc.color}`} />
                    <span className="font-medium">{acc.email}</span>
                    <span className="ml-auto text-muted-foreground">{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
}
