# Blame Annotate

Display Git/SVN blame annotations in the editor gutter, like JetBrains IDEs.

![screenshot](./images/screenshoot1.png)

## Features

- Supports both **Git** and **SVN** repositories
- Displays author and date for each line in the gutter
- Hover over an annotation to view full commit details
- Click the commit link in the hover popup to view diff changes (Git only)
- Heatmap color bar: recent commits appear more vivid, older ones fade out
- Real-time update as you edit — annotations adjust without re-fetching

## Usage

1. Open a file tracked by Git or SVN.
2. Right-click on the line number gutter **or** right-click in the editor area.
3. Click **Show Blame Annotations** to enable, **Close Blame Annotations** to disable.
4. Hover over any annotation to see author, date, and commit summary.

**Keyboard shortcuts:**
- `Ctrl+Alt+B` / `Cmd+Alt+B` — Toggle annotations
- `Esc` — Close annotations

## Commands

| Command | Description |
|---|---|
| `git.blame.toggle` | Toggle annotations on/off |
| `git.blame.show` | Show blame annotations (Git) |
| `git.blame.show.svn` | Show blame annotations (SVN) |
| `git.blame.hide` | Close blame annotations |

## Configuration

| Setting | Default | Description |
|---|---|---|
| `blameAnnotate.svnExecutablePath` | `svn` | Path to the SVN executable |

## Develop

```bash
# Run & Debug
npm install
npm run compile
# Then press F5 in VSCode

# Build VSIX
npm install -g @vscode/vsce
vsce package

# Publish
vsce login <publisher>
vsce publish
```

---

# Blame Annotate（中文）

在编辑器行号区域显示 Git/SVN 追溯注解，类似 JetBrains IDE 的效果。

## 功能

- 同时支持 **Git** 和 **SVN** 仓库
- 在行号旁显示每行的作者和日期
- 鼠标悬停可查看完整提交信息
- 点击悬停弹窗中的提交链接可查看 diff 变更（仅 Git）
- 热力图色条：近期提交颜色鲜艳，时间越久颜色越淡
- 实时跟随编辑更新，无需重新获取 blame 数据

## 用法

1. 打开一个受 Git 或 SVN 管理的文件。
2. 右键点击行号区域，或在编辑器文本区右键。
3. 点击 **显示追溯注解** 开启，**关闭追溯注解** 关闭。
4. 鼠标悬停注解可查看作者、日期和提交摘要。

**快捷键：**
- `Ctrl+Alt+B` / `Cmd+Alt+B` — 切换追溯注解
- `Esc` — 关闭追溯注解

## 命令

| 命令 | 说明 |
|---|---|
| `git.blame.toggle` | 切换追溯注解 |
| `git.blame.show` | 显示追溯注解（Git） |
| `git.blame.show.svn` | 显示追溯注解（SVN） |
| `git.blame.hide` | 关闭追溯注解 |

## 配置

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `blameAnnotate.svnExecutablePath` | `svn` | SVN 可执行文件路径 |

---

## Acknowledgements / 致谢

本项目基于 [vscode-gitblame-annotations](https://github.com/lkqm/vscode-gitblame-annotations) 迭代开发，在此基础上新增了 SVN 支持、性能优化及本地化。感谢原作者的工作。

参考项目：
- [vscode-gitblame-annotations](https://github.com/lkqm/vscode-gitblame-annotations) — 本项目的原始基础，Git blame 核心实现来源于此
- [svn-blamer](https://github.com/opista/svn-blamer) — SVN blame 支持的参考
