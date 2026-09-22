import { ipcMain } from 'electron';
import { execFile } from 'child_process';

export interface WslDistro {
  name: string;
  /** UNC 根路径，例如 \\wsl.localhost\Ubuntu */
  root: string;
  /** 发行版的 $HOME 对应的 UNC 路径，失败时为 null */
  home: string | null;
}

/**
 * wsl.exe 的输出编码在不同版本上不一致：
 * - 新版（Store 版 WSL）输出 UTF-8
 * - 旧版（系统内置）输出 UTF-16LE
 * 这里做兼容解码。
 */
function decodeWslOutput(buf: Buffer): string {
  if (!buf || buf.length === 0) return '';

  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le').replace(/\u0000/g, '').slice(1);
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8').slice(1);
  }

  // 启发式：UTF-16LE 的偶数长度内容中，奇数位大量为 0
  const sample = Math.min(buf.length, 200);
  let zerosAtOdd = 0;
  for (let i = 1; i < sample; i += 2) {
    if (buf[i] === 0) zerosAtOdd++;
  }
  if (zerosAtOdd > sample / 4) {
    return buf.toString('utf16le').replace(/\u0000/g, '');
  }

  return buf.toString('utf8').replace(/\u0000/g, '');
}

function runWsl(args: string[], timeout: number): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('wsl.exe', args, { windowsHide: true, timeout, encoding: 'buffer' }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: decodeWslOutput(stdout as unknown as Buffer),
        stderr: decodeWslOutput(stderr as unknown as Buffer),
      });
    });
  });
}

/** 取发行版的 $HOME，并转成 Windows UNC 路径（失败返回 null） */
async function resolveHome(distro: string): Promise<string | null> {
  const home = await runWsl(['-d', distro, '-e', 'sh', '-lc', 'echo $HOME'], 30000);
  if (!home.ok) return null;

  const linuxHome = home.stdout.trim().split(/\r?\n/)[0]?.trim();
  if (!linuxHome || !linuxHome.startsWith('/')) return null;

  const converted = await runWsl(['-d', distro, '-e', 'wslpath', '-w', linuxHome], 30000);
  const unc = converted.stdout.trim().split(/\r?\n/)[0]?.trim();
  if (!converted.ok || !unc) return null;

  return unc;
}

export function registerWslHandlers() {
  ipcMain.handle('wsl:list-distros', async () => {
    if (process.platform !== 'win32') {
      return { available: false, distros: [] as WslDistro[], error: 'Not running on Windows.' };
    }

    const listed = await runWsl(['-l', '-q'], 15000);
    if (!listed.ok) {
      return {
        available: false,
        distros: [] as WslDistro[],
        error: listed.stderr.trim() || 'WSL is not available.',
      };
    }

    const names = listed.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const distros: WslDistro[] = [];
    for (const name of names) {
      distros.push({
        name,
        root: `\\\\wsl.localhost\\${name}`,
        home: await resolveHome(name),
      });
    }

    return { available: true, distros, error: distros.length === 0 ? 'No WSL distribution found.' : undefined };
  });
}
