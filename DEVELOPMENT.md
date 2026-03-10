# 开发文档

## 项目概述

本插件基于 [vscode-gitblame-annotations](https://github.com/lkqm/vscode-gitblame-annotations) 迭代开发，在原有 Git Blame 功能基础上增加了 SVN 支持、性能优化及本地化。

## 构建与运行

```bash
npm install          # 安装依赖
npm run compile      # 编译 TypeScript
npm run watch        # 监听模式，自动重编译
npm run lint         # ESLint 检查
vsce package         # 打包 VSIX
```

调试：编译后按 F5 启动扩展调试窗口（使用 `.vscode/launch.json`）。

## 核心模块

| 文件 | 职责 |
|---|---|
| `src/extension.ts` | 插件入口：命令注册、事件监听、装饰器/UI 全部逻辑 |
| `src/git.ts` | Git blame 核心：`git blame --incremental` 解析、commit diff、文件状态 |
| `src/svn.ts` | SVN blame 核心 + VCS 类型检测入口 `detectVcsType()` |

## VCS 检测逻辑

`detectVcsType()` 采用 **SVN 优先串行检测**：

1. 向上遍历目录查找 `.svn` 文件夹（`fs.existsSync`，无子进程，< 1ms）
2. 找到则立即返回 `'svn'`，**不再检测 Git**
3. 未找到则向上查找 `.git` 文件夹，同样使用 `fs.existsSync`

> 原因：之前用 `svn info` / `git rev-parse` 子进程检测，耗时 300-800ms；改为文件系统查找后降至 < 1ms。

## 关键数据流

```
用户触发命令
  → detectVcsType()       # .svn/.git 文件查找
  → getSvnBlames() 或 getBlames()
  → Blame[]               # 每行: { commit, author, timestamp, summary, commited }
  → buildDecorationOptions()  # 生成文字注解 + 热力色条两组 DecorationOptions
  → editor.setDecorations()
  → registerHoverProvider()   # 悬停弹窗
```

## 状态管理

`extension.ts` 模块级两个 Map：
- `fileBlameStates: Map<string, boolean>` — 每个文档 URI 的显示开关
- `fileDecorations: Map<string, {...}>` — 缓存装饰器、blame 数据、hover provider

## 菜单上下文 Key

| Key | 说明 |
|---|---|
| `gitblame.showMenuState` | 控制"显示追溯注解"菜单项是否可见 |
| `gitblame.hideMenuState` | 控制"关闭追溯注解"菜单项是否可见 |
| `gitblame.vcsType` | `'git'` / `'svn'` / `''`，控制显示哪个命令 |

## 调试日志前缀

| 前缀 | 模块 |
|---|---|
| `[EXT]` | extension.ts 主流程 |
| `[VCS]` | detectVcsType() |
| `[SVN]` | svn.ts SVN 相关 |
| `[GIT]` | svn.ts Git 检测 |

## 热力图颜色

`getCommitColor(commit, timestamp)`：
- **色相**：由 commit hash 计算（每个 commit 固定颜色）
- **饱和度**：基于提交距今天数指数衰减（近期鲜艳，久远偏灰）

## 实时编辑更新

编辑时不重新运行 git/svn 命令，由 `updateDecorationsOnChange()` → `resolveChange()` 在内存中直接修改 `blames[]`：
- 新增行 → 插入 uncommit blame
- 删除行 → splice 移除
- 修改行 → 标记为 uncommited

**保存时**触发完整 blame 刷新。

## 常见问题

**右键无菜单项**：检查控制台 `[VCS] detectVcsType done` 日志，确认返回了 `git` 或 `svn`。

**SVN blame 解析 0 条**：确认 `svn blame --xml` 输出的 XML 结构为 `<entry line-number="N"><commit revision="R">...</commit></entry>`，当前正则匹配此格式。

**SVN 命令兼容性**：不要使用 `--ignore-eol-style`（部分版本不支持），当前使用 `-x -w` 忽略空白符。
