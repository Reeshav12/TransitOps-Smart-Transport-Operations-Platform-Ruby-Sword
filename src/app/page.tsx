'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Truck } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Truck className="size-8" />
      </div>
      <p className="text-sm text-muted-foreground">Loading TransitOps…</p>
    </div>
  );
}
