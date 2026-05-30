import type { SSHConfig, AgentInstallOptions, DeployResult, DeployTaskStatus } from './types';
import { sshManager } from './ssh-manager';

const DEFAULT_SERVER_URL = 'https://nezha.example.com';
const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/naiba/nezha/master/script/install.sh';

export class AgentInstaller {
  private options: AgentInstallOptions;

  constructor(options: AgentInstallOptions) {
    this.options = options;
  }

  generateInstallCommand(): string {
    const { version, serverUrl, serverKey, useSystemd = true, customArgs = [] } = this.options;

    const env = [
      `NZ_SERVER="${serverUrl}"`,
      serverKey ? `NZ_SERVER_KEY="${serverKey}"` : '',
      `NZ_AGENT_VERSION="${version}"`,
    ]
      .filter(Boolean)
      .join(' ');

    const install = `curl -sL ${INSTALL_SCRIPT_URL} | ${env} bash -s -- --install_agent`;

    const extras = customArgs.length > 0 ? ` ${customArgs.join(' ')}` : '';

    return install + extras;
  }

  generateUninstallCommand(): string {
    return 'systemctl stop nezha-agent 2>/dev/null; systemctl disable nezha-agent 2>/dev/null; rm -f /etc/systemd/system/nezha-agent.service; rm -rf /opt/nezha/agent; systemctl daemon-reload';
  }

  generateVerifyCommand(): string {
    return 'systemctl is-active nezha-agent 2>/dev/null && nezha-agent --version 2>/dev/null || echo "NOT_RUNNING"';
  }

  generateRollbackCommand(previousVersion: string): string {
    return [
      this.generateUninstallCommand(),
      `curl -sL ${INSTALL_SCRIPT_URL} | NZ_SERVER="${this.options.serverUrl}" NZ_SERVER_KEY="${this.options.serverKey || ''}" NZ_AGENT_VERSION="${previousVersion}" bash -s -- --install_agent`,
    ].join(' && ');
  }

  async install(config: SSHConfig, onProgress?: (status: DeployTaskStatus, msg: string) => void): Promise<DeployResult> {
    const targetName = `${config.username}@${config.host}:${config.port}`;
    const startedAt = new Date().toISOString();

    onProgress?.('connecting', `Connecting to ${targetName}...`);
    const test = await sshManager.testConnection(config);
    if (!test.success) {
      return this.makeResult('', targetName, 'failed', `Connection failed: ${test.stderr}`, startedAt);
    }

    onProgress?.('installing', `Installing agent v${this.options.version}...`);
    const cmd = this.generateInstallCommand();
    const result = await sshManager.exec(config, cmd, 120000);

    if (!result.success) {
      return this.makeResult('', targetName, 'failed', `Install failed: ${result.stderr || result.stdout}`, startedAt);
    }

    onProgress?.('verifying', 'Verifying installation...');
    const verify = await sshManager.exec(config, this.generateVerifyCommand(), 15000);
    if (!verify.success || verify.stdout.trim().includes('NOT_RUNNING')) {
      return this.makeResult('', targetName, 'failed', `Verify failed: ${verify.stdout} ${verify.stderr}`, startedAt, true);
    }

    return this.makeResult('', targetName, 'success', `Agent v${this.options.version} installed. ${verify.stdout.trim()}`, startedAt);
  }

  async rollback(config: SSHConfig, previousVersion: string): Promise<DeployResult> {
    const targetName = `${config.username}@${config.host}:${config.port}`;
    const startedAt = new Date().toISOString();
    const result = await sshManager.exec(config, this.generateRollbackCommand(previousVersion), 120000);
    return this.makeResult(
      '',
      targetName,
      result.success ? 'success' : 'failed',
      result.success ? `Rolled back to v${previousVersion}` : `Rollback failed: ${result.stderr}`,
      startedAt,
    );
  }

  async uninstall(config: SSHConfig): Promise<DeployResult> {
    const targetName = `${config.username}@${config.host}:${config.port}`;
    const startedAt = new Date().toISOString();
    const result = await sshManager.exec(config, this.generateUninstallCommand(), 30000);
    return this.makeResult(
      '',
      targetName,
      result.success ? 'success' : 'failed',
      result.success ? 'Agent uninstalled' : `Uninstall failed: ${result.stderr}`,
      startedAt,
    );
  }

  private makeResult(
    targetId: string,
    targetName: string,
    status: DeployTaskStatus,
    message: string,
    startedAt: string,
    rollbackAvailable = false,
  ): DeployResult {
    return {
      targetId,
      targetName,
      status,
      message,
      startedAt,
      completedAt: new Date().toISOString(),
      attempt: 1,
      rollbackAvailable,
    };
  }
}

export function createInstaller(options: AgentInstallOptions): AgentInstaller {
  return new AgentInstaller(options);
}
