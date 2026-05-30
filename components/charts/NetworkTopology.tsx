'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ServerStatus = 'online' | 'warning' | 'offline';

export interface TopologyNode {
  id: string;
  label: string;
  status: ServerStatus;
  region?: string;
  trafficIn?: number;
  trafficOut?: number;
  cpu?: number;
}

export interface TopologyEdge {
  from: string;
  to: string;
  latency?: number; // ms
  bandwidth?: number; // Mbps
  traffic?: number; // current usage 0-1
}

interface NetworkTopologyProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  className?: string;
}

const STATUS_COLORS: Record<ServerStatus, string> = {
  online: '#22c55e',
  warning: '#f59e0b',
  offline: '#ef4444',
};

function formatTraffic(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function NetworkTopology({
  nodes,
  edges,
  title = 'Network Topology',
  description,
  width = 600,
  height = 400,
  className,
}: NetworkTopologyProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  // Auto-layout nodes in a circle
  const layout = useMemo(() => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const positions = new Map<string, { x: number; y: number }>();

    if (nodes.length === 1) {
      positions.set(nodes[0].id, { x: cx, y: cy });
    } else {
      nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        positions.set(node.id, {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        });
      });
    }

    return positions;
  }, [nodes, width, height]);

  const nodeRadius = Math.max(18, Math.min(30, 400 / nodes.length));

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="select-none"
        >
          {/* Edge definitions for arrows */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const fromPos = layout.get(edge.from);
            const toPos = layout.get(edge.to);
            if (!fromPos || !toPos) return null;

            const isHighlighted = hoveredNode === edge.from || hoveredNode === edge.to;
            const isEdgeHovered = hoveredEdge === i;

            // Calculate edge direction for offset
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / dist;
            const ny = dy / dist;

            const x1 = fromPos.x + nx * (nodeRadius + 4);
            const y1 = fromPos.y + ny * (nodeRadius + 4);
            const x2 = toPos.x - nx * (nodeRadius + 4);
            const y2 = toPos.y - ny * (nodeRadius + 4);

            const edgeColor = edge.traffic && edge.traffic > 0.8
              ? '#ef4444'
              : edge.traffic && edge.traffic > 0.5
                ? '#f59e0b'
                : '#6b7280';

            const strokeWidth = isEdgeHovered ? 3 : isHighlighted ? 2 : 1.5;

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={edgeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={edge.traffic === 0 ? '4 4' : 'none'}
                  opacity={isHighlighted || isEdgeHovered ? 1 : 0.5}
                  markerEnd="url(#arrowhead)"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredEdge(i)}
                  onMouseLeave={() => setHoveredEdge(null)}
                />
                {/* Traffic flow animation */}
                {edge.traffic && edge.traffic > 0 && (
                  <circle r={3} fill={edgeColor}>
                    <animateMotion
                      dur={`${3 / Math.max(edge.traffic, 0.1)}s`}
                      repeatCount="indefinite"
                      path={`M${x1},${y1} L${x2},${y2}`}
                    />
                  </circle>
                )}
                {/* Edge label */}
                {(edge.latency !== undefined || edge.bandwidth !== undefined) && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#9ca3af"
                    opacity={isHighlighted || isEdgeHovered ? 1 : 0.6}
                  >
                    {edge.latency !== undefined ? `${edge.latency}ms` : ''}
                    {edge.latency !== undefined && edge.bandwidth !== undefined ? ' · ' : ''}
                    {edge.bandwidth !== undefined ? `${edge.bandwidth}Mbps` : ''}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = layout.get(node.id);
            if (!pos) return null;

            const isHovered = hoveredNode === node.id;
            const statusColor = STATUS_COLORS[node.status];

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 6}
                    fill="none"
                    stroke={statusColor}
                    strokeWidth={2}
                    opacity={0.3}
                    filter="url(#glow)"
                  />
                )}
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  className="fill-card"
                  stroke={statusColor}
                  strokeWidth={isHovered ? 3 : 2}
                />
                {/* Status dot */}
                <circle
                  cx={pos.x + nodeRadius * 0.65}
                  cy={pos.y - nodeRadius * 0.65}
                  r={5}
                  fill={statusColor}
                  stroke="white"
                  strokeWidth={2}
                  className="dark:stroke-gray-900"
                />
                {/* Node label */}
                <text
                  x={pos.x}
                  y={pos.y - 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  className="fill-foreground"
                >
                  {node.label.length > 8 ? node.label.substring(0, 8) + '…' : node.label}
                </text>
                {/* Region label */}
                {node.region && (
                  <text
                    x={pos.x}
                    y={pos.y + 12}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#9ca3af"
                  >
                    {node.region}
                  </text>
                )}
                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={pos.x - 60}
                      y={pos.y + nodeRadius + 8}
                      width={120}
                      height={60}
                      rx={4}
                      className="fill-card"
                      stroke={statusColor}
                      strokeWidth={1}
                      opacity={0.95}
                    />
                    <text x={pos.x - 48} y={pos.y + nodeRadius + 22} fontSize={10} className="fill-foreground font-medium">
                      {node.label}
                    </text>
                    {node.cpu !== undefined && (
                      <text x={pos.x - 48} y={pos.y + nodeRadius + 36} fontSize={9} fill="#9ca3af">
                        CPU: {node.cpu.toFixed(1)}%
                      </text>
                    )}
                    {node.trafficIn !== undefined && (
                      <text x={pos.x - 48} y={pos.y + nodeRadius + 48} fontSize={9} fill="#9ca3af">
                        ↓{formatTraffic(node.trafficIn)} ↑{formatTraffic(node.trafficOut ?? 0)}
                      </text>
                    )}
                    <text x={pos.x - 48} y={pos.y + nodeRadius + 60} fontSize={9} fill={statusColor}>
                      Status: {node.status}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
