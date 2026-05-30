// NezhaDash Pro - Billing API
// GET traffic data, GET cost summary, POST configure rates, GET monthly report

import { NextRequest, NextResponse } from 'next/server';
import {
  getTrafficRecords, getAllServerSummaries,
  getHourlyAggregates, getActiveAlerts, acknowledgeAlert,
} from '@/lib/billing/traffic-tracker';
import {
  getConfig, updateConfig, setRate, setCurrency,
  calculateServerBreakdown, estimateMonthlyCost,
  formatCost, getMultiCurrencyCost,
} from '@/lib/billing/cost-calculator';
import {
  generateMonthlyReport, generateQuarterlyReport,
  listReports, getReport,
} from '@/lib/billing/report-generator';
import type { Currency, CostRate } from '@/lib/billing/types';

/**
 * GET /api/billing
 * Query params:
 *   action: traffic | cost | report | alerts | config | hourly
 *   serverId: number
 *   startTime: Unix ms
 *   endTime: Unix ms
 *   year: number
 *   month: number (1-indexed)
 *   quarter: number (1-4)
 *   reportId: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') ?? 'cost';

    switch (action) {
      case 'traffic': {
        const serverId = Number(searchParams.get('serverId'));
        const startTime = Number(searchParams.get('startTime') ?? Date.now() - 86400000 * 30);
        const endTime = Number(searchParams.get('endTime') ?? Date.now());

        if (isNaN(serverId)) {
          return NextResponse.json({ error: 'serverId required' }, { status: 400 });
        }

        const records = getTrafficRecords(serverId, startTime, endTime);
        return NextResponse.json({ records, count: records.length });
      }

      case 'hourly': {
        const serverId = Number(searchParams.get('serverId'));
        const startTime = Number(searchParams.get('startTime') ?? Date.now() - 86400000 * 7);
        const endTime = Number(searchParams.get('endTime') ?? Date.now());

        if (isNaN(serverId)) {
          return NextResponse.json({ error: 'serverId required' }, { status: 400 });
        }

        const data = getHourlyAggregates(serverId, startTime, endTime);
        return NextResponse.json({ data, count: data.length });
      }

      case 'cost': {
        const now = new Date();
        const year = Number(searchParams.get('year') ?? now.getFullYear());
        const month = Number(searchParams.get('month') ?? now.getMonth() + 1);
        const monthStart = new Date(year, month - 1, 1).getTime();
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();
        const currency = searchParams.get('currency') as Currency | undefined;

        const summaries = getAllServerSummaries(monthStart, monthEnd);
        const breakdown = calculateServerBreakdown(summaries, currency);
        const daysElapsed = now.getDate();
        const estimate = estimateMonthlyCost(summaries, daysElapsed, currency);
        const config = getConfig();

        // Multi-currency totals
        const totalUpload = summaries.reduce((s, sum) => s + sum.totalUpload, 0);
        const totalDownload = summaries.reduce((s, sum) => s + sum.totalDownload, 0);
        const multiCurrency = getMultiCurrencyCost(totalUpload, totalDownload);

        return NextResponse.json({
          config: { currency: config.currency, billingCycleStart: config.billingCycleStart },
          month: { year, month },
          breakdown,
          estimate,
          multiCurrency,
          totalServers: breakdown.length,
        });
      }

      case 'report': {
        const year = Number(searchParams.get('year'));
        const month = Number(searchParams.get('month'));
        const quarter = Number(searchParams.get('quarter'));
        const reportId = searchParams.get('reportId');
        const currency = searchParams.get('currency') as Currency | undefined;

        if (reportId) {
          const report = getReport(reportId);
          if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
          return NextResponse.json({ report });
        }

        if (quarter) {
          if (!year) return NextResponse.json({ error: 'year required' }, { status: 400 });
          const report = generateQuarterlyReport(year, quarter, currency);
          return NextResponse.json({ report });
        }

        if (year && month) {
          const report = generateMonthlyReport(year, month, currency);
          return NextResponse.json({ report });
        }

        // List recent reports
        const reports = listReports();
        return NextResponse.json({ reports, count: reports.length });
      }

      case 'alerts': {
        const alerts = getActiveAlerts();
        return NextResponse.json({ alerts, count: alerts.length });
      }

      case 'config': {
        const config = getConfig();
        return NextResponse.json({ config });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Billing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/billing
 * Body: { action: 'config' | 'rate' | 'acknowledge', ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'config': {
        const config = updateConfig(body.config);
        return NextResponse.json({ config, message: 'Config updated' });
      }

      case 'rate': {
        const { currency, rate } = body as { currency: Currency; rate: CostRate };
        if (!currency || !rate) {
          return NextResponse.json({ error: 'currency and rate required' }, { status: 400 });
        }
        setRate(currency, rate);
        return NextResponse.json({ message: `Rate updated for ${currency}`, config: getConfig() });
      }

      case 'currency': {
        const { currency } = body as { currency: Currency };
        if (!currency) {
          return NextResponse.json({ error: 'currency required' }, { status: 400 });
        }
        setCurrency(currency);
        return NextResponse.json({ message: `Currency set to ${currency}`, config: getConfig() });
      }

      case 'acknowledge': {
        const { alertId } = body as { alertId: string };
        if (!alertId) {
          return NextResponse.json({ error: 'alertId required' }, { status: 400 });
        }
        const success = acknowledgeAlert(alertId);
        return NextResponse.json({
          success,
          message: success ? 'Alert acknowledged' : 'Alert not found',
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Billing POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}
