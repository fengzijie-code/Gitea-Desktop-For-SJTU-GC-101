import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ReleasesPage() {
  const { currentRepo, setError, getRepoInfo, getActiveAccount } = useAppContext();
  const [releases, setReleases] = useState<GiteaRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tagName, setTagName] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [releaseBody, setReleaseBody] = useState('');
  const [suggestedTag, setSuggestedTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchReleases = useCallback(async () => {
    if (!currentRepo) return;
    const account = getActiveAccount();
    if (!account) { setError('Please add a Gitea account in Settings first.'); return; }
    const info = await getRepoInfo();
    if (!info) { setError('Cannot determine repository owner/name from remote URL.'); return; }

    setLoading(true);
    try {
      const data = await window.electronAPI.gitea.listReleases(
        account.serverUrl, account.token, info.owner, info.repo
      );
      setReleases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentRepo, getActiveAccount, getRepoInfo, setError]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  useEffect(() => {
    if (!currentRepo) return;
    window.electronAPI.git.getLog(currentRepo.path, 1).then((logs: LogEntry[]) => {
      if (logs.length > 0) {
        const match = logs[0].message.match(/^\w+\(([^)]+)\):/);
        if (match) setSuggestedTag(match[1]);
      }
    }).catch(() => {});
  }, [currentRepo]);

  const handleCreate = () => {
    if (!tagName.trim() || !releaseName.trim()) return;
    setShowConfirm(true);
  };

  const doCreateRelease = async () => {
    setShowConfirm(false);
    const account = getActiveAccount();
    const info = await getRepoInfo();
    if (!account || !info) return;

    setCreating(true);
    try {
      await window.electronAPI.gitea.createRelease(
        account.serverUrl, account.token, info.owner, info.repo,
        { tag_name: tagName.trim(), name: releaseName.trim(), body: releaseBody.trim() }
      );
      setTagName('');
      setReleaseName('');
      setReleaseBody('');
      setShowCreate(false);
      await fetchReleases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!currentRepo) {
    return <div className="page-empty">Select a repository to view releases.</div>;
  }

  return (
    <div className="releases-page">
      <div className="releases-toolbar">
        <h2>Releases</h2>
        <div className="toolbar-actions">
          <button onClick={fetchReleases} title="Refresh">⟳ Refresh</button>
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ New Release'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="create-release-form">
          <div className="form-group">
            <label>Tag Name</label>
            <input
              type="text"
              placeholder="e.g. hw1"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
            />
            {suggestedTag && tagName !== suggestedTag && (
              <div className="tag-suggestion">
                Suggested from latest commit: <button onClick={() => { setTagName(suggestedTag); if (!releaseName) setReleaseName(suggestedTag); }}>{suggestedTag}</button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Release Title</label>
            <input
              type="text"
              placeholder="Release title"
              value={releaseName}
              onChange={(e) => setReleaseName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              placeholder="Release description..."
              value={releaseBody}
              onChange={(e) => setReleaseBody(e.target.value)}
              rows={3}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !tagName.trim() || !releaseName.trim()}
          >
            {creating ? 'Creating...' : 'Publish Release'}
          </button>
        </div>
      )}

      <div className="release-list">
        {loading ? (
          <div className="loading">Loading releases...</div>
        ) : releases.length === 0 ? (
          <div className="page-empty">No releases yet.</div>
        ) : (
          releases.map((r) => (
            <div key={r.id} className="release-item">
              <div className="release-header">
                <span className="release-tag">{r.tag_name}</span>
                <span className="release-name">{r.name}</span>
              </div>
              {r.body && <div className="release-body">{r.body.slice(0, 200)}</div>}
              <div className="release-meta">
                {r.author?.login && <span>{r.author.login}</span>}
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3>Confirm Release</h3>
            <p>
              This operation is <strong>irreversible</strong>. Each homework can only be released once.
              Are you sure you want to create release "<strong>{tagName}</strong>"?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-primary" onClick={doCreateRelease}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
