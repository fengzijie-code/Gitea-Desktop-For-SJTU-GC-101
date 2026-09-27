import { ipcMain } from 'electron';
import { execFile } from 'child_process';
import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { gitignoreTemplates } from './templates/gitignore';
import { licenseTemplates } from './templates/license';
import { readAppConfig } from './file-handlers';

export interface InitRepoOptions {
  name: string;
  description: string;
  localPath: string;
  gitignoreTemplate: string;
  licenseTemplate: string;
  authorName?: string;
}

// WSL 仓库（\\wsl.localhost\...）里的文件属主是 Linux 用户，Git for Windows 会判定为
// "dubious ownership" 并直接拒绝操作（fatal: detected dubious ownership in repository）。
// 这里通过 -c 只在本次 git 调用中放宽该检查，不去改用户的全局 git 配置。
const GIT_CONFIG_SAFE_DIRECTORY = 'safe.directory=*';

/**
 * Every git invocation goes through here.
 *
 * Important: do NOT use `git.env()` for anything (that is how an earlier version passed
 * GIT_SSH_COMMAND / GIT_CONFIG_COUNT). simple-git's "block unsafe operations" plugin
 * (>= 3.36) rejects those env vars - and `env()` *replaces* the whole child environment
 * rather than merging it - so a single `env()` call makes **every** git command fail,
 * not just network ones. Per-call settings must be passed as `-c` entries instead.
 */
function getGit(repoPath: string, extraConfig: string[] = []): SimpleGit {
  return simpleGit({
    baseDir: repoPath,
    config: [GIT_CONFIG_SAFE_DIRECTORY, ...extraConfig],
  });
}

// ---------------------------------------------------------------------------
// HTTPS authentication with the stored Gitea access token
// ---------------------------------------------------------------------------
// Every git call here is spawned by the main process, which has no terminal attached.
// That makes SSH unusable whenever the key is missing/unauthorised or protected by a
// passphrase (the prompt can never be answered). For HTTPS remotes we can instead
// authenticate non-interactively with the access token the user already saved.

function hostOfUrl(value: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).host.toLowerCase();
  } catch {
    // not a parsable http(s) URL - try the scp/ssh syntax below
  }
  // ssh://git@host:2222/owner/repo.git | git@host:owner/repo.git | host:owner/repo.git
  const match = raw.match(/^(?:[a-z+.-]+:\/\/)?(?:[^@/]+@)?([^/:]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function findAccountForUrl(url: string): { serverUrl: string; token: string; username?: string } | null {
  const host = hostOfUrl(url);
  if (!host) return null;
  const accounts = (readAppConfig().accounts || []) as {
    serverUrl: string;
    token: string;
    username?: string;
  }[];
  return accounts.find((a) => a.token && hostOfUrl(a.serverUrl) === host) || null;
}

/**
 * Returns the `-c` entries needed to authenticate against an HTTPS remote with the
 * saved access token. Passed per invocation, so the token is never persisted in
 * .git/config nor embedded in the remote URL. Empty for non-HTTPS remotes.
 */
function tokenConfigFor(url?: string): string[] {
  if (!url || !/^https?:\/\//i.test(url)) return [];
  const account = findAccountForUrl(url);
  if (!account) return [];
  return [`http.extraHeader=Authorization: token ${account.token}`];
}

async function remoteUrlOf(git: SimpleGit, remote: string): Promise<string | undefined> {
  try {
    const remotes = await git.getRemotes(true);
    return remotes.find((r) => r.name === remote)?.refs.fetch;
  } catch {
    return undefined;
  }
}

/** Re-throws git errors with an actionable hint for the most common auth failures. */
function rethrowWithHint(err: any): never {
  const message: string = err?.message || String(err);
  let hint: string | null = null;

  if (/permission denied|publickey|could not read from remote repository/i.test(message)) {
    hint =
      'SSH 认证失败：本机没有可用的私钥，或该公钥未添加到 Gitea 账户 / 对该仓库无写权限。' +
      '可在「设置 → 远程仓库」改用 HTTPS + Access Token 推送（无需 SSH 密钥）。';
  } else if (/authentication failed|could not read username|401|403/i.test(message)) {
    hint = 'HTTP 认证失败：Access Token 无效、已过期或权限不足（需要 repo 写权限）。';
  } else if (/not found/i.test(message)) {
    // Gitea answers 404 (not 403) for private repositories the caller may not see,
    // so "not found" is frequently an auth/permission problem rather than a typo.
    hint = '仓库未找到：若这是私有仓库，通常是 Token 无效或权限不足（Gitea 对无权访问的仓库也返回 not found）。';
  }

  throw new Error(hint ? `${message}\n\n${hint}` : message);
}

export function registerGitHandlers() {
  ipcMain.handle('git:clone', async (_event, url: string, targetPath: string) => {
    try {
      const git = simpleGit({ config: [GIT_CONFIG_SAFE_DIRECTORY, ...tokenConfigFor(url)] });
      await git.clone(url, targetPath);
      return { success: true };
    } catch (err: any) {
      console.error('[git:clone]', err.message);
      rethrowWithHint(err);
    }
  });

  ipcMain.handle('git:status', async (_event, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      const status = await git.status();
      return {
        current: status.current,
        tracking: status.tracking,
        staged: status.staged,
        modified: status.modified,
        not_added: status.not_added,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted,
        created: status.created,
        files: status.files.map((f) => ({
          path: f.path,
          index: f.index,
          working_dir: f.working_dir,
        })),
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch (err: any) {
      console.error('[git:status]', repoPath, err.message);
      throw err;
    }
  });

  ipcMain.handle('git:stage', async (_event, repoPath: string, files: string[]) => {
    try {
      const git = getGit(repoPath);
      await git.add(files);
      return { success: true };
    } catch (err: any) {
      console.error('[git:stage]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:unstage', async (_event, repoPath: string, files: string[]) => {
    try {
      const git = getGit(repoPath);
      await git.reset(['HEAD', '--', ...files]);
      return { success: true };
    } catch (err: any) {
      console.error('[git:unstage]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string, options?: { allowEmpty?: boolean }) => {
    try {
      const git = getGit(repoPath);
      const args = options?.allowEmpty ? ['--allow-empty'] : [];
      const result = await git.commit(message, args);
      return { success: true, summary: result.summary };
    } catch (err: any) {
      console.error('[git:commit]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:push', async (_event, repoPath: string, remote?: string, branch?: string) => {
    const target = remote || 'origin';
    try {
      const url = await remoteUrlOf(getGit(repoPath), target);
      const git = getGit(repoPath, tokenConfigFor(url));
      if (branch) {
        await git.push(target, branch);
      } else {
        await git.push(target);
      }
      return { success: true };
    } catch (err: any) {
      console.error('[git:push]', err.message);
      rethrowWithHint(err);
    }
  });

  ipcMain.handle('git:pull', async (_event, repoPath: string, remote?: string, branch?: string) => {
    const target = remote || 'origin';
    try {
      const url = await remoteUrlOf(getGit(repoPath), target);
      const git = getGit(repoPath, tokenConfigFor(url));
      if (branch) {
        const result = await git.pull(target, branch);
        return { success: true, summary: result.summary };
      } else {
        const result = await git.pull(target);
        return { success: true, summary: result.summary };
      }
    } catch (err: any) {
      console.error('[git:pull]', err.message);
      rethrowWithHint(err);
    }
  });

  ipcMain.handle('git:fetch', async (_event, repoPath: string, remote?: string) => {
    const target = remote || 'origin';
    try {
      const url = await remoteUrlOf(getGit(repoPath), target);
      const git = getGit(repoPath, tokenConfigFor(url));
      if (target === 'origin') {
        await git.fetch();
      } else {
        await git.fetch(target);
      }
      return { success: true };
    } catch (err: any) {
      console.error('[git:fetch]', err.message);
      rethrowWithHint(err);
    }
  });

  ipcMain.handle('git:branches', async (_event, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      const branches = await git.branch();
      return {
        all: branches.all,
        current: branches.current,
        branches: branches.branches,
      };
    } catch (err: any) {
      console.error('[git:branches]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:current-branch', async (_event, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      const branches = await git.branch();
      return branches.current;
    } catch (err: any) {
      console.error('[git:current-branch]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:checkout', async (_event, repoPath: string, branch: string) => {
    try {
      const git = getGit(repoPath);
      await git.checkout(branch);
      return { success: true };
    } catch (err: any) {
      console.error('[git:checkout]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:create-branch', async (_event, repoPath: string, branch: string) => {
    try {
      const git = getGit(repoPath);
      await git.checkoutLocalBranch(branch);
      return { success: true };
    } catch (err: any) {
      console.error('[git:create-branch]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:delete-branch', async (_event, repoPath: string, branch: string) => {
    try {
      const git = getGit(repoPath);
      await git.deleteLocalBranch(branch);
      return { success: true };
    } catch (err: any) {
      console.error('[git:delete-branch]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:log', async (_event, repoPath: string, maxCount?: number) => {
    try {
      const git = getGit(repoPath);
      const log = await git.log({ maxCount: maxCount || 50 });
      return log.all;
    } catch (err: any) {
      console.error('[git:log]', repoPath, err.message);
      throw err;
    }
  });

  ipcMain.handle('git:diff', async (_event, repoPath: string, filePath?: string) => {
    try {
      const git = getGit(repoPath);
      if (filePath) {
        return await git.diff([filePath]);
      }
      return await git.diff();
    } catch (err: any) {
      console.error('[git:diff]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:diff-staged', async (_event, repoPath: string, filePath?: string) => {
    try {
      const git = getGit(repoPath);
      if (filePath) {
        return await git.diff(['--cached', filePath]);
      }
      return await git.diff(['--cached']);
    } catch (err: any) {
      console.error('[git:diff-staged]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:remotes', async (_event, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      return await git.getRemotes(true);
    } catch (err: any) {
      console.error('[git:remotes]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:init', async (_event, options: InitRepoOptions) => {
    try {
      const repoDir = path.join(options.localPath, options.name);
      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir, { recursive: true });
      }

      const git = getGit(repoDir);
      await git.init();
      await git.raw(['checkout', '-b', 'master']);

      const gitattributes = `# Auto detect text files and perform LF normalization
* text=auto

# Explicitly declare text files
*.md text
*.txt text
*.json text
*.xml text
*.yml text
*.yaml text
*.html text
*.css text
*.js text
*.ts text
*.py text
*.go text
*.java text
*.c text
*.cpp text
*.h text
*.rs text
*.sh text eol=lf

# Declare binary files
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
*.zip binary
*.gz binary
*.tar binary
*.exe binary
*.dll binary
*.so binary
*.dylib binary
`;
      fs.writeFileSync(path.join(repoDir, '.gitattributes'), gitattributes, 'utf-8');

      if (options.gitignoreTemplate && gitignoreTemplates[options.gitignoreTemplate]) {
        fs.writeFileSync(
          path.join(repoDir, '.gitignore'),
          gitignoreTemplates[options.gitignoreTemplate],
          'utf-8',
        );
      }

      if (options.licenseTemplate && licenseTemplates[options.licenseTemplate]) {
        const year = new Date().getFullYear();
        const author = options.authorName || 'Author';
        fs.writeFileSync(
          path.join(repoDir, 'LICENSE'),
          licenseTemplates[options.licenseTemplate](year, author),
          'utf-8',
        );
      }

      const descLine = options.description ? `\n\n${options.description}` : '';
      const readme = `# ${options.name}${descLine}\n`;
      fs.writeFileSync(path.join(repoDir, 'README.md'), readme, 'utf-8');

      await git.add('.');
      await git.commit('Initial commit');

      return { success: true, repoPath: repoDir };
    } catch (err: any) {
      console.error('[git:init]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:add-remote', async (_event, repoPath: string, name: string, url: string) => {
    try {
      const git = getGit(repoPath);
      await git.addRemote(name, url);
      return { success: true };
    } catch (err: any) {
      console.error('[git:add-remote]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:set-remote-url', async (_event, repoPath: string, name: string, url: string) => {
    try {
      const git = getGit(repoPath);
      const remotes = await git.getRemotes(true);
      if (remotes.some((r) => r.name === name)) {
        await git.remote(['set-url', name, url]);
      } else {
        await git.addRemote(name, url);
      }
      return { success: true };
    } catch (err: any) {
      console.error('[git:set-remote-url]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:get-init-templates', async () => {
    const { gitignoreNames } = await import('./templates/gitignore');
    const { licenseNames } = await import('./templates/license');
    return { gitignoreTemplates: gitignoreNames, licenseTemplates: licenseNames };
  });

  // The `git` executable is not bundled with the app, so check it is available on startup.
  ipcMain.handle('git:check', async () => {
    return await new Promise<{ installed: boolean; version?: string; error?: string }>((resolve) => {
      execFile('git', ['--version'], { windowsHide: true }, (error, stdout) => {
        if (error) {
          resolve({ installed: false, error: error.message });
        } else {
          resolve({ installed: true, version: String(stdout).trim() });
        }
      });
    });
  });

  ipcMain.handle('git:get-user-name', async () => {
    try {
      const git = simpleGit({ config: [GIT_CONFIG_SAFE_DIRECTORY] });
      const name = await git.raw(['config', 'user.name']);
      return name.trim();
    } catch {
      return '';
    }
  });

  ipcMain.handle('git:get-config', async (_event, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      let name = '', email = '';
      try { name = (await git.raw(['config', 'user.name'])).trim(); } catch {}
      try { email = (await git.raw(['config', 'user.email'])).trim(); } catch {}
      return { name, email };
    } catch (err: any) {
      console.error('[git:get-config]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:set-config', async (_event, repoPath: string, name: string, email: string) => {
    try {
      const git = getGit(repoPath);
      await git.addConfig('user.name', name);
      await git.addConfig('user.email', email);
      return { success: true };
    } catch (err: any) {
      console.error('[git:set-config]', err.message);
      throw err;
    }
  });
}
