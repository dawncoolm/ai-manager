# AI Skills Manager 功能文档

## 概述

AI Skills Manager 是 ai-manager 桌面应用的核心功能模块，用于统一管理当前电脑上所有 AI 编码工具的 Skills。支持 Windows、macOS、Linux 三平台。

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS 4 + Vite 7
- **后端**: Tauri v2 (Rust)
- **路由**: react-router-dom (Hash Router)
- **状态管理**: Zustand
- **Markdown 渲染**: react-markdown + remark-gfm + remark-frontmatter
- **图标**: lucide-react

## 支持的 AI 工具

### 有 Skills 系统的工具

| 工具 | 配置目录 | Skills 目录 | 配置文件 |
|------|---------|------------|---------|
| Claude Code | `~/.claude/` | `skills/` | `settings.json`, `CLAUDE.md` |
| Codex (OpenAI) | `~/.codex/` | `skills/.system/` | `config.toml`, `AGENTS.md` |
| Google Gemini | `~/.gemini/` | `skills/` | `settings.json`, `GEMINI.md` |
| GitHub Copilot | `~/.copilot/` | `skills/` | - |

### 仅有配置的工具

| 工具 | 配置目录 | 主要配置 |
|------|---------|---------|
| Cursor | 平台相关 (见跨平台章节) | IDE 配置 |
| CodeBuddy | `~/.codebuddy/` | `mcp.json`, `argv.json` |
| CodeGeex | `~/.codegeex/` | agent 配置 |
| MarsCode | `~/.marscode/` | `config.json` |
| Lingma | `~/.lingma/` | `lingma_mcp.json` |
| Kiro | `~/.kiro/` | settings |
| Gongfeng Copilot | `~/.gongfeng_copilot/` | `config.json` |
| CodingCopilot | `~/.codingCopilot/` | MCP 配置 |

### 共享 Skills Hub

位置: `~/.agents/skills/`

多个工具通过 symlink 共用此中心仓库中的 skills。

## Skill 文件格式

```
skills/skill-name/
├── SKILL.md          # YAML frontmatter + Markdown 正文
├── references/       # 可选参考文件
├── agents/           # 可选 agent 配置 (如 openai.yaml)
├── scripts/          # 可选脚本
└── LICENSE.txt
```

### SKILL.md 格式

```markdown
---
name: skill-name
description: 技能描述
allowed-tools: Bash(tool:*), Read, Write
---

# Skill 内容
Markdown 格式的指令和文档...
```

## 跨平台支持

### 路径解析

大部分工具以用户 home 目录为基准，三平台一致 (`~/.claude/`, `~/.codex/` 等)。Rust 端使用 `dirs::home_dir()` 获取 home 目录，`std::path::PathBuf` 拼接路径。

### Cursor 特殊路径

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\Cursor\` |
| macOS | `~/Library/Application Support/Cursor/` |
| Linux | `~/.config/Cursor/` |

### Symlink 处理

| 平台 | API | 权限要求 |
|------|-----|---------|
| Linux/macOS | `std::os::unix::fs::symlink()` | 无 |
| Windows | `std::os::windows::fs::symlink_dir()` | 开发者模式或管理员权限 |

使用条件编译 `#[cfg(unix)]` / `#[cfg(windows)]` 处理差异。

## 项目结构

### 前端

```
src/
├── main.tsx                         # Hash Router 入口
├── App.tsx                          # AppShell 布局 (Sidebar + Outlet)
├── types/
│   ├── index.ts                     # 公共类型
│   └── skills.ts                    # Skills 模块类型 (AiTool, Skill, SkillContent)
├── store/
│   └── useSkillsStore.ts            # Zustand store (tools, hubSkills)
├── api/
│   └── skills.ts                    # Tauri invoke() 封装 (8 个 API)
├── hooks/
│   ├── useAiTools.ts                # 获取 AI 工具列表
│   ├── useSkills.ts                 # 获取指定工具的 skills
│   └── useSkillContent.ts           # 获取 skill 完整内容
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx              # 侧边栏 (模块导航 + 子导航)
│   ├── ui/                          # 通用 UI 组件
│   │   ├── Badge.tsx                # 标签 (5 种变体)
│   │   ├── StatusDot.tsx            # 状态指示点
│   │   ├── EmptyState.tsx           # 空状态占位
│   │   ├── LoadingSpinner.tsx       # 加载中
│   │   ├── MarkdownViewer.tsx       # Markdown 渲染器
│   │   └── SearchInput.tsx          # 搜索输入框
│   └── skills/                      # Skills 模块组件
│       ├── ToolCard.tsx             # 工具卡片
│       ├── SkillCard.tsx            # Skill 卡片
│       ├── SkillActions.tsx         # Skill 操作 (禁用/移除)
│       ├── InstallDialog.tsx        # 安装到工具弹窗
│       └── ConfigViewer.tsx         # 配置文件查看器
└── pages/
    ├── Home.tsx                     # 全局首页 (功能模块入口)
    ├── Settings.tsx                 # 全局设置
    └── skills/                      # Skills 模块页面
        ├── SkillsDashboard.tsx      # 工具概览 (卡片网格, 按能力分组)
        ├── ToolDetailPage.tsx       # 工具详情 (Skills 列表 + Config)
        ├── SkillDetailPage.tsx      # Skill 详情 (Markdown 渲染 + 元数据)
        └── HubPage.tsx             # 共享 Skills Hub (安装管理)
```

### Rust 后端

```
src-tauri/src/
├── main.rs              # 应用入口
├── lib.rs               # Tauri Builder, 注册所有 commands
└── skills/              # Skills 模块
    ├── mod.rs           # 模块导出
    ├── commands.rs      # 8 个 Tauri command 函数
    ├── models.rs        # 数据结构 (AiToolInfo, SkillInfo, SkillContent 等)
    ├── registry.rs      # 工具注册表 (12 个工具, 跨平台路径解析)
    ├── parser.rs        # SKILL.md YAML frontmatter 解析
    └── fs_utils.rs      # 跨平台 symlink 操作 (创建/删除/检测)
```

## 路由结构

```
/                                    → 全局首页 (功能模块入口导航)
/skills                              → Skills Dashboard (工具概览)
/skills/tools/:toolId                → 工具详情 (skills 列表 + 配置)
/skills/tools/:toolId/:skillName     → Skill 详情 (Markdown 渲染)
/skills/hub                          → 共享 Skills Hub
/skills/hub/:skillName               → Hub Skill 详情
/settings                            → 全局设置
```

应用采用模块化路由设计，未来可扩展 `/mcp/`、`/rules/` 等功能模块。

## Rust Tauri Commands

| Command | 参数 | 返回 | 说明 |
|---------|------|------|------|
| `scan_ai_tools` | - | `Vec<AiToolInfo>` | 扫描本机所有已注册 AI 工具 |
| `list_skills` | `tool_id` | `Vec<SkillInfo>` | 列出指定工具的 skills |
| `read_skill` | `skill_path` | `SkillContent` | 读取 SKILL.md + references |
| `get_hub_skills` | - | `Vec<SkillInfo>` | 读取共享 hub 的 skills (含安装状态) |
| `install_skill` | `hub_skill_name`, `tool_id` | `()` | 从 hub 安装 skill (创建 symlink) |
| `remove_skill` | `tool_id`, `skill_name` | `()` | 移除 skill (symlink 解除/目录删除) |
| `toggle_skill` | `tool_id`, `skill_name`, `enabled` | `()` | 启用/禁用 (重命名加 `.disabled-` 前缀) |
| `read_config_file` | `file_path` | `String` | 读取配置文件内容 |

## 数据模型

### AiTool (前端类型)

```typescript
interface AiTool {
  id: string;              // 工具标识 (如 "claude", "codex")
  name: string;            // 显示名称
  config_dir: string;      // 配置目录绝对路径
  capability: "skills" | "config-only" | "detected-only";
  skills_dir: string | null;
  config_files: ConfigFile[];
  skill_count: number;
  detected: boolean;       // 目录是否存在
}
```

### Skill

```typescript
interface Skill {
  name: string;            // 从 YAML frontmatter 解析
  description: string;
  allowed_tools: string | null;
  dir_name: string;        // 目录名 (slug)
  dir_path: string;        // 绝对路径
  skill_file_path: string; // SKILL.md 绝对路径
  is_symlink: boolean;     // 是否为 symlink
  symlink_target: string | null;
  has_references: boolean;
  has_agents: boolean;
  has_scripts: boolean;
  installed_in: string[];  // 已安装到哪些工具 (hub skills 专用)
}
```

### SkillContent

```typescript
interface SkillContent {
  frontmatter: Record<string, string>;  // YAML frontmatter 键值对
  markdown_body: string;                // Markdown 正文
  raw_content: string;                  // 原始文件内容
  references: ReferenceFile[];          // references/ 目录下的文件
}
```

## 依赖清单

### npm packages

| 包名 | 用途 |
|------|------|
| react-router-dom | Hash Router 路由 |
| zustand | 轻量状态管理 |
| react-markdown | Markdown 渲染 |
| remark-gfm | GitHub Flavored Markdown |
| remark-frontmatter | 跳过 YAML frontmatter |
| gray-matter | 解析 YAML frontmatter |
| lucide-react | 图标库 |

### Rust crates

| crate | 用途 |
|-------|------|
| walkdir | 递归目录遍历 |
| dirs | 跨平台 home 目录获取 |
| serde / serde_json | 序列化 |

## 运行方式

```bash
# 开发模式
bun run tauri dev

# 构建
bun run tauri build
```

## 注意事项

- Windows 创建 symlink 需要开发者模式或管理员权限
- Codex 的 skills 在 `.system/` 子目录下，代码已做特殊处理
- Gemini/Copilot 的 skills 目录可能为空，UI 会显示空状态引导
- 所有文件系统操作通过 Rust 后端处理，前端不直接访问文件系统
