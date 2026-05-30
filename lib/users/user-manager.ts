import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import {
  User, CreateUserInput, UpdateUserInput,
  Team, CreateTeamInput,
  Invitation, InviteInput, Role,
} from './types';

// ── In-memory stores (replace with DB queries in production) ──────────────
const users: Map<string, User> = new Map();
const teams: Map<string, Team> = new Map();
const invitations: Map<string, Invitation> = new Map();
let idCounter = 0;

function nextId(): string {
  return `id_${++idCounter}_${Date.now()}`;
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
  return user;
}

export function deleteUser(id: string): boolean {
  return users.delete(id);
}

export function authenticateUser(email: string, password: string, tenantId: string): User | null {
  const user = Array.from(users.values()).find(
    (u) => u.email === email && u.tenantId === tenantId && u.isActive
  );
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) return null;
  user.lastLoginAt = new Date().toISOString();
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
  }
  return team;
}

export function removeTeamMember(teamId: string, userId: string): Team {
  const team = teams.get(teamId);
  if (!team) throw new Error('Team not found');
  team.memberIds = team.memberIds.filter((id) => id !== userId);
  team.updatedAt = new Date().toISOString();
  return team;
}

export function deleteTeam(id: string): boolean {
  return teams.delete(id);
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
  return invitation;
}

export function getInvitationsByTenant(tenantId: string): Invitation[] {
  return Array.from(invitations.values()).filter((inv) => inv.tenantId === tenantId);
}

export function deleteInvitation(id: string): boolean {
  return invitations.delete(id);
}

export function generateInviteLink(invitation: Invitation, baseUrl: string): string {
  return `${baseUrl}/invite/${invitation.token}`;
}

/** Hook: replace in-memory maps with DB calls */
export const store = { users, teams, invitations };
