/**
 * Development seed data for NezhaDash Pro
 * Run: npx tsx scripts/seed-data.ts
 */

interface SeedServer {
  id: string;
  name: string;
  host: string;
  port: number;
  group: string;
  tags: string[];
  status: 'online' | 'offline';
}

interface SeedUser {
  id: string;
  username: string;
  password: string; // bcrypt hash placeholder
  role: 'admin' | 'viewer';
  email: string;
}

interface SeedAlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  serverIds: string[];
  enabled: boolean;
}

interface SeedTheme {
  id: string;
  name: string;
  primary: string;
  background: string;
  accent: string;
  dark: boolean;
}

const servers: SeedServer[] = [
  { id: 'srv-001', name: 'Web Server 1', host: '10.0.1.10', port: 22, group: 'Production', tags: ['web', 'nginx'], status: 'online' },
  { id: 'srv-002', name: 'Web Server 2', host: '10.0.1.11', port: 22, group: 'Production', tags: ['web', 'nginx'], status: 'online' },
  { id: 'srv-003', name: 'API Server 1', host: '10.0.2.10', port: 22, group: 'Production', tags: ['api', 'node'], status: 'online' },
  { id: 'srv-004', name: 'Database Primary', host: '10.0.3.10', port: 22, group: 'Production', tags: ['db', 'postgres'], status: 'online' },
  { id: 'srv-005', name: 'Database Replica', host: '10.0.3.11', port: 22, group: 'Production', tags: ['db', 'postgres', 'replica'], status: 'online' },
  { id: 'srv-006', name: 'Redis Cache', host: '10.0.4.10', port: 22, group: 'Production', tags: ['cache', 'redis'], status: 'online' },
  { id: 'srv-007', name: 'Worker Node 1', host: '10.0.5.10', port: 22, group: 'Workers', tags: ['worker', 'queue'], status: 'online' },
  { id: 'srv-008', name: 'Worker Node 2', host: '10.0.5.11', port: 22, group: 'Workers', tags: ['worker', 'queue'], status: 'offline' },
  { id: 'srv-009', name: 'Staging Web', host: '10.0.10.10', port: 22, group: 'Staging', tags: ['web', 'staging'], status: 'online' },
  { id: 'srv-010', name: 'Dev Server', host: '10.0.20.10', port: 22, group: 'Development', tags: ['dev'], status: 'online' },
];

const users: SeedUser[] = [
  { id: 'usr-001', username: 'admin', password: '$2b$10$placeholder_hash_admin', role: 'admin', email: 'admin@example.com' },
  { id: 'usr-002', username: 'viewer', password: '$2b$10$placeholder_hash_viewer', role: 'viewer', email: 'viewer@example.com' },
  { id: 'usr-003', username: 'ops-lead', password: '$2b$10$placeholder_hash_ops', role: 'admin', email: 'ops@example.com' },
];

const alertRules: SeedAlertRule[] = [
  { id: 'rule-001', name: 'High CPU Usage', metric: 'cpu', condition: 'gt', threshold: 85, serverIds: ['srv-001', 'srv-002', 'srv-003'], enabled: true },
  { id: 'rule-002', name: 'High Memory Usage', metric: 'memory', condition: 'gt', threshold: 90, serverIds: ['srv-001', 'srv-002', 'srv-003', 'srv-004'], enabled: true },
  { id: 'rule-003', name: 'Disk Space Low', metric: 'disk', condition: 'gt', threshold: 90, serverIds: servers.map(s => s.id), enabled: true },
  { id: 'rule-004', name: 'Server Offline', metric: 'status', condition: 'eq', threshold: 0, serverIds: servers.map(s => s.id), enabled: true },
  { id: 'rule-005', name: 'High Network Traffic', metric: 'networkIn', condition: 'gt', threshold: 1000000000, serverIds: ['srv-001', 'srv-002'], enabled: false },
];

const themes: SeedTheme[] = [
  { id: 'theme-dark', name: 'Midnight Dark', primary: '#6366f1', background: '#0f172a', accent: '#818cf8', dark: true },
  { id: 'theme-light', name: 'Clean Light', primary: '#4f46e5', background: '#ffffff', accent: '#6366f1', dark: false },
  { id: 'theme-green', name: 'Matrix Green', primary: '#22c55e', background: '#0a0a0a', accent: '#4ade80', dark: true },
  { id: 'theme-ocean', name: 'Ocean Blue', primary: '#0ea5e9', background: '#0c1222', accent: '#38bdf8', dark: true },
  { id: 'theme-sunset', name: 'Sunset Orange', primary: '#f97316', background: '#1c1917', accent: '#fb923c', dark: true },
];

async function seed() {
  console.log('🌱 Seeding NezhaDash Pro development data...\n');

  console.log(`📦 Servers: ${servers.length}`);
  servers.forEach(s => console.log(`   ${s.status === 'online' ? '🟢' : '🔴'} ${s.name} (${s.host}) [${s.group}]`));

  console.log(`\n👥 Users: ${users.length}`);
  users.forEach(u => console.log(`   ${u.role === 'admin' ? '👑' : '👁'} ${u.username} (${u.role})`));

  console.log(`\n🔔 Alert Rules: ${alertRules.length}`);
  alertRules.forEach(r => console.log(`   ${r.enabled ? '✅' : '⏸'} ${r.name}: ${r.metric} ${r.condition} ${r.threshold}`));

  console.log(`\n🎨 Themes: ${themes.length}`);
  themes.forEach(t => console.log(`   ${t.dark ? '🌙' : '☀️'} ${t.name} (${t.primary})`));

  console.log('\n✨ Seed data generated successfully!');
  console.log('💡 Use this data with your database initialization script.');
}

seed().catch(console.error);
