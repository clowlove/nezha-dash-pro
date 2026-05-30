import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock types and interfaces
interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  cooldownSeconds: number;
  autoResolveSeconds: number;
  enabled: boolean;
  serverIds: string[];
}

interface Alert {
  id: string;
  ruleId: string;
  serverId: string;
  status: 'firing' | 'resolved' | 'cooldown';
  value: number;
  threshold: number;
  message: string;
  firedAt: Date;
  resolvedAt: Date | null;
  lastNotifiedAt: Date | null;
}

// Simulated AlertManager
class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private now: () => Date;

  constructor(now?: () => Date) {
    this.now = now || (() => new Date());
  }

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  evaluate(serverId: string, metrics: Record<string, number>): Alert[] {
    const triggered: Alert[] = [];
    const now = this.now();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (!rule.serverIds.includes(serverId)) continue;

      const value = metrics[rule.metric];
      if (value === undefined) continue;

      const isTriggered = this.checkCondition(value, rule.condition, rule.threshold);
      const alertKey = `${rule.id}:${serverId}`;
      const existing = this.activeAlerts.get(alertKey);

      if (isTriggered) {
        if (existing && existing.status === 'cooldown') {
          continue; // Still in cooldown, skip
        }
        if (existing && existing.status === 'firing') {
          triggered.push(existing);
          continue;
        }
        // New alert
        const alert: Alert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ruleId: rule.id,
          serverId,
          status: 'firing',
          value,
          threshold: rule.threshold,
          message: `${rule.name}: ${rule.metric}=${value} ${rule.condition} ${rule.threshold}`,
          firedAt: now,
          resolvedAt: null,
          lastNotifiedAt: null,
        };
        this.activeAlerts.set(alertKey, alert);
        triggered.push(alert);
      } else if (existing && existing.status === 'firing') {
        // Check auto-resolve
        const elapsed = (now.getTime() - existing.firedAt.getTime()) / 1000;
        if (elapsed >= rule.autoResolveSeconds) {
          existing.status = 'resolved';
          existing.resolvedAt = now;
          triggered.push(existing);
        }
      }
    }
    return triggered;
  }

  enterCooldown(alertKey: string): void {
    const alert = this.activeAlerts.get(alertKey);
    if (alert) {
      alert.status = 'cooldown';
      alert.lastNotifiedAt = this.now();
    }
  }

  checkCooldownExpired(alertKey: string): boolean {
    const alert = this.activeAlerts.get(alertKey);
    if (!alert || alert.status !== 'cooldown') return false;

    const rule = this.rules.get(alert.ruleId);
    if (!rule) return false;

    const elapsed = (this.now().getTime() - (alert.lastNotifiedAt?.getTime() || 0)) / 1000;
    if (elapsed >= rule.cooldownSeconds) {
      alert.status = 'firing';
      return true;
    }
    return false;
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => a.status === 'firing');
  }

  getAlertByKey(key: string): Alert | undefined {
    return this.activeAlerts.get(key);
  }

  clearAll(): void {
    this.rules.clear();
    this.activeAlerts.clear();
  }
}

// Tests
describe('AlertManager', () => {
  let manager: AlertManager;
  let mockNow: Date;

  beforeEach(() => {
    mockNow = new Date('2025-01-01T00:00:00Z');
    manager = new AlertManager(() => mockNow);
  });

  afterEach(() => {
    manager.clearAll();
  });

  describe('Rule Evaluation', () => {
    const cpuRule: AlertRule = {
      id: 'cpu-high',
      name: 'High CPU',
      metric: 'cpu',
      condition: 'gt',
      threshold: 80,
      cooldownSeconds: 300,
      autoResolveSeconds: 60,
      enabled: true,
      serverIds: ['srv-1', 'srv-2'],
    };

    it('should trigger alert when condition met', () => {
      manager.addRule(cpuRule);
      const alerts = manager.evaluate('srv-1', { cpu: 90 });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('firing');
      expect(alerts[0].value).toBe(90);
      expect(alerts[0].serverId).toBe('srv-1');
    });

    it('should not trigger when condition not met', () => {
      manager.addRule(cpuRule);
      const alerts = manager.evaluate('srv-1', { cpu: 50 });
      expect(alerts).toHaveLength(0);
    });

    it('should skip disabled rules', () => {
      manager.addRule({ ...cpuRule, enabled: false });
      const alerts = manager.evaluate('srv-1', { cpu: 95 });
      expect(alerts).toHaveLength(0);
    });

    it('should skip servers not in rule scope', () => {
      manager.addRule(cpuRule);
      const alerts = manager.evaluate('srv-99', { cpu: 95 });
      expect(alerts).toHaveLength(0);
    });

    it('should skip metrics not present', () => {
      manager.addRule(cpuRule);
      const alerts = manager.evaluate('srv-1', { memory: 90 });
      expect(alerts).toHaveLength(0);
    });

    it('should evaluate gt condition correctly', () => {
      manager.addRule({ ...cpuRule, condition: 'gt', threshold: 80 });
      expect(manager.evaluate('srv-1', { cpu: 80 })).toHaveLength(0);
      expect(manager.evaluate('srv-1', { cpu: 81 })).toHaveLength(1);
    });

    it('should evaluate lt condition correctly', () => {
      manager.addRule({ ...cpuRule, condition: 'lt', threshold: 20 });
      expect(manager.evaluate('srv-1', { cpu: 20 })).toHaveLength(0);
      expect(manager.evaluate('srv-1', { cpu: 19 })).toHaveLength(1);
    });

    it('should evaluate eq condition correctly', () => {
      manager.addRule({ ...cpuRule, condition: 'eq', threshold: 50 });
      expect(manager.evaluate('srv-1', { cpu: 50 })).toHaveLength(1);
      expect(manager.evaluate('srv-1', { cpu: 51 })).toHaveLength(0);
    });

    it('should evaluate gte condition correctly', () => {
      manager.addRule({ ...cpuRule, condition: 'gte', threshold: 80 });
      expect(manager.evaluate('srv-1', { cpu: 80 })).toHaveLength(1);
      expect(manager.evaluate('srv-1', { cpu: 79 })).toHaveLength(0);
    });

    it('should evaluate lte condition correctly', () => {
      manager.addRule({ ...cpuRule, condition: 'lte', threshold: 20 });
      expect(manager.evaluate('srv-1', { cpu: 20 })).toHaveLength(1);
      expect(manager.evaluate('srv-1', { cpu: 21 })).toHaveLength(0);
    });
  });

  describe('Alert Lifecycle', () => {
    it('should not create duplicate firing alerts', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      const first = manager.evaluate('srv-1', { cpu: 90 });
      const second = manager.evaluate('srv-1', { cpu: 95 });

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
      expect(second[0].id).toBe(first[0].id); // Same alert returned
    });

    it('should auto-resolve after configured seconds', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.evaluate('srv-1', { cpu: 90 });

      // Advance time past auto-resolve threshold
      mockNow = new Date('2025-01-01T00:01:01Z');
      const alerts = manager.evaluate('srv-1', { cpu: 50 });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('resolved');
      expect(alerts[0].resolvedAt).toEqual(mockNow);
    });

    it('should not auto-resolve before threshold', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.evaluate('srv-1', { cpu: 90 });

      // Advance time but not past threshold
      mockNow = new Date('2025-01-01T00:00:30Z');
      const alerts = manager.evaluate('srv-1', { cpu: 50 });
      expect(alerts).toHaveLength(0);
    });

    it('should track multiple alerts across servers', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1', 'srv-2'],
      });

      manager.evaluate('srv-1', { cpu: 90 });
      manager.evaluate('srv-2', { cpu: 95 });

      expect(manager.getActiveAlerts()).toHaveLength(2);
    });
  });

  describe('Cooldown', () => {
    it('should enter cooldown after notification', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.evaluate('srv-1', { cpu: 90 });
      manager.enterCooldown('cpu-high:srv-1');

      const alert = manager.getAlertByKey('cpu-high:srv-1');
      expect(alert?.status).toBe('cooldown');
    });

    it('should skip evaluation during cooldown', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.evaluate('srv-1', { cpu: 90 });
      manager.enterCooldown('cpu-high:srv-1');

      const alerts = manager.evaluate('srv-1', { cpu: 95 });
      expect(alerts).toHaveLength(0);
    });

    it('should expire cooldown after configured seconds', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 600,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.evaluate('srv-1', { cpu: 90 });
      manager.enterCooldown('cpu-high:srv-1');

      // Advance past cooldown
      mockNow = new Date('2025-01-01T00:05:01Z');
      const expired = manager.checkCooldownExpired('cpu-high:srv-1');
      expect(expired).toBe(true);

      const alert = manager.getAlertByKey('cpu-high:srv-1');
      expect(alert?.status).toBe('firing');
    });

    it('should not expire cooldown prematurely', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 600,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.evaluate('srv-1', { cpu: 90 });
      manager.enterCooldown('cpu-high:srv-1');

      mockNow = new Date('2025-01-01T00:02:00Z');
      const expired = manager.checkCooldownExpired('cpu-high:srv-1');
      expect(expired).toBe(false);
    });
  });

  describe('Rule Management', () => {
    it('should add and remove rules', () => {
      const rule: AlertRule = {
        id: 'test-rule',
        name: 'Test',
        metric: 'cpu',
        condition: 'gt',
        threshold: 50,
        cooldownSeconds: 60,
        autoResolveSeconds: 120,
        enabled: true,
        serverIds: ['srv-1'],
      };

      manager.addRule(rule);
      expect(manager.evaluate('srv-1', { cpu: 60 })).toHaveLength(1);

      manager.removeRule('test-rule');
      manager.clearAll();
      manager.addRule({ ...rule, enabled: true });
      // Re-evaluate after clear
      expect(manager.evaluate('srv-1', { cpu: 60 })).toHaveLength(1);
    });

    it('should return false when removing non-existent rule', () => {
      expect(manager.removeRule('nonexistent')).toBe(false);
    });
  });

  describe('Multiple Rules', () => {
    it('should evaluate multiple rules independently', () => {
      manager.addRule({
        id: 'cpu-high',
        name: 'High CPU',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      manager.addRule({
        id: 'mem-high',
        name: 'High Memory',
        metric: 'memory',
        condition: 'gt',
        threshold: 90,
        cooldownSeconds: 300,
        autoResolveSeconds: 60,
        enabled: true,
        serverIds: ['srv-1'],
      });

      const alerts = manager.evaluate('srv-1', { cpu: 95, memory: 95 });
      expect(alerts).toHaveLength(2);
      expect(alerts.map(a => a.ruleId)).toContain('cpu-high');
      expect(alerts.map(a => a.ruleId)).toContain('mem-high');
    });
  });
});
