# LibreTV 桌面版使用说明

桌面版 1.0.0 · 上游 LibreTV 2.16.12

## 下载与首次启动

下载入口：[GitHub Releases](https://github.com/wanlidecai/LibreTV-Desktop/releases/latest)。请根据电脑选择 Windows x64 安装版 / 免安装版，或 macOS Apple 芯片 arm64 / Intel x64 版本。

Windows 安装版：双击名称含 `Setup` 的 `.exe`，按向导安装，再打开开始菜单或桌面上的 LibreTV。免安装版：把名称含 `Portable` 的 `.exe` 保存在固定文件夹，双击运行即可；它仍会把配置保存在系统用户数据目录。

Mac：打开对应架构的 `.dmg`，把 LibreTV 拖进「应用程序」。完成复制后推出磁盘映像，从「应用程序」中打开。

macOS 发布包仅进行本地临时签名，未使用 Apple Developer ID 证书，未经过 Apple 公证；Windows 发布包未进行代码签名。首次打开若被系统阻止，请先确认下载来自本仓库的 Releases，然后进入「系统设置 → 隐私与安全性」，在 LibreTV 提示旁选择「仍要打开」，按提示确认。若看不到该选项，请先尝试打开一次应用，再返回设置查看；受管理设备也可能由管理员禁止运行。Windows 可能提示未知发布者或 SmartScreen 警告，应先核对下载来源。

首次启动会把内置服务复制到自己的可写数据目录，随后自动打开首页。无需安装 Node.js、Docker，也不需要填写访问密码。应用仅在本机回环地址启动服务，自动完成认证。

## 添加数据源与观看

- 点播：右上角「设置 → 源管理 → 点播源」，添加可使用的 Apple CMS API 地址，勾选后回到首页搜索。
- 直播：「设置 → 源管理 → 直播源」，添加 M3U / M3U8 订阅，可选填 XMLTV 节目单地址；在「直播」页面选择频道。
- 批量订阅：「设置 → 源管理 → 数据源订阅」可导入 LibreTV 源列表或支持的 TVBOX 配置。
- 历史与续播：播放进度和观看历史保存在本机；更换电脑前可在「设置 → 数据」导出配置与记录。

应用不内置影视资源或直播频道源。请自行添加有权访问的数据源；推荐列表、在线搜索与播放需要网络。数据源失效时，请在设置中检查或更换地址。具体支持能力沿用 [上游说明](../README.upstream.md)。

## 常用操作

| 操作 | 入口 |
| --- | --- |
| 首页 | 文件 → 首页，或 `Ctrl/Cmd + 1` |
| 直播 | 文件 → 直播，或 `Ctrl/Cmd + 2` |
| 设置 | 右上角齿轮，或 `Ctrl/Cmd + ,` |
| 退出 | 关闭最后一个窗口，或文件 → 退出 LibreTV |
| 下载更新 | 帮助 → 下载新版本 |
| 打开本机数据 | 帮助 → 打开数据目录 |
| 查看启动日志 | 帮助 → 打开日志目录 |

关闭窗口会一并停止内置服务。重复启动会回到现有窗口，不会再启动一套服务。应用里的外部网站链接由系统默认浏览器打开。

## 数据、备份与更新

数据默认存放在：

- Windows：`%APPDATA%\LibreTV Desktop`
- macOS：`~/Library/Application Support/LibreTV Desktop`

通过「帮助 → 打开数据目录」可直接找到它。目录内包含浏览器存储、桌面配置、运行文件及日志；不要在应用运行时移动或删除。

日常迁移优先使用「设置 → 数据」导出功能。需要完整备份时，先退出应用，再复制整个数据目录。`desktop-settings.json` 记录本地端口与自动认证凭据；请与其余目录一起备份，勿公开分享。其端口与浏览器存储关联，随意更改端口会使原有配置暂时不可见。

更新采用手动下载：通过「帮助 → 下载新版本」取得新安装包，退出旧版后安装或替换应用。通常会继续使用原数据目录；更新前建议导出配置。当前版本不在后台自动下载安装更新。

如需彻底移除个人数据，先导出需要保留的记录，退出应用并卸载，再自行删除上述数据目录。仅删除或替换应用文件不会自动删除个人数据。

## 故障排查

**窗口停留在启动页或提示本地服务无法启动**：退出后重试，检查磁盘剩余空间与数据目录权限；通过「帮助 → 打开日志目录」读取 `desktop.log`。未能打开菜单时，可到上述数据目录的 `logs` 子目录查找。

**提示端口被占用**：退出 LibreTV，关闭占用该端口的其他程序，再重新打开。不要直接删除桌面配置，否则新的地址可能无法访问原有浏览器存储。

**首页能打开，但影片无法搜索或播放**：确认已添加并启用有效数据源，检查网络，使用设置中的源检测功能。桌面窗口打开成功不代表第三方源可用。

**界面看起来异常**：使用「显示 → 刷新」重载。提交问题时附上系统版本、芯片类型、桌面版版本和经过检查的错误信息；日志或配置可能包含本机路径和用户添加的地址，请先移除不希望公开的内容。

## 开发与构建

源代码与发布记录：[wanlidecai / LibreTV-Desktop](https://github.com/wanlidecai/LibreTV-Desktop)。

在目标操作系统及处理器架构上安装 Node.js 22 LTS 与 npm，执行：

```bash
npm ci
npm run desktop:build
npm run desktop:start
```

`desktop:build` 生成供应用使用的 `.desktop-server`，`desktop:start` 启动 Electron 桌面入口。打包前必须先完成构建。桌面入口与版本位于 `desktop/`，上游应用版本仍保留在根目录 `package.json`。

准备图标并打包（根据当前机器选择一条打包命令）：

```bash
npm run desktop:icons
# Apple 芯片 Mac
npm run desktop:pack -- --mac --arm64 --publish never
# Intel Mac
npm run desktop:pack -- --mac --x64 --publish never
# Windows x64
npm run desktop:pack -- --win --x64 --publish never
```

输出在 `dist-desktop/`。内置 Next.js 服务的依赖包含平台相关文件，每个目标必须先在对应系统与架构上执行 `desktop:build`；不要直接复用另一种平台的 `.desktop-server`。

自动化烟测：

```bash
npm run desktop:smoke
```

烟测使用真实 Electron 窗口和真实本地认证接口；覆盖首页、工具栏与原生菜单设置、直播页、渲染器隔离、localStorage / IndexedDB 重启持久化，以及关闭窗口后进程和端口退出。外部推荐请求使用固定空数据，避免测试依赖第三方数据源。证据截图与失败日志写入被 Git 忽略的 `artifacts/`。

测试已打包的程序时，将 `LIBRETV_EXECUTABLE` 设为实际可执行文件路径再运行烟测。例如 macOS 的 `LibreTV Desktop.app/Contents/MacOS/LibreTV Desktop`，或 Windows 解包目录内的 `LibreTV Desktop.exe`。烟测通过 `LIBRETV_USER_DATA` 使用临时隔离目录，不修改日常使用的数据。

GitHub Actions 工作流在 Windows x64、Mac Apple 芯片和 Mac Intel 三种环境分别构建。推送与 `desktop/package.json` 版本一致的 `desktop-v1.0.0` 格式标签后，所有构建成功才会上传发布包，并附上 `SHA256SUMS.txt`；发布资产及相应源码以 Releases 与 Git 标签为准。修改者也应依照 [AGPL-3.0-or-later](../LICENSE) 提供相应源码并保留 LibreTV 原始署名。
