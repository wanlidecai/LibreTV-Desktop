// Original LibreTV API_SITES, copied from the immutable revision below (AGPL-3.0-or-later).
// Keep this order stable: upstream maps array positions to persistent env_<index> keys.
// Only the example.com test placeholder is omitted; trailing URL slashes are normalized.
const sourceProvenance = Object.freeze({
  "repository": "https://github.com/LibreSpark/LibreTV",
  "commit": "65382704af751ac034cce616b3dd63fec7ddbb43",
  "path": "js/config.js",
  "date": "2025-08-06"
});

const bundledSources = Object.freeze([
  {
    "name": "电影天堂资源",
    "url": "http://caiji.dyttzyapi.com/api.php/provide/vod",
    "detail": "http://caiji.dyttzyapi.com",
    "isAdult": false
  },
  {
    "name": "如意资源",
    "url": "https://cj.rycjapi.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "暴风资源",
    "url": "https://bfzyapi.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "天涯资源",
    "url": "https://tyyszy.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "小猫咪资源",
    "url": "https://zy.xmm.hk/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "非凡影视",
    "url": "http://ffzy5.tv/api.php/provide/vod",
    "detail": "http://ffzy5.tv",
    "isAdult": false
  },
  {
    "name": "黑木耳",
    "url": "https://json.heimuer.xyz/api.php/provide/vod",
    "detail": "https://heimuer.tv",
    "isAdult": false
  },
  {
    "name": "360资源",
    "url": "https://360zy.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "iqiyi资源",
    "url": "https://www.iqiyizyapi.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "卧龙资源",
    "url": "https://wolongzyw.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "华为吧资源",
    "url": "https://cjhwba.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "极速资源",
    "url": "https://jszyapi.com/api.php/provide/vod",
    "detail": "https://jszyapi.com",
    "isAdult": false
  },
  {
    "name": "豆瓣资源",
    "url": "https://dbzy.tv/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "魔爪资源",
    "url": "https://mozhuazy.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "魔都资源",
    "url": "https://www.mdzyapi.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "最大资源",
    "url": "https://api.zuidapi.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "樱花资源",
    "url": "https://m3u8.apiyhzy.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "百度云资源",
    "url": "https://api.apibdzy.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "无尽资源",
    "url": "https://api.wujinapi.me/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "旺旺短剧",
    "url": "https://wwzy.tv/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "iKun资源",
    "url": "https://ikunzyapi.com/api.php/provide/vod",
    "isAdult": false
  },
  {
    "name": "量子资源站",
    "url": "https://cj.lziapi.com/api.php/provide/vod",
    "isAdult": false
  }
].map(source => Object.freeze(source)));

module.exports = { bundledSources, sourceProvenance };
