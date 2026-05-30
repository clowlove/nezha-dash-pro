'use client';

import React, { useState } from 'react';
import type { DeployTarget, SSHConfig } from '@/lib/deploy/types';

interface Props {
  target?: DeployTarget;
  onSave: (target: DeployTarget) => void;
  onCancel?: () => void;
}

export function DeployTargetForm({ target, onSave, onCancel }: Props) {
  const [name, setName] = useState(target?.name || '');
  const [host, setHost] = useState(target?.ssh.host || '');
  const [port, setPort] = useState(String(target?.ssh.port || 22));
  const [username, setUsername] = useState(target?.ssh.username || 'root');
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>(target?.ssh.authMethod || 'password');
  const [password, setPassword] = useState(target?.ssh.password || '');
  const [privateKey, setPrivateKey] = useState(target?.ssh.privateKey || '');
  const [group, setGroup] = useState(target?.group || '');
  const [tags, setTags] = useState(target?.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const ssh: SSHConfig = {
      host,
      port: Number(port),
      username,
      authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKey: authMethod === 'key' ? privateKey : undefined,
    };

    const payload = {
      name,
      ssh,
      group: group || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };

    try {
      const url = target ? `/api/deploy/targets?id=${target.id}` : '/api/deploy/targets';
      const method = target ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSave(data.target);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{target ? 'Edit Target' : 'Add Deploy Target'}</h3>

      {error && <div style={{ color: '#ef4444', fontSize: 13, background: '#fef2f2', padding: 8, borderRadius: 4 }}>{error}</div>}

      <label style={labelStyle}>
        Name *
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="prod-web-01" style={inputStyle} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <label style={labelStyle}>
          Host *
          <input value={host} onChange={(e) => setHost(e.target.value)} required placeholder="192.168.1.100" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Port
          <input value={port} onChange={(e) => setPort(e.target.value)} type="number" style={inputStyle} />
        </label>
      </div>

      <label style={labelStyle}>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="root" style={inputStyle} />
      </label>

      <label style={labelStyle}>
        Auth Method
        <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value as any)} style={inputStyle}>
          <option value="password">Password (sshpass)</option>
          <option value="key">Private Key</option>
        </select>
      </label>

      {authMethod === 'password' ? (
        <label style={labelStyle}>
          Password *
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        </label>
      ) : (
        <label style={labelStyle}>
          Private Key *
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            required
            rows={5}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
          />
        </label>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
        <label style={labelStyle}>
          Group
          <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="production" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Tags (comma-separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="web, us-east" style={inputStyle} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" disabled={saving} style={btnStyle(saving ? '#94a3b8' : '#22c55e')}>
          {saving ? 'Saving...' : target ? 'Update' : 'Add Target'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={btnStyle('#64748b')}>Cancel</button>
        )}
      </div>
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
  padding: '8px 10px',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
};

export default DeployTargetForm;
