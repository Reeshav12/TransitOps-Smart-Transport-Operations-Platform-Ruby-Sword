'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useCsvExport() {
  const [exporting, setExporting] = useState(false);

  const exportCsv = async (type: string, label?: string) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/export?type=${type}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transitops-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${label ?? type} exported successfully`);
    } catch {
      toast.error(`Failed to export ${label ?? type}`);
    } finally {
      setExporting(false);
    }
  };

  return { exportCsv, exporting };
}
