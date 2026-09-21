# 📅 ECNU 课表导入日历

把华东师范大学学生管理系统里“只告诉你第几周、却不告诉你具体哪天”的课表，翻译成 macOS Calendar、Windows Outlook 和其他日历应用真正听得懂的日程。

> 告别手动数周数。毕竟我们来学校是学习的，不是参加《最强大脑：今天到底第几周》。🧠

## ✨ 能做什么

- 🔎 直接读取 `byyt.ecnu.edu.cn` 当前登录账号的课表接口
- 🗓️ 把教学周、星期和节次换算成准确日期与时间
- 🧩 支持连续周、离散周、单双周和临时调课
- ⏰ 为每节课设置提前提醒
- 🍎 自动适配 macOS Calendar
- 🪟 自动适配 Windows Outlook / 默认日历应用
- 🔒 所有解析均在浏览器本地完成，不上传 Cookie、Token 或课表内容
- 🛟 接口读取失败时，自动尝试从页面课表兜底解析

## 🚀 安装

### 从 Release 安装（推荐）

1. 在仓库右侧打开 **Releases**，下载最新的 `ecnu-timetable-calendar-v*.zip`。
2. 解压 ZIP。
3. Chrome 打开 `chrome://extensions`；Edge 打开 `edge://extensions`。
4. 开启右上角的“开发者模式”。
5. 点击“加载已解压的扩展程序”，选择刚解压的文件夹。

> 浏览器可能会郑重其事地提醒你这是开发者扩展。放心，它只是想看课表，没有兴趣接管世界。🌍

### 从源码安装

克隆仓库后，直接在扩展管理页加载仓库根目录即可。项目是原生 HTML/CSS/JavaScript，没有 `node_modules` 黑洞，也没有“先编译半小时再说”的仪式感。

## 🧭 使用

1. 登录华师大学生管理系统，打开“我的课表”。
2. 点击浏览器工具栏里的扩展图标。
3. 检查“第 1 周周一”、提醒时间和日历名称。
4. 点击 **读取并预览课程**。
5. 确认课程、周次、地点和节次。
6. 点击平台对应的 **导入到日历** 按钮，在日历应用中确认导入。

扩展采用两段式交互：第一次点击读取课程并准备日历文件，第二次点击负责打开系统日历。这样既符合浏览器的安全规则，也避免你去下载目录里玩“大家来找 `.ics`”。🔍

## 🍎 macOS

按钮会显示为“导入到 macOS 日历”。准备完成后点击按钮，系统 Calendar 会打开导入确认窗口。

## 🪟 Windows

按钮会显示为“导入到 Outlook / 系统日历”。

- 经典 Outlook 或已经关联 `.ics` 的应用通常会直接打开导入窗口。
- 如果新 Outlook 没有自动打开，请进入 **日历 → 添加日历 → 从文件上传**，选择下载目录中刚生成的 `.ics`。
- 请确认 Outlook 的日历通知以及 Windows 的“设置 → 系统 → 通知”均已开启。

生成文件包含标准 `VALARM`、`VTIMEZONE` 和 Outlook 忙碌状态字段。也就是说，提醒不是一句“理论上支持”，而是认真写进日历文件里的。⏰

## 🔐 隐私与权限

扩展只申请完成任务所需的权限：

- `activeTab` / `scripting`：读取当前课表页面
- `storage`：保存日期、提醒和日历名称设置
- `downloads` / `downloads.open`：生成并打开 `.ics`
- `byyt.ecnu.edu.cn`：访问学校课表接口

扩展不会把登录凭据硬编码进源码，也不会把课表发送到第三方服务器。请不要在 Issue 中粘贴 Cookie、Token 或完整 curl——它们不是“调试信息”，而是账号钥匙。🗝️

## 🧑‍💻 开发

要求：Node.js 20+，以及用于打包的 `zip`。

```bash
npm test
npm run package
```

- `npm test`：运行课表解析、日期换算、ICS 与清单校验
- `npm run package`：在 `dist/` 生成可发布 ZIP

核心目录：

```text
├── manifest.json
├── popup.html / popup.css / popup.js
├── api-hook.js
├── content.js
├── lib/schedule-core.js
├── tests/
└── scripts/
```

## 🤖 GitHub Actions

- 每次 Push / Pull Request 自动执行测试并生成构建产物。
- 推送 `v*` 标签时，自动校验标签与 `manifest.json` 版本一致，并创建 GitHub Release。

发布新版本：

```bash
git tag v1.7.0
git push origin v1.7.0
```

剩下的交给机器人。机器人不抱怨加班，这一点令人羡慕。🤖

## ⚠️ 说明

- 本项目是非官方工具，与华东师范大学无隶属或背书关系。
- 学校系统接口或页面改版后，解析器可能需要同步更新。
- 导入前请检查课程预览；软件很努力，但它还没有选课退课的自主权。

## 📄 License

[MIT](LICENSE) — 欢迎改进、适配其他学校，或者只是来修一个逗号。
