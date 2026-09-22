import { ipcMain } from 'electron';
import { execFile } from 'child_process';
import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { gitignoreTemplates } from './templates/gitignore';
import { licenseTemplates } from './templates/license';

export interface InitRepoOptions {
  name: string;
  description: string;
  localPath: string;
  gitignoreTemplate: string;
  licenseTemplate: string;
  authorName?: string;
}

function findSshCommand(): string | undefined {
  if (process.platform !== 'win32') return undefined;

  if (process.env.GIT_SSH_COMMAND) return process.env.GIT_SSH_COMMAND;
  if (process.env.GIT_SSH) return undefined;

  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'usr', 'bin', 'ssh.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'usr', 'bin', 'ssh.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'usr', 'bin', 'ssh.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return `"${p}"`;
  }
  return undefined;
}

const sshCommand = findSshCommand();

function getGit(repoPath: string): SimpleGit {
  const git = simpleGit(repoPath);
  if (sshCommand) git.env('GIT_SSH_COMMAND', sshCommand);
  return git;
}

export function registerGitHandlers() {
  ipcMain.handle('git:clone', async (_event, url: string, targetPath: string) => {
    try {
      const git = simpleGit();
      if (sshCommand) git.env('GIT_SSH_COMMAND', sshCommand);
      await git.clone(url, targetPath);
      return { success: true };
    } catch (err: any) {
      console.error('[git:clone]', err.message);
      throw err;
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
    try {
      const git = getGit(repoPath);
      if (branch) {
        await git.push(remote || 'origin', branch);
      } else {
        await git.push(remote || 'origin');
      }
      return { success: true };
    } catch (err: any) {
      console.error('[git:push]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:pull', async (_event, repoPath: string, remote?: string, branch?: string) => {
    try {
      const git = getGit(repoPath);
      if (branch) {
        const result = await git.pull(remote || 'origin', branch);
        return { success: true, summary: result.summary };
      } else {
        const result = await git.pull(remote || 'origin');
        return { success: true, summary: result.summary };
      }
    } catch (err: any) {
      console.error('[git:pull]', err.message);
      throw err;
    }
  });

  ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      await git.fetch();
      return { success: true };
    } catch (err: any) {
      console.error('[git:fetch]', err.message);
      throw err;
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
      const git = simpleGit();
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
