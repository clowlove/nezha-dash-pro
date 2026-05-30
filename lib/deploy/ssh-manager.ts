import { exec, type ChildProcess } from 'child_process';
import { writeFile, unlink, chmod, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SSHConfig } from './types';

export interface SSHResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface PoolSlot {
  id: string;
  busy: boolean;
}

export class SSHManager {
  private concurrency: number;
  private pool: PoolSlot[];
  private waitQueue: Array<(slot: PoolSlot) => void> = [];
  private tempFiles: string[] = [];

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
    this.pool = Array.from({ length: concurrency }, (_, i) => ({
      id: `slot-${i}`,
      busy: false,
    }));
  }

  private async acquire(): Promise<PoolSlot> {
    const free = this.pool.find((s) => !s.busy);
    if (free) {
      free.busy = true;
      return free;
    }
    return new Promise<PoolSlot>((resolve) => {
      this.waitQueue.push((slot) => {
        slot.busy = true;
        resolve(slot);
      });
    });
  }

  private release(slot: PoolSlot): void {
    slot.busy = false;
    const next = this.waitQueue.shift();
    if (next) next(slot);
  }

  private async buildSSHArgs(config: SSHConfig, command: string): Promise<string[]> {
    const args: string[] = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'ConnectTimeout=' + (config.timeout || 10),
      '-o', 'BatchMode=yes',
      '-p', String(config.port),
    ];

    if (config.authMethod === 'key' && config.privateKey) {
      const keyPath = await this.writeTempFile(config.privateKey, 'id_key');
      await chmod(keyPath, 0o600);
      args.push('-i', keyPath);
    }

    args.push(`${config.username}@${config.host}`, command);
    return args;
  }

  private async writeTempFile(content: string, prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'ssh-'));
    const path = join(dir, `${prefix}_${Date.now()}`);
    await writeFile(path, content, { mode: 0o600 });
    this.tempFiles.push(path);
    return path;
  }

  async exec(config: SSHConfig, command: string, timeoutMs = 60000): Promise<SSHResult> {
    const slot = await this.acquire();
    try {
      const args = await this.buildSSHArgs(config, command);
      const sshCmd = config.authMethod === 'password' && config.password
        ? `sshpass -p ${JSON.stringify(config.password)} ssh ${args.map((a) => JSON.stringify(a)).join(' ')}`
        : `ssh ${args.map((a) => JSON.stringify(a)).join(' ')}`;

      return await new Promise<SSHResult>((resolve) => {
        const proc = exec(sshCmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
          resolve({
            success: !err,
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: err ? (err as any).code || 1 : 0,
          });
        });
      });
    } finally {
      this.release(slot);
    }
  }

  async execAll(
    tasks: Array<{ config: SSHConfig; command: string }>,
    timeoutMs?: number,
  ): Promise<SSHResult[]> {
    return Promise.all(tasks.map(({ config, command }) => this.exec(config, command, timeoutMs)));
  }

  async testConnection(config: SSHConfig): Promise<SSHResult> {
    return this.exec(config, 'echo "ok"', 10000);
  }

  async cleanup(): Promise<void> {
    for (const f of this.tempFiles) {
      await unlink(f).catch(() => {});
    }
    this.tempFiles = [];
  }

  getPoolStatus(): { total: number; busy: number; free: number; waiting: number } {
    const busy = this.pool.filter((s) => s.busy).length;
    return {
      total: this.concurrency,
      busy,
      free: this.concurrency - busy,
      waiting: this.waitQueue.length,
    };
  }
}

export const sshManager = new SSHManager(5);
