import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/80 border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">NezhaDash Pro</h1>
                <p className="text-gray-400 text-sm">AI-Powered VPS Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://github.com/clowlove/nezha-dash-pro" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                GitHub
              </a>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                + Add Server
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />

        {/* Recent Alerts */}
        <div className="mt-8 bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Alerts</h2>
          <div className="space-y-3">
            <AlertItem message="API Gateway CPU usage exceeded 90% threshold" time="2 minutes ago" severity="critical" />
            <AlertItem message="Worker Node #1 is offline - no response for 5 minutes" time="5 minutes ago" severity="warning" />
            <AlertItem message="Database Server memory usage at 85%" time="15 minutes ago" severity="info" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">© 2026 NezhaDash Pro. All rights reserved.</p>
            <div className="flex space-x-4">
              <a href="https://github.com/clowlove/nezha-dash-pro" className="text-gray-400 hover:text-white text-sm">GitHub</a>
              <a href="/api/health" className="text-gray-400 hover:text-white text-sm">API Health</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function AlertItem({ message, time, severity }: { message: string; time: string; severity: string }) {
  const severityColors: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-500/5',
    warning: 'border-l-amber-500 bg-amber-500/5',
    info: 'border-l-blue-500 bg-blue-500/5',
  }
  return (
    <div className={`border-l-4 ${severityColors[severity] || severityColors.info} p-3 rounded-r-lg`}>
      <p className="text-white text-sm">{message}</p>
      <p className="text-gray-400 text-xs mt-1">{time}</p>
    </div>
  )
}
