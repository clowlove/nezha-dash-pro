// NezhaDash Pro - Billing Export API
// GET CSV/JSON export with date range filter

import { NextRequest, NextResponse } from 'next/server';
import { getAllServerSummaries } from '@/lib/billing/traffic-tracker';
import { getConfig } from '@/lib/billing/cost-calculator';
import {
  generateMonthlyReport, generateQuarterlyReport,
  exportReportJSON, exportReportCSV, exportSummariesCSV,
} from '@/lib/billing/report-generator';
import type { Currency } from '@/lib/billing/types';

/**
 * GET /api/billing/export
 * Query params:
 *   format: csv | json (default: csv)
 *   type: traffic | report (default: traffic)
 *   startTime: Unix ms (for traffic export)
 *   endTime: Unix ms (for traffic export)
 *   year: number (for report export)
 *   month: number 1-12 (for monthly report)
 *   quarter: number 1-4 (for quarterly report)
 *   currency: USD | CNY | EUR
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'csv';
    const type = searchParams.get('type') ?? 'traffic';
    const currency = (searchParams.get('currency') as Currency) ?? getConfig().currency;

    if (type === 'traffic') {
      const startTime = Number(searchParams.get('startTime') ?? Date.now() - 86400000 * 30);
      const endTime = Number(searchParams.get('endTime') ?? Date.now());
      const summaries = getAllServerSummaries(startTime, endTime);
      const content = exportSummariesCSV(summaries);
      const filename = `traffic-${new Date(startTime).toISOString().slice(0, 10)}_${new Date(endTime).toISOString().slice(0, 10)}.csv`;

      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === 'report') {
      const year = Number(searchParams.get('year'));
      const month = Number(searchParams.get('month'));
      const quarter = Number(searchParams.get('quarter'));

      let report;
      let filenameBase;

      if (quarter && year) {
        report = generateQuarterlyReport(year, quarter, currency);
        filenameBase = `billing-Q${quarter}-${year}`;
      } else if (year && month) {
        report = generateMonthlyReport(year, month, currency);
        filenameBase = `billing-${year}-${String(month).padStart(2, '0')}`;
      } else {
        return NextResponse.json(
          { error: 'year + month or year + quarter required' },
          { status: 400 },
        );
      }

      if (format === 'json') {
        const content = exportReportJSON(report);
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filenameBase}.json"`,
          },
        });
      }

      // CSV default
      const content = exportReportCSV(report);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 });
  } catch (error) {
    console.error('Billing export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: String(error) },
      { status: 500 },
    );
  }
}
