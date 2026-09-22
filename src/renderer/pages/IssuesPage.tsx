import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

function parseJojScore(title: string) {
  const match = title.match(/^JOJ3 Result for (\S+?) by @(\S+?) - Score: (\d+) \/ (\d+)$/);
  if (!match) return null;
  return { homework: match[1], user: match[2], score: parseInt(match[3]), total: parseInt(match[4]) };
}

function scoreClass(score: number, total: number) {
  if (score >= total) return 'perfect';
  if (score >= total * 0.6) return 'pass';
  return 'fail';
}

export default function IssuesPage() {
  const { currentRepo, setError, getRepoInfo, getActiveAccount } = useAppContext();
  const [issues, setIssues] = useState<GiteaIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<GiteaIssue | null>(null);
  const [comments, setComments] = useState<GiteaComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const fetchIssues = useCallback(async () => {
    if (!currentRepo) return;
    const account = getActiveAccount();
    if (!account) { setError('Please add a Gitea account in Settings first.'); return; }
    const info = await getRepoInfo();
    if (!info) { setError('Cannot determine repository owner/name from remote URL.'); return; }

    setLoading(true);
    try {
      const data = await window.electronAPI.gitea.listIssues(
        account.serverUrl, account.token, info.owner, info.repo, 1, filter
      );
      setIssues(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentRepo, filter, getActiveAccount, getRepoInfo, setError]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleSelectIssue = useCallback(async (issue: GiteaIssue) => {
    setSelectedIssue(issue);
    const account = getActiveAccount();
    const info = await getRepoInfo();
    if (!account || !info) return;

    setLoadingComments(true);
    try {
      const data = await window.electronAPI.gitea.getIssueComments(
        account.serverUrl, account.token, info.owner, info.repo, issue.number
      );
      setComments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingComments(false);
    }
  }, [getActiveAccount, getRepoInfo, setError]);

  if (!currentRepo) {
    return <div className="page-empty">Select a repository to view issues.</div>;
  }

  return (
    <div className="issues-page">
      <div className="issues-toolbar">
        <h2>Issues</h2>
        <div className="toolbar-actions">
          <div className="issues-filter">
            {(['all', 'open', 'closed'] as const).map((f) => (
              <button
                key={f}
                className={`btn-small ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetchIssues} title="Refresh">⟳ Refresh</button>
        </div>
      </div>

      <div className="issues-content">
        <div className="issue-list">
          {loading ? (
            <div className="loading">Loading issues...</div>
          ) : issues.length === 0 ? (
            <div className="page-empty">No issues found.</div>
          ) : (
            issues.map((issue) => {
              const joj = parseJojScore(issue.title);
              return (
                <div
                  key={issue.id}
                  className={`issue-item ${selectedIssue?.id === issue.id ? 'selected' : ''}`}
                  onClick={() => handleSelectIssue(issue)}
                >
                  <div className="issue-item-header">
                    <span className={`issue-state ${issue.state}`}>
                      {issue.state === 'open' ? '●' : '◉'}
                    </span>
                    <span className="issue-title">
                      {joj ? `${joj.homework} — ${joj.user}` : issue.title}
                    </span>
                  </div>
                  <div className="issue-meta">
                    {joj && (
                      <span className={`joj-score-badge ${scoreClass(joj.score, joj.total)}`}>
                        {joj.score} / {joj.total}
                      </span>
                    )}
                    <span>#{issue.number}</span>
                    {issue.comments > 0 && <span>💬 {issue.comments}</span>}
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="issue-detail">
          {selectedIssue ? (
            <>
              <h3 className="issue-detail-title">
                <span className={`issue-state ${selectedIssue.state}`}>
                  {selectedIssue.state === 'open' ? '●' : '◉'}
                </span>
                {selectedIssue.title}
              </h3>
              {(() => {
                const joj = parseJojScore(selectedIssue.title);
                if (joj) {
                  return (
                    <div className={`joj-score-card ${scoreClass(joj.score, joj.total)}`}>
                      <span className="joj-score-label">{joj.homework}</span>
                      <span className="joj-score-value">{joj.score} / {joj.total}</span>
                    </div>
                  );
                }
                return null;
              })()}
              {selectedIssue.body && (
                <div className="issue-body">
                  <pre>{selectedIssue.body}</pre>
                </div>
              )}
              <div className="comment-list">
                <h4>Comments ({comments.length})</h4>
                {loadingComments ? (
                  <div className="loading">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="comment-empty">No comments yet.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-header">
                        <strong>{c.user.login}</strong>
                        <span className="comment-date">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <pre className="comment-body">{c.body}</pre>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="diff-placeholder">Select an issue to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
