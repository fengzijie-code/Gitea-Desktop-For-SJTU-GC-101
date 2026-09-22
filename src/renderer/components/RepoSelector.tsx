import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function RepoSelector() {
  const { config, currentRepo, setCurrentRepo, addRepository, removeRepository } = useAppContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWsl, setShowWsl] = useState(false);
  const [wslLoading, setWslLoading] = useState(false);
  const [wslInfo, setWslInfo] = useState<WslInfo | null>(null);
  const navigate = useNavigate();

  const openRepo = async (dir: string) => {
    const name = dir.split(/[\\/]/).filter(Boolean).pop() || dir;
    const repo: SavedRepository = {
      path: dir,
      name,
      lastOpened: new Date().toISOString(),
    };
    await addRepository(repo);
    setCurrentRepo(repo);
    setShowDropdown(false);
    setShowWsl(false);
    navigate('/changes');
  };

  const handleOpen = async () => {
    const dir = await window.electronAPI.file.selectDirectory();
    if (!dir) return;
    await openRepo(dir);
  };

  const handleToggleWsl = async () => {
    const next = !showWsl;
    setShowWsl(next);
    if (!next || wslInfo) return;
    setWslLoading(true);
    try {
      setWslInfo(await window.electronAPI.wsl.listDistros());
    } finally {
      setWslLoading(false);
    }
  };

  const handlePickWsl = async (distro: WslDistro) => {
    // Windows 文件夹对话框的导航栏不列 WSL，用 defaultPath 直接把对话框开在该发行版里
    const dir = await window.electronAPI.file.selectDirectory(distro.home || distro.root);
    if (!dir) return;
    await openRepo(dir);
  };

  const handleClone = () => {
    setShowDropdown(false);
    window.electronAPI.app.reloadHome();
  };

  const handleSelect = (repo: SavedRepository) => {
    setCurrentRepo(repo);
    setShowDropdown(false);
    navigate('/changes');
  };

  const handleRemove = async (repoPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeRepository(repoPath);
  };

  return (
    <div className="repo-selector">
      <button
        className="repo-selector-btn"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="repo-name">
          {currentRepo ? currentRepo.name : 'Select Repository'}
        </span>
        <span className="dropdown-arrow">▾</span>
      </button>

      {showDropdown && (
        <div className="repo-dropdown">
          <div className="repo-dropdown-actions">
            <button onClick={handleOpen}>Open Local Repository</button>
            <button onClick={handleToggleWsl}>Open WSL Repository</button>
            <button onClick={handleClone}>Clone Repository</button>
          </div>

          {showWsl && (
            <div className="wsl-distro-list">
              <div className="repo-dropdown-label">WSL 发行版</div>
              {wslLoading ? (
                <div className="wsl-hint">检测中…</div>
              ) : !wslInfo || !wslInfo.available || wslInfo.distros.length === 0 ? (
                <div className="wsl-hint">{wslInfo?.error || '未检测到 WSL 发行版'}</div>
              ) : (
                wslInfo.distros.map((d) => (
                  <button key={d.name} className="wsl-distro-item" onClick={() => handlePickWsl(d)}>
                    <span className="wsl-distro-name">{d.name}</span>
                    <span className="wsl-distro-path">{d.home || d.root}</span>
                  </button>
                ))
              )}
            </div>
          )}
          {config.repositories.length > 0 && (
            <div className="repo-dropdown-list">
              <div className="repo-dropdown-label">Recent Repositories</div>
              {config.repositories.map((repo) => (
                <div
                  key={repo.path}
                  className={`repo-dropdown-item ${currentRepo?.path === repo.path ? 'active' : ''}`}
                  onClick={() => handleSelect(repo)}
                >
                  <div className="repo-dropdown-item-info">
                    <span className="repo-item-name">{repo.name}</span>
                    <span className="repo-item-path">{repo.path}</span>
                  </div>
                  <button
                    className="btn-icon repo-remove-btn"
                    onClick={(e) => handleRemove(repo.path, e)}
                    title="Remove from list"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
