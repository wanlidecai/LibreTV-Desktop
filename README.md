# LibreTV Desktop

把 [LibreSpark / LibreTV](https://github.com/LibreSpark/LibreTV) 装进独立桌面窗口。内置运行环境和本地服务，下载后双击启动，无需安装 Node.js、Docker 或自行部署服务器。

桌面版 **1.0.0**，基于上游 **2.16.12**。这是由 wanlidecai 维护的桌面封装，保留 LibreTV 原有搜索、点播、直播、观看历史与设置功能。

## 下载与安装

**[下载 Windows / macOS 版本](https://github.com/wanlidecai/LibreTV-Desktop/releases/latest)**

| 电脑 | 下载文件 | 打开方式 |
| --- | --- | --- |
| Windows 10 / 11，64 位 | 名称含 `Setup` 的 `.exe` | 双击安装，之后从桌面或开始菜单打开 LibreTV |
| Windows 10 / 11，64 位，免安装 | 名称含 `Portable` 的 `.exe` | 保存在固定文件夹，双击运行 |
| Apple 芯片 Mac（M1 / M2 / M3 / M4 等） | 名称含 `arm64` 的 `.dmg` | 打开磁盘映像，将 LibreTV 拖入「应用程序」，再双击启动 |
| Intel 芯片 Mac | 名称含 `x64` 的 `.dmg` | 打开磁盘映像，将 LibreTV 拖入「应用程序」，再双击启动 |

Mac 可在苹果菜单 →「关于本机」确认芯片。Windows 安装版与免安装版均为 x64。

macOS 发布包**仅进行本地临时签名，未使用 Apple Developer ID 证书，未经过 Apple 公证**；Windows 发布包未进行代码签名。Mac 首次打开若被系统拦截，请确认来自本仓库的 Releases，再到「系统设置 → 隐私与安全性」找到 LibreTV，选择「仍要打开」并按提示确认。受单位管理的电脑可能不允许此操作。Windows 也可能显示未知发布者或 SmartScreen 提示；请先核对下载来源。

## 开始使用

1. 打开程序，首次启动需准备本地运行文件，稍等后自动进入首页，无需输入访问密码。
2. 点击右上角「设置 → 源管理」，自行添加点播 API、直播 M3U 订阅或数据源订阅。
3. 在首页搜索影片，或进入「直播」选择频道。播放、推荐与在线数据源需要网络。
4. 观看历史、主题和数据源配置保存在这台电脑。通过「设置 → 数据」导出配置，可迁移到另一台电脑。

程序不内置影视资源或直播频道源；请使用有权访问的数据源。来源的可用性、清晰度和播放兼容性取决于相应服务。

关闭最后一个窗口会退出应用并停止本地服务。重复双击会聚焦已打开的窗口。免安装版仍将设置保存在系统的用户数据目录，不会把个人数据放在 `.exe` 旁边。

详细安装、备份、更新及故障处理见 **[桌面版使用说明](docs/DESKTOP.md)**。

## 从源码构建

建议使用 Node.js 22 LTS 和 npm，在目标操作系统上构建：

```bash
npm ci
npm run desktop:build
npm run desktop:start
```

真实桌面启动、页面导航、自动认证、数据持久化及退出清理烟测：

```bash
npm run desktop:smoke
```

打包命令及发布流程见 [桌面版开发与构建](docs/DESKTOP.md#开发与构建)。构建不需要用户自行提供服务器，安装包包含 Electron 和本地 Next.js 服务。网页部署方式保存在 [上游 README](README.upstream.md)。

## 开源与致谢

上游项目：[LibreSpark / LibreTV](https://github.com/LibreSpark/LibreTV)，感谢 LibreTV 贡献者。桌面封装由 wanlidecai 维护。

本项目遵循 **AGPL-3.0-or-later**，完整许可证见 [LICENSE](LICENSE)。本仓库公开桌面封装及对应上游源码；发布版本可通过同名 Git 标签取得对应源码。第三方依赖遵循各自许可证。
