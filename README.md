# Gitea Desktop

A desktop Git client for [Gitea](https://gitea.io) servers, inspired by GitHub Desktop. Built with Electron, React, and TypeScript.

![Platform: Windows](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-28-47848F)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

## Why For SJTU GC？

As a GC engr101 student, our homework and project are all upload onto Focs Gitea Server. Meanwhile we all need a formatted "commit message" for JOJ to grade our homework. For convenience, I designed this application, **which can and only can push with message containing "type" "scope" "build/build joj"**. This application comes **pre-installed with 11 types and 10 scopes** (feat fix docs style refactor perf test build ci chores revert;p1 p2 hw1 hw2 hw3 hw4 hw5 hw6 hw7 hw8). This is the difference between this Gitea Desktop and a normal Gitea Desktop.

## Features

- **Gitea Integration** — Connect to any Gitea instance with token-based authentication. Browse, search, and clone your repositories.
- **Git Operations** — Clone, commit, push, pull, fetch, and manage branches directly from the UI.
- **Changes View** — See modified, staged, and untracked files at a glance. Stage/unstage individual files and write commit messages.
- **History View** — Browse the commit log with diffs for each commit.
- **Branch Management** — Create, switch, and delete branches. View all local and remote branches.
- **Dark Theme** — A comfortable dark UI with Catppuccin-inspired colors.

## Screenshots

![Gitea Desktop](./Gitea%20Desktop.png)


## Prerequisites

- [Git](https://git-scm.com/) installed and available in your system PATH — **required at runtime**. Gitea Desktop shells out to the `git` executable for every Git operation, and `git` is **not** bundled in the installer. The app checks for it on startup and shows a warning if it is missing.
- [Node.js](https://nodejs.org/) v18 or later — required **only** when building/running from source. End users don't need it: the packaged installer already bundles the Electron runtime and all npm runtime dependencies.
- A running Gitea server with a personal access token ([how to create a token](https://docs.gitea.com/development/api-usage#generating-and-listing-api-tokens))

## Installation

### From Source

1. **Clone the repository**

   ```bash
   git clone https://your-gitea-server/yourname/gitea-desktop.git
   cd gitea-desktop
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   > **Users in China:** The `.npmrc` file is pre-configured with a Chinese mirror for downloading the Electron binary. If you still experience issues, run:
   >
   > ```bash
   > ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
   > ```

3. **Build the application**

   ```bash
   # Build the main process (Electron)
   npx tsc -p tsconfig.main.json

   # Build the renderer (React UI)
   npx vite build
   ```

4. **Run the application**

   ```bash
   # Production mode
   npx electron .

   # Development mode (with hot-reload)
   npx concurrently "npx vite --config vite.config.ts" "npx electron ."
   ```

   In development mode, set the environment variable `NODE_ENV=development` so Electron connects to the Vite dev server:

   ```bash
   NODE_ENV=development npx electron .
   ```

### Build Installer (Windows)

To package the app as a Windows installer:

```bash
npm run pack
```

You must do this before build，or all things you are doing will not change

```bash
npx electron-builder --win
```

The installer will be generated in the `release/` directory (e.g. `release/Gitea Desktop Setup <version>.exe`). It bundles the Electron runtime and all npm runtime dependencies, so whoever installs it does not need Node.js or `npm install` — only Git has to be installed separately (see [Prerequisites](#prerequisites)).

## Usage

### 1. Configure Gitea Connection

When you first launch the app, you'll see the **Welcome** page.

1. Go to **Settings** (via the sidebar).
2. Enter your Gitea server URL (e.g., `https://gitea.example.com`).
3. Enter your **Personal Access Token**.
4. Click **Test Connection** to verify.
5. Save the configuration.

### 2. Clone a Repository

1. On the Welcome page or via the repository selector, click **Clone a Repository**.
2. Choose a repository from your Gitea account, or enter a clone URL manually.
3. Select a local directory for the clone.
4. Wait for the clone to complete.

### 3. Stage and Commit Changes

1. Open a repository from the sidebar.
2. Navigate to the **Changes** tab.
3. Modified files appear in the file list. Click a file to see its diff.
4. Stage files by clicking the **+** button next to each file, or stage all.
5. Write a commit message and click **Commit**.

### 4. Push and Pull

- Use the **Push** button in the toolbar to push commits to the remote.
- Use the **Pull** button to fetch and merge remote changes.
- Use **Fetch** to check for remote updates without merging.

### 5. Branch Management

1. Navigate to the **Branches** tab.
2. View all local and remote branches.
3. Create a new branch from the current HEAD.
4. Switch between branches by clicking on them.
5. Delete branches you no longer need.

## Project Structure

```
gitea-desktop/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── main.ts            # App entry point, window creation
│   │   ├── preload.ts         # contextBridge API exposure
│   │   ├── git-handlers.ts    # IPC handlers for Git operations
│   │   ├── gitea-handlers.ts  # IPC handlers for Gitea API
│   │   └── file-handlers.ts   # Config persistence & file dialogs
│   └── renderer/              # React frontend
│       ├── App.tsx            # Root component with routing
│       ├── index.html         # HTML entry point
│       ├── main.tsx           # React entry point
│       ├── context/
│       │   └── AppContext.tsx  # Global state management
│       ├── components/
│       │   ├── Sidebar.tsx     # Navigation sidebar
│       │   └── RepoSelector.tsx
│       ├── pages/
│       │   ├── WelcomePage.tsx
│       │   ├── ChangesPage.tsx
│       │   ├── HistoryPage.tsx
│       │   ├── BranchesPage.tsx
│       │   └── SettingsPage.tsx
│       ├── styles/
│       │   └── global.css     # Dark theme styles
│       └── types/
│           └── electron.d.ts  # TypeScript declarations
├── package.json
├── tsconfig.json              # Renderer TypeScript config
├── tsconfig.main.json         # Main process TypeScript config
├── vite.config.ts             # Vite build config
└── .npmrc                     # npm config (Electron mirror)
```

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Shell      | Electron 28             |
| Frontend   | React 18 + TypeScript   |
| Build      | Vite 5                  |
| Git        | simple-git              |
| API        | Electron `net.request`  |
| Routing    | React Router (HashRouter) |
| Packaging  | electron-builder        |
| Theme      | Catppuccin (dark)       |

## Configuration

App configuration is stored at:

```
%APPDATA%/gitea-desktop/config.json
```

This file contains your Gitea server URL, authentication token, and the list of cloned repositories. The token is stored locally and is never transmitted to any third party — it is only sent to the Gitea server you configure.

## Troubleshooting

### Electron binary download fails

If `npm install` hangs while downloading the Electron binary (common in China), use the Chinese mirror:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
```

### "EBUSY: resource busy or locked" on node_modules

This happens when leftover Electron/Node processes hold file locks. Kill them first:

```bash
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

Then delete `node_modules` and reinstall.

### Git operations fail

Make sure Git is installed and accessible from your terminal:

```bash
git --version
```

If this command fails, [install Git](https://git-scm.com/download/win) and restart the application.

## License

MIT
