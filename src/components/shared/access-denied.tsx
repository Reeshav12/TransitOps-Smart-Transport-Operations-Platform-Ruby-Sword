'use client';

import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTransition } from '@/components/shared/page-transition';

export function AccessDenied() {
  const router = useRouter();

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-rose-200/60 shadow-lg dark:border-rose-900/40">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <ShieldAlert className="size-6 animate-pulse" />
            </div>
            <CardTitle className="mt-4 text-xl font-bold tracking-tight text-foreground">
              Access Denied
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-muted-foreground">
              Your role does not have the required permissions to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs text-muted-foreground border-t border-b border-border/40 py-4 my-2">
            If you believe this is an error, please contact your systems administrator or fleet operations coordinator.
          </CardContent>
          <CardFooter className="flex justify-center pt-4">
            <Button 
              onClick={() => router.push('/dashboard')}
              className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
}
