import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_SCOPES } from '../components/CommitForm';

export default function SettingsPage() {
  const { config, addAccount, removeAccount, updateConfig, currentRepo } = useAppContext();
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [gitName, setGitName] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configResult, setConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  const [newScope, setNewScope] = useState('');
  const scopes = config.customScopes && config.customScopes.length > 0 ? config.customScopes : DEFAULT_SCOPES;

  const handleAddScope = async () => {
    const trimmed = newScope.trim();
    if (!trimmed || scopes.includes(trimmed)) return;
    await updateConfig({ ...config, customScopes: [...scopes, trimmed] });
    setNewScope('');
  };

  const handleRemoveScope = async (scope: string) => {
    const updated = scopes.filter((s) => s !== scope);
    await updateConfig({ ...config, customScopes: updated });
  };

  const handleResetScopes = async () => {
    await updateConfig({ ...config, customScopes: undefined });
  };

  useEffect(() => {
    if (!currentRepo) return;
    window.electronAPI.git.getConfig(currentRepo.path).then(({ name, email }) => {
      setGitName(name);
      setGitEmail(email);
    });
  }, [currentRepo]);

  const handleSaveConfig = async () => {
    if (!currentRepo) return;
    setSavingConfig(true);
    setConfigResult(null);
    try {
      await window.electronAPI.git.setConfig(currentRepo.path, gitName.trim(), gitEmail.trim());
      setConfigResult({ success: true, message: 'Git identity saved successfully' });
    } catch (err: any) {
      setConfigResult({ success: false, message: err.message });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTest = async () => {
    if (!serverUrl.trim() || !token.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.gitea.testConnection(
        serverUrl.trim(),
        token.trim()
      );
      if (result.success) {
        setTestResult({ success: true, message: `Connected as ${result.user.login}` });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleAdd = async () => {
    if (!serverUrl.trim() || !token.trim()) return;
    setTesting(true);
    try {
      const result = await window.electronAPI.gitea.testConnection(
        serverUrl.trim(),
        token.trim()
      );
      if (result.success) {
        await addAccount({
          serverUrl: serverUrl.trim(),
          token: token.trim(),
          username: result.user.login,
          avatarUrl: result.user.avatar_url,
        });
        setServerUrl('');
        setToken('');
        setTestResult(null);
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      {currentRepo && (
        <section className="settings-section">
          <h3>Git Identity</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Configure user.name and user.email for this repository.
          </p>
          <div className="form-group">
            <label>user.name</label>
            <input
              type="text"
              placeholder="Your Name"
              value={gitName}
              onChange={(e) => setGitName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>user.email</label>
            <input
              type="text"
              placeholder="jAccount@sjtu.edu.cn"
              value={gitEmail}
              onChange={(e) => setGitEmail(e.target.value)}
            />
          </div>

          {configResult && (
            <div className={`test-result ${configResult.success ? 'success' : 'error'}`}>
              {configResult.message}
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleSaveConfig}
              disabled={savingConfig || !gitName.trim() || !gitEmail.trim()}
            >
              {savingConfig ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>
      )}

      <section className="settings-section">
        <h3>Commit Scopes</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          自定义 conventional commit 中的 scope 列表。
        </p>

        <div className="scope-list">
          {scopes.map((s) => (
            <span key={s} className="scope-tag">
              {s}
              <button
                className="scope-tag-remove"
                onClick={() => handleRemoveScope(s)}
                title="Remove"
              >&times;</button>
            </span>
          ))}
        </div>

        <div className="scope-add-form">
          <input
            type="text"
            placeholder="新 scope 名称"
            value={newScope}
            onChange={(e) => setNewScope(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddScope(); }}
          />
          <button
            className="btn-primary"
            onClick={handleAddScope}
            disabled={!newScope.trim() || scopes.includes(newScope.trim())}
          >
            添加
          </button>
          {config.customScopes && (
            <button
              className="btn-secondary"
              onClick={handleResetScopes}
            >
              恢复默认
            </button>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>Gitea Accounts</h3>

        {config.accounts.length > 0 && (
          <div className="account-list">
            {config.accounts.map((account) => (
              <div key={account.serverUrl} className="account-item">
                <div className="account-info">
                  {account.avatarUrl && (
                    <img className="account-avatar" src={account.avatarUrl} alt="" />
                  )}
                  <div>
                    <div className="account-username">{account.username}</div>
                    <div className="account-server">{account.serverUrl}</div>
                  </div>
                </div>
                <button
                  className="btn-small btn-danger"
                  onClick={() => removeAccount(account.serverUrl)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="add-account-form">
          <h4>Add Account</h4>
          <div className="form-group">
            <label>Server URL</label>
            <input
              type="text"
              placeholder="https://your-gitea-instance.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Access Token</label>
            <input
              type="password"
              placeholder="Your Gitea personal access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.message}
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn-secondary"
              onClick={handleTest}
              disabled={testing || !serverUrl.trim() || !token.trim()}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={testing || !serverUrl.trim() || !token.trim()}
            >
              Add Account
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>About</h3>
        <p>Gitea Desktop v1.4.0</p>
        <p>A desktop client for Gitea, inspired by GitHub Desktop.</p>
      </section>
    </div>
  );
}
