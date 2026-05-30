'use client';

import React, { useMemo } from 'react';
import { useServerData } from '@/app/context/server-data-context';
import { formatNezhaInfo } from '@/lib/utils';
import { MetricChart, GaugeChart, HeatmapChart, NetworkTopology, ExportButton, type SeriesConfig, type TopologyNode, type TopologyEdge } from '@/components/charts';
import ComparisonChart, { type ServerSeries } from '@/components/charts/ComparisonChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Generate mock heatmap data for demo (365 days of uptime)
function generateHeatmapData(online: boolean): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    data.push({
      date: `${year}-${month}-${day}`,
      value: online ? Math.floor(Math.random() * 100) : Math.floor(Math.random() * 20),
    });
  }
  return data;
}

// Generate mock trend data from history snapshots
function generateTrendData(history: Array<{ timestamp: number; data: any }>, serverId: number) {
  return history
    .slice()
    .reverse()
    .map((snap) => {
      const server = snap.data.servers?.find((s: any) => s.id === serverId);
      if (!server) return null;
      const info = formatNezhaInfo(server);
      return {
        time: new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: snap.timestamp,
        CPU: Math.round(info.cpu * 100) / 100,
        Memory: Math.round(info.mem * 100) / 100,
        Disk: Math.round(info.disk * 100) / 100,
      };
    })
    .filter(Boolean);
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function AnalyticsPage() {
  const { data, history, isLoading } = useServerData();

  const servers = useMemo(() => {
    if (!data?.servers) return [];
    return data.servers.map((s) => formatNezhaInfo(s));
  }, [data]);

  // Pick first server for gauge display
  const primaryServer = servers[0];

  // Build trend data for first 4 servers
  const trendSeries: SeriesConfig[] = [
    { dataKey: 'CPU', label: 'CPU %', color: '#3b82f6' },
    { dataKey: 'Memory', label: 'Memory %', color: '#22c55e' },
    { dataKey: 'Disk', label: 'Disk %', color: '#f59e0b' },
  ];

  const trendData = useMemo(() => {
    if (!data?.servers?.length || !history.length) return [];
    return generateTrendData(history, data.servers[0].id);
  }, [data, history]);

  // Build comparison data
  const comparisonServers: ServerSeries[] = useMemo(() => {
    if (!data?.servers) return [];
    return data.servers.slice(0, 6).map((server, i) => {
      const points = history
        .slice()
        .reverse()
        .map((snap) => {
          const s = snap.data.servers?.find((srv: any) => srv.id === server.id);
          if (!s) return null;
          return { timestamp: snap.timestamp, value: formatNezhaInfo(s).cpu };
        })
        .filter((p): p is { timestamp: number; value: number } => p !== null);

      return {
        serverId: String(server.id),
        serverName: server.name,
        color: COLORS[i % COLORS.length],
        data: points,
      };
    });
  }, [data, history]);

  // Build topology data
  const topologyData = useMemo(() => {
    if (!data?.servers) return { nodes: [], edges: [] };

    const nodes: TopologyNode[] = data.servers.slice(0, 8).map((s) => {
      const info = formatNezhaInfo(s);
      return {
        id: String(s.id),
        label: s.name,
        status: (info.online ? (info.cpu > 85 ? 'warning' : 'online') : 'offline') as TopologyNode['status'],
        region: info.country_code || undefined,
        cpu: info.cpu,
      };
    });

    // Generate edges — connect servers in a ring
    const edges: TopologyEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const next = (i + 1) % nodes.length;
      edges.push({
        from: nodes[i].id,
        to: nodes[next].id,
        latency: Math.floor(Math.random() * 50) + 1,
        traffic: nodes[i].status === 'online' ? Math.random() * 0.8 : 0,
      });
    }
    // Add a cross-connection
    if (nodes.length > 3) {
      edges.push({
        from: nodes[0].id,
        to: nodes[Math.floor(nodes.length / 2)].id,
        bandwidth: 1000,
        traffic: 0.3,
      });
    }

    return { nodes, edges };
  }, [data]);

  // Heatmap data
  const heatmapData = useMemo(() => generateHeatmapData(!!primaryServer?.online), [primaryServer]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-xl">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Server metrics overview, trends, and comparisons
          </p>
        </div>
        {trendData.length > 0 && (
          <ExportButton
            data={trendData as Record<string, unknown>[]}
            filename="analytics-data"
            formats={['csv', 'png']}
          />
        )}
      </div>

      {/* Overview Gauges */}
      {primaryServer && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Server Overview — {primaryServer.name || 'Primary'}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <GaugeChart
              title="CPU"
              value={primaryServer.cpu}
              unit="%"
              size={120}
            />
            <GaugeChart
              title="Memory"
              value={primaryServer.mem}
              unit="%"
              size={120}
            />
            <GaugeChart
              title="Disk"
              value={primaryServer.disk}
              unit="%"
              size={120}
            />
            <GaugeChart
              title="Swap"
              value={primaryServer.swap}
              unit="%"
              size={120}
            />
            <GaugeChart
              title="GPU"
              value={primaryServer.gpu}
              unit="%"
              size={120}
              zones={[
                { threshold: 70, color: '#22c55e' },
                { threshold: 90, color: '#f59e0b' },
                { threshold: 100, color: '#ef4444' },
              ]}
            />
          </div>
        </section>
      )}

      {/* Trend Chart */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Resource Trends</h2>
        <MetricChart
          data={trendData as Record<string, unknown>[]}
          series={trendSeries}
          type="area"
          title="CPU / Memory / Disk"
          description="Live resource usage over time"
          height={280}
          gradientFill
        />
      </section>

      {/* Comparison & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Server Comparison */}
        <ComparisonChart
          servers={comparisonServers}
          title="CPU Comparison"
          metric="CPU Usage"
          unit="%"
          height={300}
          showDifference
        />

        {/* Heatmap */}
        <HeatmapChart
          data={heatmapData}
          title="Uptime Activity"
          description="365-day activity overview"
          maxValue={100}
          colorScale={[
            'rgba(34, 197, 94, 0.06)',
            'rgba(34, 197, 94, 0.18)',
            'rgba(34, 197, 94, 0.35)',
            'rgba(34, 197, 94, 0.55)',
            'rgba(34, 197, 94, 0.85)',
          ]}
        />
      </div>

      {/* Network Topology */}
      {topologyData.nodes.length > 1 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Network Topology</h2>
          <NetworkTopology
            nodes={topologyData.nodes}
            edges={topologyData.edges}
            title="Server Connections"
            description="Real-time server connectivity and traffic flow"
            height={350}
          />
        </section>
      )}

      {/* Multi-metric breakdown */}
      {servers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Server Breakdown</h2>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">All Servers — Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {servers.slice(0, 8).map((server, i) => (
                  <div
                    key={server.name + i}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: server.online ? '#22c55e' : '#ef4444',
                        }}
                      />
                      <span className="text-sm font-medium truncate">{server.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                      <div>
                        <span className="block">CPU</span>
                        <span className="font-medium text-foreground">{server.cpu.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="block">Mem</span>
                        <span className="font-medium text-foreground">{server.mem.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="block">Disk</span>
                        <span className="font-medium text-foreground">{server.disk.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
