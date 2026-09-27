# Gitea Desktop

面向 [Gitea](https://gitea.io) 服务器的桌面 Git 客户端，灵感来自 GitHub Desktop。基于 Electron、React 与 TypeScript 构建。

[English](./README.md) | **简体中文**

![Platform: Windows](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-28-47848F)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

## 为什么专为 SJTU GC 而做？

作为 GC engr101 的学生，我们的作业和项目都要提交到 Focs Gitea 服务器上；同时每份作业还需要符合规范的 "commit message"，JOJ 才能评级。为方便起见，我做了这个应用，**它只能推送带有 "type" "scope" "build/build joj" 的信息**。应用**预置了 11 种 type 和 10 种 scope**（feat fix docs style refactor perf test build ci chores revert；p1 p2 hw1 hw2 hw3 hw4 hw5 hw6 hw7 hw8）。这就是它与普通 Gitea Desktop 的区别。

## 功能

- **Gitea 集成** —— 用 Token 认证连接任意 Gitea 实例，浏览、搜索并克隆你的仓库。
- **Git 操作** —— 直接在界面里完成克隆、提交、推送、拉取、fetch 与分支管理。
- **变更视图** —— 一眼看清已修改、已暂存、未跟踪的文件，可对单个文件暂存/取消暂存并撰写提交信息。
- **历史视图** —— 浏览提交日志，并查看每个提交的 diff。
- **分支管理** —— 创建、切换、删除分支，查看全部本地与远端分支。
- **暗色主题** —— 参考 Catppuccin 配色的舒适暗色界面。

## 截图

![Gitea Desktop](./Gitea%20Desktop.png)


## 环境要求

- 已安装 [Git](https://git-scm.com/) 并位于系统 PATH 中 —— **运行时必需**。Gitea Desktop 的每一次 Git 操作都会调用 `git` 可执行文件，而安装包中**不包含** `git`。应用会在启动时检查，缺失时给出提示。
- [Node.js](https://nodejs.org/) v18 或更高版本 —— **仅在**从源码构建/运行时需要。最终用户不需要：安装包已经内置 Electron 运行时和全部 npm 运行时依赖。
- 一个可用的 Gitea 服务器，加上下面两种凭据中的**任意一种** —— 不需要两个都配。详见[需要哪种 Gitea 凭据](#需要哪种-gitea-凭据)。
  - **个人访问令牌（Personal Access Token）**（[如何创建令牌](https://docs.gitea.com/development/api-usage#generating-and-listing-api-tokens)）—— 应用通过 Gitea API 完成的一切都需要它，自 v1.5.3 起 **HTTPS** remote 上的 Git 操作也用它。
  - **SSH 密钥** —— 仅当仓库的 remote 地址是 SSH 形式时才需要。

## 需要哪种 Gitea 凭据

Gitea Desktop 通过**两条互相独立的通道**访问 Gitea，二者使用**不同的**凭据。只配置其中一种完全正常。

| 你在应用里做的事 | 需要的凭据 | 在 Gitea 哪里创建 |
|---|---|---|
| 仓库列表、Issues、Releases、"新建仓库" | **Access Token** | **设置 → 应用 → 生成令牌** |
| **HTTPS** remote 上的 `clone` / `push` / `pull` / `fetch`（`https://host/owner/repo.git`） | **Access Token**（同一个） | **设置 → 应用 → 生成令牌** |
| **SSH** remote 上的 `clone` / `push` / `pull` / `fetch`（`ssh://git@host:2222/owner/repo.git` 或 `git@host:owner/repo.git`） | **SSH 密钥** | **设置 → SSH/GPG 密钥**（粘贴你的**公钥**） |

- **常规情况下你需要的是 Access Token。** 在应用的 **设置 → Gitea 账户** 里添加一次，之后所有 Gitea API 调用*以及* HTTPS remote 上的所有 Git 操作都会用它（令牌按次调用注入为 `http.extraHeader`，因此不会写进 `.git/config`，也不会出现在 remote URL 里）。
- **SSH/GPG 密钥只在 SSH remote 下才需要。** Gitea 的"克隆"框默认给的是 SSH 地址；如果用该地址克隆，就由原生 `git` 使用 `~/.ssh`（Windows 下为 `C:\Users\<你>\.ssh`）里的私钥完成认证，与之配对的**公钥**必须登记在 **设置 → SSH/GPG 密钥** 下。应用本身从不向你索要密钥 —— 它只是把这件事交给 `git`。
- **应用无法替你输入口令或密码。** 它启动时没有终端，因此带口令的 SSH 密钥只有在已经解锁进正在运行的 `ssh-agent` 时才可用，而服务端的密码认证根本无法使用。这也是 HTTPS + Token 更稳妥的原因。
- **完全不想碰 SSH 密钥？** 打开仓库，进入应用里的 **设置 → 远程仓库 / 认证方式**，点击 **改用 HTTPS + Token**。应用会把 `origin` 改写成 HTTPS 形式，并用你保存的 Access Token 推送；旁边的按钮可以把 remote 切回 SSH。（SSH 地址取自 Gitea API，因此端口会被保留。）

出问题时如何区分：

| 报错 | 最可能的原因 |
|---|---|
| `Permission denied (publickey,password)` / `Could not read from remote repository` | 当前是 SSH remote，但没有提供可用且已注册的密钥 → 去 **设置 → SSH/GPG 密钥** 添加公钥，或把 remote 改成 HTTPS + Token。 |
| `Authentication failed`，或 HTTPS remote 上出现 `404 Not Found` | Access Token 缺失、已过期，或对该仓库没有**写**权限。（对调用者无权查看的仓库，Gitea 返回 404 而不是 403。） |

## 安装

### 从源码安装

1. **克隆仓库**

   ```bash
   git clone https://your-gitea-server/yourname/gitea-desktop.git
   cd gitea-desktop
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

   > **国内用户：** `.npmrc` 已预置了用于下载 Electron 二进制的国内镜像。如果仍然失败，请执行：
   >
   > ```bash
   > ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
   > ```

3. **构建应用**

   ```bash
   # 构建主进程（Electron）
   npx tsc -p tsconfig.main.json

   # 构建渲染层（React UI）
   npx vite build
   ```

4. **运行应用**

   ```bash
   # 生产模式
   npx electron .

   # 开发模式（支持热重载）
   npx concurrently "npx vite --config vite.config.ts" "npx electron ."
   ```

   开发模式下需设置环境变量 `NODE_ENV=development`，Electron 才会连接 Vite 开发服务器：

   ```bash
   NODE_ENV=development npx electron .
   ```

### 打包安装程序（Windows）

把应用打包成 Windows 安装程序：

```bash
npm run pack
```

必须先执行它，否则你在别处的改动不会生效：

```bash
npx electron-builder --win
```

安装程序会生成在 `release/` 目录下（例如 `release/Gitea Desktop Setup <version>.exe`）。它内置了 Electron 运行时和全部 npm 运行时依赖，因此安装者不需要 Node.js，也不需要 `npm install` —— 只需另外安装 Git（见[环境要求](#环境要求)）。

## 使用

### 1. 配置 Gitea 连接

首次启动应用会看到 **Welcome（欢迎）** 页面。

1. 通过侧边栏进入 **Settings（设置）**。
2. 填入你的 Gitea 服务器地址（例如 `https://gitea.example.com`）。
3. 填入你的 **Personal Access Token**（Gitea → **设置 → 应用 → 生成令牌**）。这里要填的是令牌，*不是* SSH 密钥。
4. 点击 **Test Connection** 验证。
5. 保存配置。

> 这个令牌覆盖 Gitea API 以及 HTTPS remote 上的 Git 操作。如果你改用 SSH 地址克隆，则还需要把公钥登记到 Gitea → **设置 → SSH/GPG 密钥**，见[需要哪种 Gitea 凭据](#需要哪种-gitea-凭据)。

### 2. 克隆仓库

1. 在 Welcome 页面或通过仓库选择器点击 **Clone a Repository**。
2. 从你的 Gitea 账户里选一个仓库，或手动填入克隆地址。
3. 选择本地目标目录。
4. 等待克隆完成。

### 3. 暂存与提交变更

1. 从侧边栏打开一个仓库。
2. 进入 **Changes** 标签页。
3. 已修改的文件会出现在列表中，点击文件可查看 diff。
4. 点击每个文件旁的 **+** 按钮暂存，或一次性全部暂存。
5. 撰写提交信息并点击 **Commit**。

### 4. 推送与拉取

- 用工具栏的 **Push** 按钮把提交推送到远端。
- 用 **Pull** 按钮拉取并合并远端改动。
- 用 **Fetch** 只检查远端更新、不做合并。

这些按钮使用哪种凭据，取决于 `origin` 地址，而不是应用本身：

- `https://…` → 自动使用你保存的 **Access Token**（不会弹出输入框）。
- `ssh://…` 或 `git@host:…` → 使用 `~/.ssh` 里的 SSH 密钥，且该密钥必须已在服务器上注册。

如果尚未配置 SSH，打开 **设置 → 远程仓库 / 认证方式**，一键把 `origin` 切换到 HTTPS。

### 5. 分支管理

1. 进入 **Branches** 标签页。
2. 查看所有本地与远端分支。
3. 从当前 HEAD 创建新分支。
4. 点击分支即可切换。
5. 删除不再需要的分支。

## 项目结构

```
gitea-desktop/
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── main.ts            # 应用入口，创建窗口
│   │   ├── preload.ts         # contextBridge 暴露的 API
│   │   ├── git-handlers.ts    # Git 操作的 IPC handlers
│   │   ├── gitea-handlers.ts  # Gitea API 的 IPC handlers
│   │   └── file-handlers.ts   # 配置持久化与文件对话框
│   └── renderer/              # React 前端
│       ├── App.tsx            # 带路由的根组件
│       ├── index.html         # HTML 入口
│       ├── main.tsx           # React 入口
│       ├── context/
│       │   └── AppContext.tsx  # 全局状态管理
│       ├── components/
│       │   ├── Sidebar.tsx     # 导航侧边栏
│       │   └── RepoSelector.tsx
│       ├── pages/
│       │   ├── WelcomePage.tsx
│       │   ├── ChangesPage.tsx
│       │   ├── HistoryPage.tsx
│       │   ├── BranchesPage.tsx
│       │   └── SettingsPage.tsx
│       ├── styles/
│       │   └── global.css     # 暗色主题样式
│       └── types/
│           └── electron.d.ts  # TypeScript 类型声明
├── package.json
├── tsconfig.json              # 渲染层 TypeScript 配置
├── tsconfig.main.json         # 主进程 TypeScript 配置
├── vite.config.ts             # Vite 构建配置
└── .npmrc                     # npm 配置（Electron 镜像）
```

## 技术栈

| 层次 | 技术 |
|------------|-------------------------|
| 外壳      | Electron 28             |
| 前端      | React 18 + TypeScript   |
| 构建      | Vite 5                  |
| Git       | simple-git              |
| API       | Electron `net.request`  |
| 路由      | React Router (HashRouter) |
| 打包      | electron-builder        |
| 主题      | Catppuccin（暗色）       |

## 配置

应用配置保存在：

```
%APPDATA%/gitea-desktop/config.json
```

该文件包含你的 Gitea 服务器地址、认证令牌以及已克隆仓库的列表。令牌只保存在本地、不会发送给任何第三方 —— 它只会发往你配置的 Gitea 服务器。

## 疑难解答

### Electron 二进制下载失败

如果 `npm install` 卡在下载 Electron 二进制（国内常见），请使用国内镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
```

### node_modules 报 "EBUSY: resource busy or locked"

这通常是残留的 Electron/Node 进程占着文件锁。先把它们结束掉：

```bash
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

然后删除 `node_modules` 重新安装。

### Git 操作失败

确认 Git 已安装且在终端中可用：

```bash
git --version
```

如果这条命令失败，请[安装 Git](https://git-scm.com/download/win) 并重启应用。

### 推送时出现 `Permission denied (publickey,password)`

说明 remote 是 SSH 地址，但没有提供可用且已注册的 SSH 密钥。两条出路：

1. 注册密钥：打印公钥并粘贴到 Gitea → **设置 → SSH/GPG 密钥**。

   ```bash
   # Windows PowerShell
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
   ```

   先在终端验证，再回到应用重试：

   ```bash
   ssh -T -p 2222 git@your-gitea-host
   ```

   出现类似 `Hi there, <user>! You've successfully authenticated…` 的提示，说明密钥没问题。

2. 或者干脆不用 SSH：打开仓库，进入 **设置 → 远程仓库 / 认证方式**，点击 **改用 HTTPS + Token**，然后重新推送。

注意：带口令的密钥必须已经解锁进 `ssh-agent` —— 应用没有终端，无法向你索取口令。

### HTTPS remote 上出现 `Authentication failed` 或 `404 Not Found`

Access Token 缺失、已过期，或对该仓库没有写权限。请在 Gitea → **设置 → 应用** 重新生成一个带 `repo` scope 的令牌，然后在应用里重新添加账号。注意 Gitea 对调用者无权查看的私有仓库返回 `404`（而不是 `403`），所以"仓库未找到"通常是"令牌不对"，而不是拼写错误。

## 许可证

MIT
