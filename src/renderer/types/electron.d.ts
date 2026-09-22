interface InitRepoOptions {
  name: string;
  description: string;
  localPath: string;
  gitignoreTemplate: string;
  licenseTemplate: string;
  authorName?: string;
}

interface GitAPI {
  clone(url: string, targetPath: string): Promise<{ success: boolean }>;
  getStatus(repoPath: string): Promise<GitStatus>;
  stage(repoPath: string, files: string[]): Promise<{ success: boolean }>;
  unstage(repoPath: string, files: string[]): Promise<{ success: boolean }>;
  commit(repoPath: string, message: string, options?: { allowEmpty?: boolean }): Promise<{ success: boolean; summary: any }>;
  push(repoPath: string, remote?: string, branch?: string): Promise<{ success: boolean }>;
  pull(repoPath: string, remote?: string, branch?: string): Promise<{ success: boolean; summary: any }>;
  fetch(repoPath: string): Promise<{ success: boolean }>;
  getBranches(repoPath: string): Promise<BranchInfo>;
  getCurrentBranch(repoPath: string): Promise<string>;
  checkout(repoPath: string, branch: string): Promise<{ success: boolean }>;
  createBranch(repoPath: string, branch: string): Promise<{ success: boolean }>;
  deleteBranch(repoPath: string, branch: string): Promise<{ success: boolean }>;
  getLog(repoPath: string, maxCount?: number): Promise<LogEntry[]>;
  getDiff(repoPath: string, filePath?: string): Promise<string>;
  getDiffStaged(repoPath: string, filePath?: string): Promise<string>;
  getRemotes(repoPath: string): Promise<RemoteInfo[]>;
  init(options: InitRepoOptions): Promise<{ success: boolean; repoPath: string }>;
  addRemote(repoPath: string, name: string, url: string): Promise<{ success: boolean }>;
  getInitTemplates(): Promise<{ gitignoreTemplates: string[]; licenseTemplates: string[] }>;
  getUserName(): Promise<string>;
  checkGit(): Promise<{ installed: boolean; version?: string; error?: string }>;
  getConfig(repoPath: string): Promise<{ name: string; email: string }>;
  setConfig(repoPath: string, name: string, email: string): Promise<{ success: boolean }>;
}

interface GiteaAPI {
  testConnection(serverUrl: string, token: string): Promise<{ success: boolean; user?: any; error?: string }>;
  listRepos(serverUrl: string, token: string): Promise<any[]>;
  getRepo(serverUrl: string, token: string, owner: string, repo: string): Promise<any>;
  createRepo(serverUrl: string, token: string, options: any): Promise<any>;
  listIssues(serverUrl: string, token: string, owner: string, repo: string, page?: number, state?: string): Promise<GiteaIssue[]>;
  getIssueComments(serverUrl: string, token: string, owner: string, repo: string, index: number): Promise<GiteaComment[]>;
  listReleases(serverUrl: string, token: string, owner: string, repo: string): Promise<GiteaRelease[]>;
  createRelease(serverUrl: string, token: string, owner: string, repo: string,
    options: { tag_name: string; name: string; body: string }): Promise<GiteaRelease>;
}

interface FileAPI {
  selectDirectory(defaultPath?: string): Promise<string | null>;
  readConfig(): Promise<AppConfig>;
  writeConfig(config: AppConfig): Promise<{ success: boolean }>;
}

interface WslDistro {
  name: string;
  root: string;
  home: string | null;
}

interface WslInfo {
  available: boolean;
  distros: WslDistro[];
  error?: string;
}

interface WslAPI {
  listDistros(): Promise<WslInfo>;
}

interface ShellAPI {
  openInVSCode(repoPath: string): Promise<{ success: boolean }>;
  openInExplorer(repoPath: string): Promise<{ success: boolean }>;
}

interface GitStatus {
  current: string | null;
  tracking: string | null;
  staged: string[];
  modified: string[];
  not_added: string[];
  deleted: string[];
  renamed: any[];
  conflicted: string[];
  created: string[];
  files: { path: string; index: string; working_dir: string }[];
  ahead: number;
  behind: number;
}

interface BranchInfo {
  all: string[];
  current: string;
  branches: Record<string, any>;
}

interface LogEntry {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

interface RemoteInfo {
  name: string;
  refs: { fetch: string; push: string };
}

interface AppConfig {
  accounts: GiteaAccount[];
  repositories: SavedRepository[];
  customScopes?: string[];
}

interface GiteaAccount {
  serverUrl: string;
  token: string;
  username: string;
  avatarUrl?: string;
}

interface SavedRepository {
  path: string;
  name: string;
  lastOpened: string;
}

interface GiteaIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  labels: { name: string; color: string }[];
  comments: number;
}

interface GiteaComment {
  id: number;
  body: string;
  created_at: string;
  user: { login: string; avatar_url: string };
}

interface GiteaRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  created_at: string;
  author: { login: string; avatar_url: string };
  draft: boolean;
  prerelease: boolean;
}

declare global {
  interface Window {
    electronAPI: {
      git: GitAPI;
      gitea: GiteaAPI;
      file: FileAPI;
      wsl: WslAPI;
      shell: ShellAPI;
      app: {
        reloadHome(): Promise<void>;
      };
    };
  }
}

export {};
