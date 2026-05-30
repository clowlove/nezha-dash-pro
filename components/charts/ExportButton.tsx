'use client';

import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ExportFormat = 'png' | 'svg' | 'csv';

interface ExportButtonProps {
  data?: Record<string, unknown>[];
  chartRef?: React.RefObject<HTMLDivElement | null>;
  filename?: string;
  formats?: ExportFormat[];
  className?: string;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportButton({
  data,
  chartRef,
  filename = 'chart-export',
  formats = ['png', 'svg', 'csv'],
  className,
}: ExportButtonProps) {
  const isExporting = useRef(false);

  const exportPNG = useCallback(async () => {
    if (!chartRef?.current || isExporting.current) return;
    isExporting.current = true;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
        scale: 2,
      });
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${filename}.png`);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      isExporting.current = false;
    }
  }, [chartRef, filename]);

  const exportSVG = useCallback(() => {
    if (!chartRef?.current) return;
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${filename}.svg`);
  }, [chartRef, filename]);

  const exportCSV = useCallback(() => {
    if (!data || data.length === 0) return;
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  }, [data, filename]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      switch (format) {
        case 'png':
          exportPNG();
          break;
        case 'svg':
          exportSVG();
          break;
        case 'csv':
          exportCSV();
          break;
      }
    },
    [exportPNG, exportSVG, exportCSV],
  );

  const icons: Record<ExportFormat, React.ReactNode> = {
    png: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    svg: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    csv: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };

  const labels: Record<ExportFormat, string> = {
    png: 'PNG',
    svg: 'SVG',
    csv: 'CSV',
  };

  if (formats.length === 1) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('h-7 px-2 text-xs gap-1', className)}
        onClick={() => handleExport(formats[0])}
      >
        {icons[formats[0]]}
        {labels[formats[0]]}
      </Button>
    );
  }

  return (
    <div className={cn('flex gap-1', className)}>
      {formats.map((format) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => handleExport(format)}
        >
          {icons[format]}
          {labels[format]}
        </Button>
      ))}
    </div>
  );
}
