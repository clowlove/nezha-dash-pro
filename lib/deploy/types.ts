export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  timeout?: number; // seconds
}

export interface DeployTarget {
  id: string;
  name: string;
  ssh: SSHConfig;
  tags?: string[];
  group?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeployTaskStatus =
  | 'pending'
  | 'connecting'
  | 'installing'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'rolling-back';

export interface DeployTask {
  id: string;
  targetIds: string[];
  agentVersion: string;
  serverUrl: string;
  serverKey?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: DeployResult[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
}

export interface DeployResult {
  targetId: string;
  targetName: string;
  status: DeployTaskStatus;
  message: string;
  output?: string;
  startedAt?: string;
  completedAt?: string;
  attempt: number;
  rollbackAvailable: boolean;
}

export interface DeployProgress {
  taskId: string;
  targetId: string;
  status: DeployTaskStatus;
  message: string;
  percent: number;
  timestamp: string;
}

export interface AgentInstallOptions {
  version: string;
  serverUrl: string;
  serverKey?: string;
  useSystemd?: boolean;
  customArgs?: string[];
}
