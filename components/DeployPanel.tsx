'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DeployTarget, DeployTask, DeployProgress } from '@/lib/deploy/types';

interface Props {
  className?: string;
}

export function DeployPanel({ className }: Props) {
  const [targets, setTargets] = useState<DeployTarget[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Map<string, DeployProgress>>(new Map());
  const [version, setVersion] = useState('latest');
  const [serverUrl, setServerUrl] = useState('');
  const [serverKey, setServerKey] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchTargets = useCallback(async () => {
    const res = await fetch('/api/deploy/targets');
    const data = await res.json();
    setTargets(data.targets || []);
  }, []);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/deploy');
    const data = await res.json();
    setTasks(data.tasks || []);
  }, []);

  useEffect(() => {
    fetchTargets();
    fetchTasks();
  }, [fetchTargets, fetchTasks]);

  // Poll active task progress
  useEffect(() => {
    if (!activeTaskId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/deploy?id=${activeTaskId}`);
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => prev.map((t) => (t.id === activeTaskId ? data.task : t)));
        if (['completed', 'failed', 'cancelled'].includes(data.task.status)) {
          setDeploying(false);
          setActiveTaskId(null);
          clearInterval(interval);
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === targets.length) setSelected(new Set());
    else setSelected(new Set(targets.map((t) => t.id)));
  };

  const handleDeploy = async () => {
    if (!selected.size || !serverUrl) return;
    setDeploying(true);
    setProgress(new Map());

    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetIds: Array.from(selected),
        version,
        serverUrl,
        serverKey: serverKey || undefined,
      }),
    });

    const data = await res.json();
    if (data.task) {
      setActiveTaskId(data.task.id);
      fetchTasks();
    } else {
      setDeploying(false);
      alert(data.error || 'Deploy failed');
    }
  };

  const handleCancel = async (taskId: string) => {
    await fetch(`/api/deploy?id=${taskId}`, { method: 'DELETE' });
    setDeploying(false);
    setActiveTaskId(null);
    fetchTasks();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#94a3b8';
      case 'running': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getTargetResult = (task: DeployTask, targetId: string) =>
    task.results?.find((r) => r.targetId === targetId);

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <div className={className} style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Deploy Nezha Agent</h2>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#6366f1')}>
          {showForm ? 'Close' : '+ Add Target'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <DeployTargetFormInline onSave={() => { fetchTargets(); setShowForm(false); }} />
        </div>
      )}

      {/* Config */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label style={labelStyle}>
            Server URL
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://nezha.example.com" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Agent Version
            <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="latest" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Server Key
            <input value={serverKey} onChange={(e) => setServerKey(e.target.value)} placeholder="optional" style={inputStyle} />
          </label>
        </div>
      </div>

      {/* Target List */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.size === targets.length && targets.length > 0} onChange={selectAll} /> Select All ({targets.length})
          </label>
          <span style={{ color: '#64748b', fontSize: 14 }}>{selected.size} selected</span>
        </div>
        {targets.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No targets. Add one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {targets.map((target) => {
              const result = activeTask ? getTargetResult(activeTask, target.id) : undefined;
              return (
                <div key={target.id} style={rowStyle}>
                  <input type="checkbox" checked={selected.has(target.id)} onChange={() => toggleSelect(target.id)} />
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <strong>{target.name}</strong>
                    <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 13 }}>{target.ssh.host}:{target.ssh.port}</span>
                  </div>
                  {result && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 250 }}>
                      <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 8 }}>
                        <div style={{
                          width: result.status === 'success' ? '100%' : result.status === 'failed' ? '100%' : '50%',
                          height: '100%',
                          borderRadius: 4,
                          background: getStatusColor(result.status),
                          transition: 'width 0.3s',
                        }} />
                      </div>
                      <span style={{ fontSize: 12, color: getStatusColor(result.status), minWidth: 80 }}>{result.status}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          onClick={handleDeploy}
          disabled={deploying || !selected.size || !serverUrl}
          style={btnStyle(deploying || !selected.size || !serverUrl ? '#94a3b8' : '#22c55e')}
        >
          {deploying ? 'Deploying...' : `Deploy to ${selected.size} server${selected.size !== 1 ? 's' : ''}`}
        </button>
        {deploying && activeTaskId && (
          <button onClick={() => handleCancel(activeTaskId)} style={btnStyle('#ef4444')}>
            Cancel
          </button>
        )}
        <button onClick={() => { fetchTargets(); fetchTasks(); }} style={btnStyle('#64748b')}>Refresh</button>
      </div>

      {/* Task History */}
      {tasks.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <h3 style={{ marginBottom: 8, fontSize: 16 }}>Task History</h3>
          {tasks.slice(0, 10).map((task) => (
            <div key={task.id} style={{ ...rowStyle, justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>
                {task.agentVersion} → {task.targetIds.length} targets
              </span>
              <span style={{ fontSize: 13, color: getStatusColor(task.status), fontWeight: 600 }}>{task.status}</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(task.createdAt).toLocaleString()}</span>
              {task.status === 'running' && (
                <button onClick={() => handleCancel(task.id)} style={{ ...btnStyle('#ef4444'), padding: '2px 8px', fontSize: 12 }}>Cancel</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeployTargetFormInline({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('root');
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/deploy/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        ssh: { host, port: Number(port), username, authMethod, password: password || undefined, privateKey: privateKey || undefined },
      }),
    });
    setSaving(false);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, alignItems: 'end' }}>
      <label style={labelStyle}>Name<input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} /></label>
      <label style={labelStyle}>Host<input value={host} onChange={(e) => setHost(e.target.value)} required style={inputStyle} /></label>
      <label style={labelStyle}>Port<input value={port} onChange={(e) => setPort(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>User<input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} /></label>
      <label style={labelStyle}>
        Auth
        <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value as any)} style={inputStyle}>
          <option value="password">Password</option>
          <option value="key">Private Key</option>
        </select>
      </label>
      {authMethod === 'password' ? (
        <label style={labelStyle}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
      ) : (
        <label style={labelStyle}>Private Key<textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} style={{ ...inputStyle, minHeight: 40 }} /></label>
      )}
      <button type="submit" disabled={saving} style={btnStyle('#22c55e')}>{saving ? 'Saving...' : 'Add'}</button>
    </form>
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
});

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 8px',
  borderRadius: 4,
  background: '#f8fafc',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 13,
  color: '#475569',
  gap: 2,
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 14,
  outline: 'none',
};

export default DeployPanel;
