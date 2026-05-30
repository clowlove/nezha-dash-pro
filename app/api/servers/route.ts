import { NextResponse } from 'next/server'

const servers = [
  { id: '1', name: 'Web Server #1', status: 'online', cpu: 45, memory: 62, disk: 38, network: { up: 125, down: 450 }, uptime: '45d 12h', region: 'US-East' },
  { id: '2', name: 'Database Server', status: 'online', cpu: 78, memory: 85, disk: 62, network: { up: 89, down: 234 }, uptime: '30d 8h', region: 'EU-West' },
  { id: '3', name: 'API Gateway', status: 'warning', cpu: 92, memory: 78, disk: 45, network: { up: 567, down: 890 }, uptime: '15d 4h', region: 'US-West' },
  { id: '4', name: 'Cache Server', status: 'online', cpu: 23, memory: 45, disk: 28, network: { up: 34, down: 78 }, uptime: '60d 16h', region: 'Asia-East' },
  { id: '5', name: 'Worker Node #1', status: 'offline', cpu: 0, memory: 0, disk: 55, network: { up: 0, down: 0 }, uptime: '0d 0h', region: 'EU-Central' },
  { id: '6', name: 'Worker Node #2', status: 'online', cpu: 56, memory: 68, disk: 42, network: { up: 189, down: 345 }, uptime: '22d 6h', region: 'US-Central' },
]

export async function GET() {
  return NextResponse.json({ success: true, data: servers, timestamp: new Date().toISOString() })
}
