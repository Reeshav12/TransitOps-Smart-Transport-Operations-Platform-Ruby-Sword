'use client';

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ShortcutItem {
  keys: string;
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: '⌘ K', description: 'Open command palette', category: 'Navigation' },
  { keys: '?', description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: 'G D', description: 'Go to Dashboard', category: 'Navigation' },
  { keys: 'G V', description: 'Go to Vehicles', category: 'Navigation' },
  { keys: 'G R', description: 'Go to Drivers', category: 'Navigation' },
  { keys: 'G T', description: 'Go to Trips', category: 'Navigation' },
  { keys: 'G M', description: 'Go to Maintenance', category: 'Navigation' },
  { keys: 'G F', description: 'Go to Fuel & Expenses', category: 'Navigation' },
  { keys: 'G E', description: 'Go to Reports', category: 'Navigation' },
  { keys: 'Esc', description: 'Close dialog / Cancel action', category: 'General' },
  { keys: '⌘ /', description: 'Focus search (on list pages)', category: 'General' },
];

const CATEGORIES = ['Navigation', 'General'];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger on '?' key when not typing in an input
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate TransitOps faster. Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">?</kbd> anytime to open this dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h4>
              <div className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.category === category).map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> The command palette (⌘K) also supports fuzzy search across all pages and quick actions.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}
