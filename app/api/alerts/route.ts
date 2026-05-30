import { NextResponse } from 'next/server'

const alerts = [
  { id: '1', server: 'API Gateway', message: 'CPU usage exceeded 90% threshold', severity: 'critical', time: new Date(Date.now() - 120000).toISOString() },
  { id: '2', server: 'Worker Node #1', message: 'Server is offline - no response', severity: 'warning', time: new Date(Date.now() - 300000).toISOString() },
  { id: '3', server: 'Database Server', message: 'Memory usage at 85%', severity: 'info', time: new Date(Date.now() - 900000).toISOString() },
]

export async function GET() {
  return NextResponse.json({ success: true, data: alerts, count: alerts.length, timestamp: new Date().toISOString() })
}
