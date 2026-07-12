'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, Clock, Wrench, CheckCircle2, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DbNotification {
  id: string;
  type: string; // warning | info | danger
  title: string;
  description: string;
  action: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const router = useRouter();

  const { data: notifications = [], refetch } = useQuery<DbNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark read');
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark all read');
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (href: string | null, id: string, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate(id);
    }
    if (href) {
      router.push(href);
    }
  };

  const getIcon = (type: string, href: string | null) => {
    if (type === 'warning' || type === 'danger') return AlertTriangle;
    if (href?.includes('maintenance')) return Wrench;
    if (href?.includes('trips')) return Clock;
    return Bell;
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
              )}
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsReadMutation.mutate();
                  }}
                  disabled={markAllAsReadMutation.isPending}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 className="size-8 text-emerald-600 animate-bounce" />
              <p className="text-sm font-medium">All clear!</p>
              <p className="text-xs text-muted-foreground">No active alerts</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.map((notif) => {
                const Icon = getIcon(notif.type, notif.href);
                const colorClasses = {
                  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
                }[notif.type] || 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';

                return (
                  <DropdownMenuItem
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 transition-opacity duration-200 ${notif.isRead ? 'opacity-50' : 'opacity-100'}`}
                    onSelect={() => handleNotificationClick(notif.href, notif.id, notif.isRead)}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${colorClasses}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-tight">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.description}</p>
                      {notif.action && (
                        <p className="text-xs font-medium text-primary mt-1">{notif.action} →</p>
                      )}
                    </div>
                    {!notif.isRead && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              markAsReadMutation.mutate(notif.id);
                            }}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark as read</TooltipContent>
                      </Tooltip>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
