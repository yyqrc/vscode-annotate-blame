# Git/SVN Blame Annotations 开发文档

## 一、项目概述

本插件基于 [vscode-gitblame-annotations](https://github.com/lkqm/vscode-gitblame-annotations) 开发，在原有 Git Blame 功能基础上增加了 SVN 支持。

### 功能特性
- 支持 Git 和 SVN 两种版本控制系统的 blame 注解
- 在编辑器 gutter（行号区域）显示提交信息
- 悬停显示详细提交信息（commit id、作者、日期、提交说明）
- 支持右键菜单 "Annotate with Git Blame" 切换显示/隐藏
- 自动检测文件所属的版本控制系统类型

## 二、项目结构

```
temp-clone/
├── src/
│   ├── extension.ts      # 主入口文件
│   ├── git.ts            # Git blame 核心逻辑（原有）
│   ├── svn.ts            # SVN blame 核心逻辑（新增）
│   └── ...
├── out/                  # 编译输出目录
├── package.json          # 插件配置
├── tsconfig.json         # TypeScript 配置
└── gitblame-annotations-x.x.x.vsix  # 安装包
```

## 三、核心模块说明

### 1. svn.ts - SVN 支持模块

#### 主要函数

| 函数名 | 功能 |
|--------|------|
| `isSvnWorkingCopy(filePath)` | 检测文件是否在 SVN 工作副本中 |
| `isGitRepository(filePath)` | 检测文件是否在 Git 仓库中 |
| `detectVcsType(filePath)` | 检测版本控制系统类型，返回 `'git' \| 'svn' \| undefined` |
| `getSvnBlames(workDir, file)` | 获取文件的 SVN blame 信息 |

#### SVN Blame 命令

```typescript
// 使用 -x -w 忽略空白符变化
svn blame --xml -x -w -- <filename>
```

#### 返回数据格式

```typescript
interface Blame {
    line: number;          // 行号
    commit: string;         // SVN 版本号（如 "1234"）
    author: string;        // 提交者
    mail: string;          // 邮箱（SVN 无此字段，为空）
    timestamp: number;     // 时间戳
    summary: string;       // 提交说明（SVN 使用 "r{版本号}" 格式）
    commited: boolean;     // 是否已提交
    title: string;        // 显示标题（由 fillTitles 函数生成）
}
```

### 2. extension.ts - 主入口文件

#### 核心流程

```
用户右键点击行号 → git.blame.show 命令 → showDecorations() → 
detectVcsType() 检测 VCS 类型 → 调用对应 getBlames/getSvnBlames → 
buildDecorationOptions() 生成装饰器 → 显示注解
```

#### 关键函数

| 函数名 | 功能 |
|--------|------|
| `activate()` | 插件激活入口 |
| `registerCommands()` | 注册命令 |
| `registerListeners()` | 注册事件监听 |
| `showDecorations()` | 显示 blame 注解 |
| `hideDecorations()` | 隐藏 blame 注解 |
| `updateMenuContext()` | 更新右键菜单状态 |
| `buildDecorationOptions()` | 构建装饰器选项 |

## 四、调试日志

在开发调试时，代码中包含以下日志前缀：

| 日志前缀 | 说明 |
|----------|------|
| `[SVN]` | SVN 检测相关日志 |
| `[VCS]` | 版本控制系统检测日志 |
| `[EXT]` | 扩展主流程日志 |

## 五、版本历史

| 版本 | 更新内容 |
|------|----------|
| 0.2.2 | 原始 Git Blame 功能 |
| 0.3.0 | 集成 SVN 支持（初始版本） |
| 0.3.1 | 修复 SVN 命令兼容性 |
| 0.3.2 | 优化 VCS 检测逻辑 |
| 0.3.4 | 添加详细调试日志，排查右键菜单问题 |

## 六、构建与发布

### 构建命令

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 打包 VSIX 安装包
npx vsce package -o <output-name>.vsix
```

### 版本号更新

修改 `package.json` 中的 `version` 字段，然后执行打包命令。

## 七、注意事项

1. **SVN 命令兼容性**：部分 SVN 版本不支持 `--ignore-eol-style` 选项，当前使用 `-x -w` 忽略空白符变化
2. **Windows 路径问题**：Windows 路径大小写可能不一致，SVN 检测时使用 `path.dirname()` 获取目录
3. **右键菜单逻辑**：菜单显示依赖于 `updateMenuContext()` 函数检测 VCS 类型

## 八、常见问题排查

### 1. 右键菜单无反应

排查步骤：
1. 查看 VSCode 开发者工具控制台日志
2. 确认 `[VCS] Result - isGit: ..., isSvn: ...` 输出
3. 如果 `isSvn: false`，检查文件路径是否正确

### 2. SVN blame 获取失败

排查步骤：
1. 确认终端中 `svn blame --help` 正常工作
2. 检查命令是否包含 `--ignore-eol-style`（部分版本不支持）
3. 查看错误日志中的具体错误信息

### 3. 菜单显示但点击无效果

排查步骤：
1. 检查 `showDecorations()` 函数是否被调用
2. 确认 `detectVcsType()` 返回正确的类型
3. 查看 `getSvnBlames()` 是否成功获取数据
