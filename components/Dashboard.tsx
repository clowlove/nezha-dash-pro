'use client'

import { useState, useEffect } from 'react'

interface ServerData {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning'
  cpu: number
  memory: number
  disk: number
  network: { up: number; down: number }
  uptime: string
  region: string
}

const mockServers: ServerData[] = [
  { id: '1', name: 'Web Server #1', status: 'online', cpu: 45, memory: 62, disk: 38, network: { up: 125, down: 450 }, uptime: '45d 12h', region: 'US-East' },
  { id: '2', name: 'Database Server', status: 'online', cpu: 78, memory: 85, disk: 62, network: { up: 89, down: 234 }, uptime: '30d 8h', region: 'EU-West' },
  { id: '3', name: 'API Gateway', status: 'warning', cpu: 92, memory: 78, disk: 45, network: { up: 567, down: 890 }, uptime: '15d 4h', region: 'US-West' },
  { id: '4', name: 'Cache Server', status: 'online', cpu: 23, memory: 45, disk: 28, network: { up: 34, down: 78 }, uptime: '60d 16h', region: 'Asia-East' },
  { id: '5', name: 'Worker Node #1', status: 'offline', cpu: 0, memory: 0, disk: 55, network: { up: 0, down: 0 }, uptime: '0d 0h', region: 'EU-Central' },
  { id: '6', name: 'Worker Node #2', status: 'online', cpu: 56, memory: 68, disk: 42, network: { up: 189, down: 345 }, uptime: '22d 6h', region: 'US-Central' },
]

export function Dashboard() {
  const [servers] = useState<ServerData[]>(mockServers)
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all')

  const filteredServers = filter === 'all' ? servers : servers.filter(s => s.status === filter)
  const onlineCount = servers.filter(s => s.status === 'online').length
  const offlineCount = servers.filter(s => s.status === 'offline').length
  const warningCount = servers.filter(s => s.status === 'warning').length

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Servers" value={servers.length.toString()} icon="🖥️" />
        <StatCard title="Online" value={onlineCount.toString()} icon="✅" />
        <StatCard title="Offline" value={offlineCount.toString()} icon="❌" />
        <StatCard title="Warnings" value={warningCount.toString()} icon="⚠️" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'online', 'offline', 'warning'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServers.map(server => <ServerCard key={server.id} server={server} />)}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <p className="text-gray-400 text-sm mt-1">{title}</p>
    </div>
  )
}

function ServerCard({ server }: { server: ServerData }) {
  const statusColors = {
    online: 'bg-emerald-500/20 text-emerald-400',
    offline: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
  }
  const cpuColor = server.cpu > 80 ? 'bg-red-500' : server.cpu > 60 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{server.name}</h3>
          <p className="text-gray-400 text-sm">{server.region}</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[server.status]}`}>
          {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">CPU</span>
            <span className="text-white">{server.cpu}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div className={`h-2 rounded-full ${cpuColor}`} style={{ width: `${server.cpu}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Memory</span>
            <span className="text-white">{server.memory}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${server.memory}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-2 gap-3">
        <div>
          <p className="text-gray-400 text-xs">Network ↑</p>
          <p className="text-white text-sm">{server.network.up} Mbps</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Network ↓</p>
          <p className="text-white text-sm">{server.network.down} Mbps</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Uptime</p>
          <p className="text-white text-sm">{server.uptime}</p>
        </div>
      </div>
    </div>
  )
}
