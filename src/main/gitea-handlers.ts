import { ipcMain, net, app } from 'electron';

function giteaFetch(serverUrl: string, token: string, endpoint: string, options: any = {}): Promise<any> {
  const url = `${serverUrl.replace(/\/$/, '')}/api/v1${endpoint}`;
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: options.method || 'GET',
      url,
    });

    request.setHeader('Authorization', `token ${token}`);
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');
    // Electron's default User-Agent is browser-like (Mozilla/... Chrome/... Electron/...).
    // Some Gitea instances are fronted by an anti-bot challenge (e.g. Anubis) that serves an
    // HTML "are you a robot?" page to browser-like clients that cannot run the JS proof-of-work,
    // so the API never receives real JSON. A plain client identifier is passed through.
    request.setHeader('User-Agent', `Gitea-Desktop/${app.getVersion()}`);

    request.on('response', (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.on('end', () => {
        const status = response.statusCode || 0;
        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Never hand a non-JSON body back to the renderer: it would be treated as a
          // successful result and crash list rendering (e.g. `issues.map is not a function`).
          if (status >= 400) {
            reject(new Error(`HTTP ${status}`));
          } else {
            reject(new Error(
              `Gitea 返回了非 JSON 响应（HTTP ${status}）。` +
              `可能被服务器前置的人机验证/反爬（如 Anubis）拦截，或 server URL 配置有误。`
            ));
          }
          return;
        }
        if (status >= 400) {
          reject(new Error(parsed.message || `HTTP ${status}`));
        } else {
          resolve(parsed);
        }
      });
    });

    request.on('error', reject);

    if (options.body) {
      request.write(JSON.stringify(options.body));
    }

    request.end();
  });
}

export function registerGiteaHandlers() {
  ipcMain.handle('gitea:test-connection', async (_event, serverUrl: string, token: string) => {
    try {
      const user = await giteaFetch(serverUrl, token, '/user');
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('gitea:list-repos', async (_event, serverUrl: string, token: string) => {
    return await giteaFetch(serverUrl, token, '/user/repos?limit=50&sort=updated');
  });

  ipcMain.handle('gitea:get-repo', async (_event, serverUrl: string, token: string, owner: string, repo: string) => {
    return await giteaFetch(serverUrl, token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  });

  ipcMain.handle('gitea:create-repo', async (_event, serverUrl: string, token: string, options: any) => {
    return await giteaFetch(serverUrl, token, '/user/repos', {
      method: 'POST',
      body: options,
    });
  });

  ipcMain.handle('gitea:list-issues',
    async (_event, serverUrl: string, token: string, owner: string, repo: string, page?: number, state?: string) => {
      const p = page || 1;
      const s = state || 'all';
      return await giteaFetch(serverUrl, token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?page=${p}&limit=20&state=${s}&type=issues&sort=created&direction=desc`
      );
    }
  );

  ipcMain.handle('gitea:get-issue-comments',
    async (_event, serverUrl: string, token: string, owner: string, repo: string, index: number) => {
      return await giteaFetch(serverUrl, token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${index}/comments`
      );
    }
  );

  ipcMain.handle('gitea:list-releases',
    async (_event, serverUrl: string, token: string, owner: string, repo: string) => {
      return await giteaFetch(serverUrl, token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?limit=50`
      );
    }
  );

  ipcMain.handle('gitea:create-release',
    async (_event, serverUrl: string, token: string, owner: string, repo: string,
      options: { tag_name: string; name: string; body: string }) => {
      return await giteaFetch(serverUrl, token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
        { method: 'POST', body: options }
      );
    }
  );
}
