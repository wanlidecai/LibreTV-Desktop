# 内置点播源清单

LibreTV Desktop **1.0.1** 将下面 22 个普通点播源的名称和 API 地址随应用打包在本地。首次使用或从 1.0.0 升级时默认启用，可以直接在首页搜索，无需先下载源订阅。

可在「设置 → 源管理 → 点播源」查看和检测这些源。取消选择某个源后，重启会保留该选择；也可以继续添加自定义点播源。应用没有内置直播 M3U 频道源。

## 出处与收录范围

来源为上游 [LibreSpark / LibreTV](https://github.com/LibreSpark/LibreTV) 的历史提交 **`65382704af751ac034cce616b3dd63fec7ddbb43`**，提交日期 **2025-08-06**。固定版本文件：[js/config.js](https://github.com/LibreSpark/LibreTV/blob/65382704af751ac034cce616b3dd63fec7ddbb43/js/config.js)。

上游当前 main 已移除该源列表；本版本明确采用上述历史配置中的 `API_SITES`，保留普通点播源的原顺序、名称及 API 地址的原协议和路径，统一去除地址末尾的斜杠，与应用原有 `getEnvSources` 的处理一致。唯一排除项是 `testSource`「空内容测试源」，其地址为 `https://www.example.com/api.php/provide/vod`，属于测试占位，不收录进应用。

## 22 个内置源

| 顺序 | 名称 | API 地址 |
| --- | --- | --- |
| 1 | 电影天堂资源 | `http://caiji.dyttzyapi.com/api.php/provide/vod` |
| 2 | 如意资源 | `https://cj.rycjapi.com/api.php/provide/vod` |
| 3 | 暴风资源 | `https://bfzyapi.com/api.php/provide/vod` |
| 4 | 天涯资源 | `https://tyyszy.com/api.php/provide/vod` |
| 5 | 小猫咪资源 | `https://zy.xmm.hk/api.php/provide/vod` |
| 6 | 非凡影视 | `http://ffzy5.tv/api.php/provide/vod` |
| 7 | 黑木耳 | `https://json.heimuer.xyz/api.php/provide/vod` |
| 8 | 360资源 | `https://360zy.com/api.php/provide/vod` |
| 9 | iqiyi资源 | `https://www.iqiyizyapi.com/api.php/provide/vod` |
| 10 | 卧龙资源 | `https://wolongzyw.com/api.php/provide/vod` |
| 11 | 华为吧资源 | `https://cjhwba.com/api.php/provide/vod` |
| 12 | 极速资源 | `https://jszyapi.com/api.php/provide/vod` |
| 13 | 豆瓣资源 | `https://dbzy.tv/api.php/provide/vod` |
| 14 | 魔爪资源 | `https://mozhuazy.com/api.php/provide/vod` |
| 15 | 魔都资源 | `https://www.mdzyapi.com/api.php/provide/vod` |
| 16 | 最大资源 | `https://api.zuidapi.com/api.php/provide/vod` |
| 17 | 樱花资源 | `https://m3u8.apiyhzy.com/api.php/provide/vod` |
| 18 | 百度云资源 | `https://api.apibdzy.com/api.php/provide/vod` |
| 19 | 无尽资源 | `https://api.wujinapi.me/api.php/provide/vod` |
| 20 | 旺旺短剧 | `https://wwzy.tv/api.php/provide/vod` |
| 21 | iKun资源 | `https://ikunzyapi.com/api.php/provide/vod` |
| 22 | 量子资源站 | `https://cj.lziapi.com/api.php/provide/vod` |

## 可用性

以上是可追溯的配置清单，不代表每个源当前都能搜索或播放。应用没有打包视频文件；搜索、播放和在线推荐需要网络，结果取决于网络连接和第三方源状态。出现超时、无结果或播放失败时，可在源管理中检测、取消选择该源或添加其他来源。

应用不会为了获得这份内置列表而在启动时下载订阅。用户另行添加的数据源订阅仍按其自己的订阅设置更新。
