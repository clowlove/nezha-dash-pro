import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import {
  User, CreateUserInput, UpdateUserInput,
  Team, CreateTeamInput,
  Invitation, InviteInput, Role,
} from './types';
import { getDb, runMigrations } from '../shared/database';

// ── In-memory L1 caches (backed by SQLite) ─────────────────────────────
const users: Map<string, User> = new Map();
const teams: Map<string, Team> = new Map();
const invitations: Map<string, Invitation> = new Map();
let idCounter = 0;
let _dbInitialised = false;

function nextId(): string {
  return `id_${++idCounter}_${Date.now()}`;
}

// ── Database initialisation ────────────────────────────────────────────
export function initDatabase(): void {
  if (_dbInitialised) return;
  runMigrations();
  loadFromDb();
  _dbInitialised = true;
}

function loadFromDb(): void {
  const db = getDb();

  // Load users
  const userRows = db.prepare('SELECT * FROM users').all() as Array<Record<string, unknown>>;
  for (const row of userRows) {
    const user = rowToUser(row);
    users.set(user.id, user);
  }

  // Load teams
  const teamRows = db.prepare('SELECT * FROM teams').all() as Array<Record<string, unknown>>;
  for (const row of teamRows) {
    const team = rowToTeam(row);
    teams.set(team.id, team);
  }

  // Load invitations
  const invRows = db.prepare('SELECT * FROM invitations').all() as Array<Record<string, unknown>;
  for (const row of invRows) {
    const inv = rowToInvitation(row);
    invitations.set(inv.id, inv);
  }
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    passwordHash: row.password_hash as string,
    passwordSalt: row.password_salt as string,
    role: row.role as Role,
    tenantId: row.tenant_id as string,
    avatarUrl: row.avatar_url as string | undefined,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToTeam(row: Record<string, unknown>): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    tenantId: row.tenant_id as string,
    memberIds: JSON.parse(row.member_ids as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToInvitation(row: Record<string, unknown>): Invitation {
  return {
    id: row.id as string,
    email: row.email as string,
    role: row.role as Role,
    teamId: row.team_id as string | undefined,
    tenantId: row.tenant_id as string,
    invitedBy: row.invited_by as string,
    token: row.token as string,
    expiresAt: row.expires_at as string,
    acceptedAt: row.accepted_at as string | undefined,
    createdAt: row.created_at as string,
  };
}

// ── Async write-through helpers (fire-and-forget) ──────────────────────
function persistUser(user: User): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO users
       (id, email, name, password_hash, password_salt, role, tenant_id, avatar_url, is_active, last_login_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.id, user.email, user.name, user.passwordHash, user.passwordSalt,
      user.role, user.tenantId, user.avatarUrl ?? null, user.isActive ? 1 : 0,
      user.lastLoginAt ?? null, user.createdAt, user.updatedAt,
    );
  } catch (err) {
    console.error('[user-manager] Failed to persist user:', err);
  }
}

function persistTeam(team: Team): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO teams
       (id, name, description, tenant_id, member_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      team.id, team.name, team.description ?? null, team.tenantId,
      JSON.stringify(team.memberIds), team.createdAt, team.updatedAt,
    );
  } catch (err) {
    console.error('[user-manager] Failed to persist team:', err);
  }
}

function persistInvitation(inv: Invitation): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO invitations
       (id, email, role, team_id, tenant_id, invited_by, token, expires_at, accepted_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      inv.id, inv.email, inv.role, inv.teamId ?? null, inv.tenantId,
      inv.invitedBy, inv.token, inv.expiresAt, inv.acceptedAt ?? null, inv.createdAt,
    );
  } catch (err) {
    console.error('[user-manager] Failed to persist invitation:', err);
  }
}

function deleteFromDb(table: string, id: string): void {
  try {
    getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  } catch (err) {
    console.error(`[user-manager] Failed to delete ${table}:`, err);
  }
}

// ── Password helpers ──────────────────────────────────────────────────────
const SALT_ROUNDS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, actualSalt, SALT_ROUNDS, KEY_LENGTH, DIGEST).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computed } = hashPassword(password, salt);
  const computedBuf = Buffer.from(computed);
  const hashBuf = Buffer.from(hash);
  if (computedBuf.length !== hashBuf.length) return false;
  return timingSafeEqual(computedBuf, hashBuf);
}

// ── User CRUD ─────────────────────────────────────────────────────────────
export function createUser(input: CreateUserInput): User {
  const existing = Array.from(users.values()).find(
    (u) => u.email === input.email && u.tenantId === input.tenantId
  );
  if (existing) throw new Error('User with this email already exists in tenant');

  const { hash, salt } = hashPassword(input.password);
  const now = new Date().toISOString();
  const user: User = {
    id: nextId(),
    email: input.email,
    name: input.name,
    passwordHash: hash,
    passwordSalt: salt,
    role: input.role || 'viewer',
    tenantId: input.tenantId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  users.set(user.id, user);
  persistUser(user);
  return user;
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getUsersByTenant(tenantId: string): User[] {
  return Array.from(users.values()).filter((u) => u.tenantId === tenantId);
}

export function getUsersByEmail(email: string): User[] {
  return Array.from(users.values()).filter((u) => u.email === email);
}

export function updateUser(id: string, input: UpdateUserInput): User {
  const user = users.get(id);
  if (!user) throw new Error('User not found');
  if (input.name !== undefined) user.name = input.name;
  if (input.role !== undefined) user.role = input.role;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
  user.updatedAt = new Date().toISOString();
  users.set(id, user);
  persistUser(user);
  return user;
}

export function deleteUser(id: string): boolean {
  const deleted = users.delete(id);
  if (deleted) deleteFromDb('users', id);
  return deleted;
}

export function authenticateUser(email: string, password: string, tenantId: string): User | null {
  const user = Array.from(users.values()).find(
    (u) => u.email === email && u.tenantId === tenantId && u.isActive
  );
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) return null;
  user.lastLoginAt = new Date().toISOString();
  persistUser(user);
  return user;
}

export function changePassword(id: string, oldPassword: string, newPassword: string): boolean {
  const user = users.get(id);
  if (!user) throw new Error('User not found');
  if (!verifyPassword(oldPassword, user.passwordHash, user.passwordSalt)) {
    throw new Error('Current password is incorrect');
  }
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.updatedAt = new Date().toISOString();
  persistUser(user);
  return true;
}

// ── Team management ───────────────────────────────────────────────────────
export function createTeam(input: CreateTeamInput): Team {
  const now = new Date().toISOString();
  const team: Team = {
    id: nextId(),
    name: input.name,
    description: input.description,
    tenantId: input.tenantId,
    memberIds: [],
    createdAt: now,
    updatedAt: now,
  };
  teams.set(team.id, team);
  persistTeam(team);
  return team;
}

export function getTeamById(id: string): Team | undefined {
  return teams.get(id);
}

export function getTeamsByTenant(tenantId: string): Team[] {
  return Array.from(teams.values()).filter((t) => t.tenantId === tenantId);
}

export function addTeamMember(teamId: string, userId: string): Team {
  const team = teams.get(teamId);
  if (!team) throw new Error('Team not found');
  if (!team.memberIds.includes(userId)) {
    team.memberIds.push(userId);
    team.updatedAt = new Date().toISOString();
    persistTeam(team);
  }
  return team;
}

export function removeTeamMember(teamId: string, userId: string): Team {
  const team = teams.get(teamId);
  if (!team) throw new Error('Team not found');
  team.memberIds = team.memberIds.filter((id) => id !== userId);
  team.updatedAt = new Date().toISOString();
  persistTeam(team);
  return team;
}

export function deleteTeam(id: string): boolean {
  const deleted = teams.delete(id);
  if (deleted) deleteFromDb('teams', id);
  return deleted;
}

// ── Invitation system ─────────────────────────────────────────────────────
function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function createInvitation(input: InviteInput, invitedBy: string): Invitation {
  const existing = Array.from(invitations.values()).find(
    (inv) => inv.email === input.email && inv.tenantId === input.tenantId && !inv.acceptedAt
  );
  if (existing && new Date(existing.expiresAt) > new Date()) {
    throw new Error('Active invitation already exists for this email');
  }

  const now = new Date();
  const invitation: Invitation = {
    id: nextId(),
    email: input.email,
    role: input.role,
    teamId: input.teamId,
    tenantId: input.tenantId,
    invitedBy,
    token: generateInviteToken(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    createdAt: now.toISOString(),
  };
  invitations.set(invitation.id, invitation);
  persistInvitation(invitation);
  return invitation;
}

export function getInvitationByToken(token: string): Invitation | undefined {
  return Array.from(invitations.values()).find(
    (inv) => inv.token === token && !inv.acceptedAt && new Date(inv.expiresAt) > new Date()
  );
}

export function acceptInvitation(token: string, userId: string): Invitation {
  const invitation = getInvitationByToken(token);
  if (!invitation) throw new Error('Invalid or expired invitation');
  invitation.acceptedAt = new Date().toISOString();
  // Add to team if specified
  if (invitation.teamId) {
    addTeamMember(invitation.teamId, userId);
  }
  persistInvitation(invitation);
  return invitation;
}

export function getInvitationsByTenant(tenantId: string): Invitation[] {
  return Array.from(invitations.values()).filter((inv) => inv.tenantId === tenantId);
}

export function deleteInvitation(id: string): boolean {
  const deleted = invitations.delete(id);
  if (deleted) deleteFromDb('invitations', id);
  return deleted;
}

export function generateInviteLink(invitation: Invitation, baseUrl: string): string {
  return `${baseUrl}/invite/${invitation.token}`;
}

/** Hook: replace in-memory maps with DB calls */
export const store = { users, teams, invitations };
