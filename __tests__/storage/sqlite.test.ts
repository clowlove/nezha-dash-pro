import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'unknown';
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MetricRecord {
  id: number;
  serverId: string;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  timestamp: Date;
}

// In-memory SQLite-like store for testing
class SQLiteStorage {
  private servers: Map<string, Server> = new Map();
  private metrics: MetricRecord[] = [];
  private nextMetricId = 1;

  // Server CRUD
  createServer(server: Omit<Server, 'createdAt' | 'updatedAt'>): Server {
    const now = new Date();
    const full: Server = { ...server, createdAt: now, updatedAt: now };
    this.servers.set(server.id, full);
    return full;
  }

  getServer(id: string): Server | undefined {
    return this.servers.get(id);
  }

  listServers(): Server[] {
    return Array.from(this.servers.values());
  }

  updateServer(id: string, updates: Partial<Server>): Server | undefined {
    const existing = this.servers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.servers.set(id, updated);
    return updated;
  }

  deleteServer(id: string): boolean {
    this.metrics = this.metrics.filter(m => m.serverId !== id);
    return this.servers.delete(id);
  }

  // Metrics
  insertMetric(record: Omit<MetricRecord, 'id'>): MetricRecord {
    const full: MetricRecord = { ...record, id: this.nextMetricId++ };
    this.metrics.push(full);
    return full;
  }

  getMetrics(serverId: string, from?: Date, to?: Date): MetricRecord[] {
    return this.metrics.filter(m => {
      if (m.serverId !== serverId) return false;
      if (from && m.timestamp < from) return false;
      if (to && m.timestamp > to) return false;
      return true;
    });
  }

  // Aggregation
  aggregateMetrics(
    serverId: string,
    field: 'cpu' | 'memory' | 'disk' | 'networkIn' | 'networkOut',
    aggregation: 'avg' | 'min' | 'max' | 'sum',
    from: Date,
    to: Date,
  ): number | null {
    const records = this.getMetrics(serverId, from, to);
    if (records.length === 0) return null;

    const values = records.map(r => r[field]);
    switch (aggregation) {
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'sum': return values.reduce((a, b) => a + b, 0);
      default: return null;
    }
  }

  // Retention cleanup
  cleanupOldMetrics(before: Date): number {
    const beforeLen = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= before);
    return beforeLen - this.metrics.length;
  }

  getMetricCount(): number {
    return this.metrics.length;
  }
}

// Tests
describe('SQLiteStorage', () => {
  let storage: SQLiteStorage;

  beforeEach(() => {
    storage = new SQLiteStorage();
  });

  describe('Server CRUD', () => {
    const sampleServer = {
      id: 'srv-1',
      name: 'Web Server 1',
      host: '192.168.1.10',
      port: 22,
      status: 'online' as const,
      cpu: 45.5,
      memory: 62.3,
      disk: 78.1,
      uptime: 86400,
    };

    it('should create a server', () => {
      const server = storage.createServer(sampleServer);
      expect(server.id).toBe('srv-1');
      expect(server.name).toBe('Web Server 1');
      expect(server.createdAt).toBeInstanceOf(Date);
      expect(server.updatedAt).toBeInstanceOf(Date);
    });

    it('should get a server by id', () => {
      storage.createServer(sampleServer);
      const found = storage.getServer('srv-1');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Web Server 1');
    });

    it('should return undefined for missing server', () => {
      expect(storage.getServer('nonexistent')).toBeUndefined();
    });

    it('should list all servers', () => {
      storage.createServer(sampleServer);
      storage.createServer({ ...sampleServer, id: 'srv-2', name: 'DB Server' });
      expect(storage.listServers()).toHaveLength(2);
    });

    it('should update a server', () => {
      storage.createServer(sampleServer);
      const updated = storage.updateServer('srv-1', { cpu: 90.5, status: 'offline' });
      expect(updated?.cpu).toBe(90.5);
      expect(updated?.status).toBe('offline');
      expect(updated?.name).toBe('Web Server 1'); // Unchanged fields preserved
    });

    it('should return undefined when updating missing server', () => {
      expect(storage.updateServer('nonexistent', { cpu: 50 })).toBeUndefined();
    });

    it('should delete a server', () => {
      storage.createServer(sampleServer);
      expect(storage.deleteServer('srv-1')).toBe(true);
      expect(storage.getServer('srv-1')).toBeUndefined();
    });

    it('should return false when deleting missing server', () => {
      expect(storage.deleteServer('nonexistent')).toBe(false);
    });

    it('should cascade delete metrics when deleting server', () => {
      storage.createServer(sampleServer);
      storage.insertMetric({
        serverId: 'srv-1',
        cpu: 50,
        memory: 60,
        disk: 70,
        networkIn: 1000,
        networkOut: 2000,
        timestamp: new Date(),
      });

      storage.deleteServer('srv-1');
      expect(storage.getMetrics('srv-1')).toHaveLength(0);
    });
  });

  describe('Metric Insertion and Query', () => {
    beforeEach(() => {
      storage.createServer({
        id: 'srv-1',
        name: 'Test Server',
        host: '10.0.0.1',
        port: 22,
        status: 'online',
        cpu: 0,
        memory: 0,
        disk: 0,
        uptime: 0,
      });
    });

    it('should insert and retrieve metrics', () => {
      const now = new Date();
      storage.insertMetric({
        serverId: 'srv-1',
        cpu: 45.5,
        memory: 62.3,
        disk: 78.1,
        networkIn: 1024,
        networkOut: 2048,
        timestamp: now,
      });

      const metrics = storage.getMetrics('srv-1');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].cpu).toBe(45.5);
    });

    it('should filter metrics by date range', () => {
      const t1 = new Date('2025-01-01T00:00:00Z');
      const t2 = new Date('2025-01-01T01:00:00Z');
      const t3 = new Date('2025-01-01T02:00:00Z');

      storage.insertMetric({ serverId: 'srv-1', cpu: 10, memory: 20, disk: 30, networkIn: 0, networkOut: 0, timestamp: t1 });
      storage.insertMetric({ serverId: 'srv-1', cpu: 20, memory: 30, disk: 40, networkIn: 0, networkOut: 0, timestamp: t2 });
      storage.insertMetric({ serverId: 'srv-1', cpu: 30, memory: 40, disk: 50, networkIn: 0, networkOut: 0, timestamp: t3 });

      const metrics = storage.getMetrics('srv-1', t1, t2);
      expect(metrics).toHaveLength(2);
    });

    it('should return empty for server with no metrics', () => {
      expect(storage.getMetrics('srv-1')).toHaveLength(0);
    });

    it('should auto-increment metric ids', () => {
      const m1 = storage.insertMetric({ serverId: 'srv-1', cpu: 10, memory: 20, disk: 30, networkIn: 0, networkOut: 0, timestamp: new Date() });
      const m2 = storage.insertMetric({ serverId: 'srv-1', cpu: 20, memory: 30, disk: 40, networkIn: 0, networkOut: 0, timestamp: new Date() });
      expect(m2.id).toBe(m1.id + 1);
    });
  });

  describe('Aggregation', () => {
    beforeEach(() => {
      storage.createServer({
        id: 'srv-1',
        name: 'Test Server',
        host: '10.0.0.1',
        port: 22,
        status: 'online',
        cpu: 0,
        memory: 0,
        disk: 0,
        uptime: 0,
      });

      const base = new Date('2025-01-01T00:00:00Z');
      for (let i = 0; i < 10; i++) {
        storage.insertMetric({
          serverId: 'srv-1',
          cpu: 10 + i * 5,
          memory: 50 + i,
          disk: 70,
          networkIn: i * 100,
          networkOut: i * 50,
          timestamp: new Date(base.getTime() + i * 60000),
        });
      }
    });

    it('should calculate average', () => {
      const avg = storage.aggregateMetrics('srv-1', 'cpu', 'avg',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-01T00:10:00Z'),
      );
      expect(avg).toBeCloseTo(32.5, 0); // (10+15+20+25+30+35+40+45+50+55)/10
    });

    it('should calculate min', () => {
      const min = storage.aggregateMetrics('srv-1', 'cpu', 'min',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-01T00:10:00Z'),
      );
      expect(min).toBe(10);
    });

    it('should calculate max', () => {
      const max = storage.aggregateMetrics('srv-1', 'cpu', 'max',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-01T00:10:00Z'),
      );
      expect(max).toBe(55);
    });

    it('should calculate sum', () => {
      const sum = storage.aggregateMetrics('srv-1', 'networkIn', 'sum',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-01T00:10:00Z'),
      );
      expect(sum).toBe(4500); // 0+100+200+...+900
    });

    it('should return null for empty range', () => {
      const result = storage.aggregateMetrics('srv-1', 'cpu', 'avg',
        new Date('2025-06-01T00:00:00Z'),
        new Date('2025-06-01T01:00:00Z'),
      );
      expect(result).toBeNull();
    });

    it('should filter by date range for aggregation', () => {
      const avg = storage.aggregateMetrics('srv-1', 'cpu', 'avg',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-01T00:03:00Z'), // Only first 3 records
      );
      expect(avg).toBeCloseTo(15, 0); // (10+15+20)/3
    });
  });

  describe('Retention Cleanup', () => {
    beforeEach(() => {
      storage.createServer({
        id: 'srv-1',
        name: 'Test Server',
        host: '10.0.0.1',
        port: 22,
        status: 'online',
        cpu: 0,
        memory: 0,
        disk: 0,
        uptime: 0,
      });
    });

    it('should delete old metrics', () => {
      const old = new Date('2024-01-01T00:00:00Z');
      const recent = new Date('2025-06-01T00:00:00Z');
      const cutoff = new Date('2025-01-01T00:00:00Z');

      storage.insertMetric({ serverId: 'srv-1', cpu: 10, memory: 20, disk: 30, networkIn: 0, networkOut: 0, timestamp: old });
      storage.insertMetric({ serverId: 'srv-1', cpu: 50, memory: 60, disk: 70, networkIn: 0, networkOut: 0, timestamp: recent });

      const deleted = storage.cleanupOldMetrics(cutoff);
      expect(deleted).toBe(1);
      expect(storage.getMetricCount()).toBe(1);
    });

    it('should return zero when nothing to clean', () => {
      storage.insertMetric({
        serverId: 'srv-1', cpu: 50, memory: 60, disk: 70,
        networkIn: 0, networkOut: 0, timestamp: new Date(),
      });

      const deleted = storage.cleanupOldMetrics(new Date('2020-01-01'));
      expect(deleted).toBe(0);
    });

    it('should handle empty storage', () => {
      const deleted = storage.cleanupOldMetrics(new Date());
      expect(deleted).toBe(0);
      expect(storage.getMetricCount()).toBe(0);
    });
  });
});
