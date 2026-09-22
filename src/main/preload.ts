import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  git: {
    clone: (url: string, targetPath: string) =>
      ipcRenderer.invoke('git:clone', url, targetPath),
    getStatus: (repoPath: string) =>
      ipcRenderer.invoke('git:status', repoPath),
    stage: (repoPath: string, files: string[]) =>
      ipcRenderer.invoke('git:stage', repoPath, files),
    unstage: (repoPath: string, files: string[]) =>
      ipcRenderer.invoke('git:unstage', repoPath, files),
    commit: (repoPath: string, message: string, options?: { allowEmpty?: boolean }) =>
      ipcRenderer.invoke('git:commit', repoPath, message, options),
    push: (repoPath: string, remote?: string, branch?: string) =>
      ipcRenderer.invoke('git:push', repoPath, remote, branch),
    pull: (repoPath: string, remote?: string, branch?: string) =>
      ipcRenderer.invoke('git:pull', repoPath, remote, branch),
    fetch: (repoPath: string) =>
      ipcRenderer.invoke('git:fetch', repoPath),
    getBranches: (repoPath: string) =>
      ipcRenderer.invoke('git:branches', repoPath),
    getCurrentBranch: (repoPath: string) =>
      ipcRenderer.invoke('git:current-branch', repoPath),
    checkout: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:checkout', repoPath, branch),
    createBranch: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:create-branch', repoPath, branch),
    deleteBranch: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:delete-branch', repoPath, branch),
    getLog: (repoPath: string, maxCount?: number) =>
      ipcRenderer.invoke('git:log', repoPath, maxCount),
    getDiff: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:diff', repoPath, filePath),
    getDiffStaged: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:diff-staged', repoPath, filePath),
    getRemotes: (repoPath: string) =>
      ipcRenderer.invoke('git:remotes', repoPath),
    init: (options: {
      name: string;
      description: string;
      localPath: string;
      gitignoreTemplate: string;
      licenseTemplate: string;
      authorName?: string;
    }) =>
      ipcRenderer.invoke('git:init', options),
    addRemote: (repoPath: string, name: string, url: string) =>
      ipcRenderer.invoke('git:add-remote', repoPath, name, url),
    getInitTemplates: () =>
      ipcRenderer.invoke('git:get-init-templates'),
    getUserName: () =>
      ipcRenderer.invoke('git:get-user-name'),
    checkGit: () =>
      ipcRenderer.invoke('git:check'),
    getConfig: (repoPath: string) =>
      ipcRenderer.invoke('git:get-config', repoPath),
    setConfig: (repoPath: string, name: string, email: string) =>
      ipcRenderer.invoke('git:set-config', repoPath, name, email),
  },
  gitea: {
    testConnection: (serverUrl: string, token: string) =>
      ipcRenderer.invoke('gitea:test-connection', serverUrl, token),
    listRepos: (serverUrl: string, token: string) =>
      ipcRenderer.invoke('gitea:list-repos', serverUrl, token),
    getRepo: (serverUrl: string, token: string, owner: string, repo: string) =>
      ipcRenderer.invoke('gitea:get-repo', serverUrl, token, owner, repo),
    createRepo: (serverUrl: string, token: string, options: any) =>
      ipcRenderer.invoke('gitea:create-repo', serverUrl, token, options),
    listIssues: (serverUrl: string, token: string, owner: string, repo: string, page?: number, state?: string) =>
      ipcRenderer.invoke('gitea:list-issues', serverUrl, token, owner, repo, page, state),
    getIssueComments: (serverUrl: string, token: string, owner: string, repo: string, index: number) =>
      ipcRenderer.invoke('gitea:get-issue-comments', serverUrl, token, owner, repo, index),
    listReleases: (serverUrl: string, token: string, owner: string, repo: string) =>
      ipcRenderer.invoke('gitea:list-releases', serverUrl, token, owner, repo),
    createRelease: (serverUrl: string, token: string, owner: string, repo: string,
      options: { tag_name: string; name: string; body: string }) =>
      ipcRenderer.invoke('gitea:create-release', serverUrl, token, owner, repo, options),
  },
  file: {
    selectDirectory: (defaultPath?: string) => ipcRenderer.invoke('file:select-directory', defaultPath),
    readConfig: () => ipcRenderer.invoke('file:read-config'),
    writeConfig: (config: any) => ipcRenderer.invoke('file:write-config', config),
  },
  wsl: {
    listDistros: () => ipcRenderer.invoke('wsl:list-distros'),
  },
  shell: {
    openInVSCode: (repoPath: string) =>
      ipcRenderer.invoke('shell:open-in-vscode', repoPath),
    openInExplorer: (repoPath: string) =>
      ipcRenderer.invoke('shell:open-in-explorer', repoPath),
  },
  app: {
    reloadHome: () => ipcRenderer.invoke('app:reload-home'),
  },
});
