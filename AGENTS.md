# 项目上下文

## 项目概述

素人登记小程序 - 推广部买手信息管理平台。桌面端优先，数据存储在浏览器端（IndexedDB via Dexie.js），无后端服务器。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: Dexie.js (IndexedDB 封装)
- **导出**: xlsx (Excel 导出)

## 目录结构

```
├── public/                     # 静态资源
├── scripts/                    # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局（AuthProvider）
│   │   ├── page.tsx            # 根页面（重定向到登录/仪表板）
│   │   ├── globals.css         # 全局样式（青色主题）
│   │   ├── login/page.tsx      # 登录页
│   │   ├── dashboard/page.tsx  # 主仪表板（列表/搜索/筛选/分页）
│   │   ├── records/
│   │   │   ├── new/page.tsx    # 新增记录
│   │   │   └── [id]/page.tsx   # 查看/编辑记录详情
│   │   ├── profile/page.tsx    # 个人中心
│   │   └── admin/page.tsx      # 管理员用户管理
│   ├── components/
│   │   ├── ui/                 # Shadcn UI 组件库
│   │   ├── records/
│   │   │   ├── record-form.tsx  # 记录表单组件（Sheet内使用）
│   │   │   ├── record-detail.tsx # 记录详情组件（Dialog内使用）
│   │   │   ├── record-card.tsx  # 记录卡片组件（备用）
│   │   │   ├── filter-panel.tsx # 筛选面板（备用）
│   │   │   └── batch-import-dialog.tsx # 批量导入对话框
│   │   └── layout/
│   │       └── top-nav.tsx      # 顶部导航栏
│   ├── contexts/
│   │   └── auth-context.tsx    # 认证上下文
│   └── lib/
│       ├── types.ts            # 类型定义与常量
│       ├── db.ts               # Dexie 数据库配置
│       ├── auth.ts             # 密码哈希与会话管理
│       ├── export.ts           # Excel 导出工具
│       └── utils.ts            # 通用工具函数
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 核心功能模块

1. **认证系统**: PBKDF2 密码哈希，sessionStorage 会话管理，默认管理员 admin/admin123
2. **数据管理**: IndexedDB 存储，支持 CRUD、关键字搜索、多条件筛选、分页
3. **权限控制**: 三种角色 — 普通员工（查看/新增/编辑）、子管理员（查看/新增/编辑/导出/导入）、管理员（全部权限+账号管理）；仅管理员可删除记录
4. **Excel 导出**: 按筛选条件导出 xlsx 文件（仅管理员和子管理员可导出）
5. **批量导入**: 上传 Excel 文件批量导入素人记录，支持字段自动映射、数据预览、校验提示（仅管理员和子管理员可导入）
6. **用户管理**: 管理员可创建/停用/删除员工账号，可设置/取消子管理员角色

## 数据模型

- **User**: id, username, displayName, passwordHash, salt, role, status
- **BuyerRecord**: id, creatorId, creatorName, country, buyerType, name, platformType, whatsapp, paypal, amazonProfile, sellerHomeResult, orderNumber, orderStatus, remarks

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
