import type { DeployTarget, DeployTask, DeployResult, DeployProgress, AgentInstallOptions } from './types';
import { AgentInstaller } from './agent-installer';

type ProgressCallback = (progress: DeployProgress) => void;

export class TaskRunner {
  private tasks = new Map<string, DeployTask>();
  private abortControllers = new Map<string, AbortController>();
  private progressListeners = new Map<string, Set<ProgressCallback>>();

  createTask(targetIds: string[], options: AgentInstallOptions): DeployTask {
    const task: DeployTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      targetIds,
      agentVersion: options.version,
      serverUrl: options.serverUrl,
      serverKey: options.serverKey,
      status: 'pending',
      results: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async runTask(
    taskId: string,
    targets: DeployTarget[],
    options: AgentInstallOptions,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.results = targets.map((t) => ({
      targetId: t.id,
      targetName: t.name,
      status: 'pending' as const,
      message: 'Queued',
      attempt: 0,
      rollbackAvailable: false,
    }));

    const controller = new AbortController();
    this.abortControllers.set(taskId, controller);

    const installer = new AgentInstaller(options);
    const emit = (targetId: string, status: any, message: string, percent: number) => {
      const progress: DeployProgress = {
        taskId,
        targetId,
        status,
        message,
        percent,
        timestamp: new Date().toISOString(),
      };
      onProgress?.(progress);
      this.notifyListeners(taskId, progress);
    };

    const concurrency = 3;
    const queue = [...targets];

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        if (controller.signal.aborted) break;
        const target = queue.shift()!;
        const resultIdx = task.results.findIndex((r) => r.targetId === target.id);
        if (resultIdx === -1) continue;

        let attempt = 0;
        let success = false;

        while (attempt <= task.maxRetries && !success) {
          if (controller.signal.aborted) break;
          attempt++;
          task.results[resultIdx].attempt = attempt;
          task.results[resultIdx].status = 'connecting';
          emit(target.id, 'connecting', `Attempt ${attempt}: Connecting...`, 10);

          const result = await installer.install(target.ssh, (s, m) => {
            const pct = s === 'installing' ? 50 : s === 'verifying' ? 80 : 20;
            emit(target.id, s, m, pct);
          });

          task.results[resultIdx].status = result.status;
          task.results[resultIdx].message = result.message;
          task.results[resultIdx].completedAt = result.completedAt;
          task.results[resultIdx].rollbackAvailable = result.rollbackAvailable;

          success = result.status === 'success';
          if (!success && attempt <= task.maxRetries) {
            emit(target.id, 'connecting', `Retry ${attempt}/${task.maxRetries}...`, 5);
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }

        emit(target.id, task.results[resultIdx].status, task.results[resultIdx].message, 100);
      }
    });

    await Promise.all(workers);
    this.abortControllers.delete(taskId);

    if (controller.signal.aborted) {
      task.status = 'cancelled';
    } else {
      const allSuccess = task.results.every((r) => r.status === 'success');
      task.status = allSuccess ? 'completed' : 'failed';
    }
    task.completedAt = new Date().toISOString();
  }

  cancelTask(taskId: string): boolean {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  getTask(taskId: string): DeployTask | undefined {
    return this.tasks.get(taskId);
  }

  listTasks(): DeployTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  subscribe(taskId: string, cb: ProgressCallback): () => void {
    if (!this.progressListeners.has(taskId)) {
      this.progressListeners.set(taskId, new Set());
    }
    this.progressListeners.get(taskId)!.add(cb);
    return () => this.progressListeners.get(taskId)?.delete(cb);
  }

  private notifyListeners(taskId: string, progress: DeployProgress): void {
    this.progressListeners.get(taskId)?.forEach((cb) => cb(progress));
  }
}

export const taskRunner = new TaskRunner();
