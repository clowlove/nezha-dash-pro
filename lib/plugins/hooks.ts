// Hook System for NezhaDash Pro Plugins
// Manages hook registration, priority ordering, async execution with timeout

import type { PluginHook, PluginHookName, PluginHookHandler, PluginContext } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;

interface RegisteredHook {
  pluginId: string;
  name: PluginHookName;
  handler: PluginHookHandler;
  priority: number;
}

class HookSystem {
  /** Map from hook name to sorted list of registered hooks */
  private hooks = new Map<PluginHookName, RegisteredHook[]>();
  /** Execution timeout per hook */
  private timeout = DEFAULT_TIMEOUT_MS;

  // --- Registration ---

  /** Register a hook handler. Hooks are sorted by priority (lower = runs first). */
  register(hook: RegisteredHook): void {
    const list = this.hooks.get(hook.name) ?? [];
    // Remove existing hook from same plugin+name to prevent duplicates
    const filtered = list.filter(h => h.pluginId !== hook.pluginId);
    filtered.push(hook);
    // Sort by priority ascending
    filtered.sort((a, b) => a.priority - b.priority);
    this.hooks.set(hook.name, filtered);
  }

  /** Unregister a specific hook by plugin ID and hook name */
  unregister(pluginId: string, name: PluginHookName): void {
    const list = this.hooks.get(name);
    if (!list) return;
    const filtered = list.filter(h => h.pluginId !== pluginId);
    if (filtered.length === 0) {
      this.hooks.delete(name);
    } else {
      this.hooks.set(name, filtered);
    }
  }

  /** Unregister all hooks for a given plugin */
  unregisterAll(pluginId: string): void {
    for (const [name, list] of this.hooks.entries()) {
      const filtered = list.filter(h => h.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.hooks.delete(name);
      } else {
        this.hooks.set(name, filtered);
      }
    }
  }

  // --- Triggering ---

  /**
   * Trigger a hook. Runs all registered handlers in priority order (sequentially).
   * Each handler receives the data and context. Results are collected and returned.
   * If a handler throws, the error is logged and execution continues.
   */
  async trigger(
    name: PluginHookName,
    data: unknown,
    context: PluginContext,
  ): Promise<HookTriggerResult> {
    const list = this.hooks.get(name);
    if (!list || list.length === 0) {
      return { hook: name, results: [], errors: [], duration: 0 };
    }

    const results: HookHandlerResult[] = [];
    const errors: HookHandlerError[] = [];
    const start = Date.now();

    for (const hook of list) {
      try {
        const result = await this.executeWithTimeout(hook, data, context);
        results.push({ pluginId: hook.pluginId, result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ pluginId: hook.pluginId, error: message });
        console.error(`[HookSystem] Error in ${name} (plugin: ${hook.pluginId}):`, message);
      }
    }

    return {
      hook: name,
      results,
      errors,
      duration: Date.now() - start,
    };
  }

  /**
   * Trigger a hook and allow handlers to modify data in a pipeline.
   * Each handler receives the output of the previous handler.
   */
  async triggerPipeline(
    name: PluginHookName,
    initialData: unknown,
    context: PluginContext,
  ): Promise<{ data: unknown; errors: HookHandlerError[] }> {
    const list = this.hooks.get(name);
    if (!list || list.length === 0) {
      return { data: initialData, errors: [] };
    }

    let data = initialData;
    const errors: HookHandlerError[] = [];

    for (const hook of list) {
      try {
        const result = await this.executeWithTimeout(hook, data, context);
        if (result !== undefined) data = result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ pluginId: hook.pluginId, error: message });
      }
    }

    return { data, errors };
  }

  // --- Introspection ---

  /** Get all registered hooks for a given name */
  getHooks(name: PluginHookName): RegisteredHook[] {
    return this.hooks.get(name) ?? [];
  }

  /** Check if any hooks are registered for a given name */
  hasHooks(name: PluginHookName): boolean {
    const list = this.hooks.get(name);
    return !!list && list.length > 0;
  }

  /** Get count of registered hooks */
  count(name?: PluginHookName): number {
    if (name) return this.hooks.get(name)?.length ?? 0;
    let total = 0;
    for (const list of this.hooks.values()) total += list.length;
    return total;
  }

  /** Clear all hooks (for testing) */
  clear(): void {
    this.hooks.clear();
  }

  /** Set the execution timeout */
  setTimeout(ms: number): void {
    this.timeout = ms;
  }

  // --- Internal ---

  private executeWithTimeout(
    hook: RegisteredHook,
    data: unknown,
    context: PluginContext,
  ): Promise<unknown> {
    return Promise.race([
      Promise.resolve(hook.handler(data, context)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Hook timed out after ${this.timeout}ms`)), this.timeout)
      ),
    ]);
  }
}

// --- Types for results ---

export interface HookHandlerResult {
  pluginId: string;
  result: unknown;
}

export interface HookHandlerError {
  pluginId: string;
  error: string;
}

export interface HookTriggerResult {
  hook: PluginHookName;
  results: HookHandlerResult[];
  errors: HookHandlerError[];
  duration: number;
}

/** Singleton hook system instance */
export const hookSystem = new HookSystem();
