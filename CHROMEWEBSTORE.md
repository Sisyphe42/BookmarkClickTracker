# Chrome Web Store Listing — Bookmark Click Tracker

> Last Updated: 2026-09-15

## Store Listing

**Extension Name**

Bookmark Click Tracker

**Short Description**

Track bookmark visits, discover your most-used links and folders, and export your usage statistics.

**Detailed Description (English)**

Bookmark Click Tracker shows which saved links you actually use, helping you understand and organize a growing bookmark collection.

FEATURES
• Automatically counts visits to saved bookmarks
• See total bookmarks, total visits, average visits, folder count, and your most-used folder
• Compare folder activity with a distribution chart and review your top 10 bookmarks
• Search by bookmark title or URL
• Filter by folder and time range
• Sort by title, visit count, or last access time
• View first and most recent access timestamps
• Export your statistics as CSV or JSON
• Merge statistics when a bookmark URL changes
• Clean records for deleted bookmarks or reset selected counts
• Switch between English and Chinese

HOW TO USE
1. Click the extension icon in the Chrome toolbar.
2. Browse the overview to see your bookmark and folder statistics.
3. Use search, folder filters, date filters, and sorting to find the links you need.
4. Open the menu to export data, merge bookmark records, clean deleted bookmarks, or reset counts.
5. Hover over a Last Access value to see full timestamps and folder information.

PRIVACY
Bookmark visit statistics are stored locally in your browser. The extension does not sell data, run analytics, show ads, or send your bookmark data to the developer or other third parties.

PERMISSIONS
Access to bookmarks, browsing history, and page navigation is used only to identify when a visited page matches one of your saved bookmarks and update its local count. Access to website addresses is needed so bookmarked pages can be recognized across the sites you visit. Storage is used to keep statistics and language preferences on your device.

SUPPORT
Found a bug or have a suggestion? Open an issue at https://github.com/Sisyphe42/BookmarkClickTracker/issues or email az0189re@gmail.com.

Version 2.2 — Introduces a new logo and refreshes the store presentation.

**Detailed Description (Chinese / 简体中文)**

书签点击统计会记录你真正使用过的书签，帮助你看清常用链接与文件夹，并整理不断增长的书签库。

主要功能
• 自动统计已保存书签的访问次数
• 查看书签总数、总访问次数、平均访问次数、文件夹数量和最常用文件夹
• 通过分类分布图与 Top 10 榜单快速识别高频书签
• 按书签标题或网址搜索
• 按文件夹与时间范围筛选
• 按标题、访问次数或最后访问时间排序
• 查看首次访问与最近访问的完整时间
• 将统计数据导出为 CSV 或 JSON
• 书签网址变更后可合并历史统计
• 清理已删除书签的记录，或重置指定/选中书签的计数
• 支持中文与英文界面切换

使用方法
1. 点击 Chrome 工具栏中的扩展图标。
2. 在概览中查看书签与文件夹统计。
3. 使用搜索、文件夹筛选、时间筛选与排序定位所需书签。
4. 打开右上角菜单，可导出数据、合并书签记录、清理已删除书签或重置计数。
5. 将鼠标悬停在“最后访问”上，可查看完整时间与所属文件夹。

隐私说明
书签访问统计保存在你的浏览器本地。本扩展不出售数据、不投放广告、不使用分析服务，也不会把书签数据发送给开发者或其他第三方。

权限说明
书签、浏览历史和页面导航权限仅用于判断当前访问页面是否为已保存书签，并更新本地计数。网站地址访问权限用于在你访问不同网站时识别书签页面；存储权限用于在设备上保存统计数据与语言偏好。

支持与反馈
如发现问题或有功能建议，请前往 https://github.com/Sisyphe42/BookmarkClickTracker/issues 提交，或发送邮件至 az0189re@gmail.com。

2.2 版本 — 启用全新 Logo，并更新商店展示内容。

**Category**

Productivity

**Single Purpose**

Tracks how often saved bookmarks are visited and presents local usage statistics for those bookmarks.

**Primary Language**

English (with Simplified Chinese localization)

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | Ready | `icon128.png` |
| Screenshot 1 | 1280×800 PNG | Ready | `store-assets/preview-1-1280x800.png` |
| Screenshot 2 | 1280×800 PNG | Ready | `store-assets/preview-2-1280x800.png` |
| Small Promo Tile | 440×280 | Not created | |
| Marquee Promo Tile | 1400×560 | Not created | |

### Screenshot Notes

Both store screenshots are faithful 1280×800 crops derived from the two images embedded in `README.md`: the statistics dashboard and the actions/language menu.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `bookmarks` | permissions | Reads the user's saved bookmark tree so visited URLs can be matched to bookmarks and grouped by bookmark folder. |
| `storage` | permissions | Stores visit counts, timestamps, and the user's language preference locally in Chrome. It also migrates legacy synchronized counts to local storage during an update. |
| `unlimitedStorage` | permissions | Prevents a large bookmark collection and its long-term visit history from exceeding the normal local storage quota. |
| `webNavigation` | permissions | Detects completed top-level page navigations so a matching saved bookmark visit can be counted. |
| `history` | permissions | Checks Chrome's visit transition information to distinguish bookmark-originated navigation and avoid inaccurate counts. |
| `<all_urls>` | host_permissions | Allows the extension to recognize saved bookmark destinations across arbitrary websites; page content is not read or modified. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes, only for local processing. Bookmark URLs, visit counts, and access timestamps are stored on the user's device for the extension's single purpose and are not transmitted to the developer or third parties. A one-time update migration may read legacy counts from Chrome Sync, copy them into local storage, and remove the synchronized copy.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Web history | Yes | No | Match visited URLs to saved bookmarks and calculate usage statistics. | No |
| User activity | Yes | No | Store bookmark visit counts and first/last access timestamps. | No |
| Website content | No | No | Page content is never read. | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**

https://sisyphe42.github.io/BookmarkClickTracker/bookmark-click-tracker-privacy.html

## Distribution

**Visibility**: Public

**Regions**: All regions

## Developer Info

**Publisher Name**

Sisyphe42

**Contact Email**

az0189re@gmail.com

**Support URL / Email**

https://github.com/Sisyphe42/BookmarkClickTracker/issues

**Homepage URL**

https://github.com/Sisyphe42/BookmarkClickTracker

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.2 | 2026-09-15 | New logo and refreshed Chrome Web Store description and screenshots. | Draft |
| 2.1 | 2026-09-14 | Search UX improvements, bookmark-stat merging, privacy policy, and automated release workflow. | Published |

## Review Notes

### Known Issues / Limitations

- Chrome internal pages and non-HTTP(S) bookmark targets are not counted.
- The extension records matching page visits; it does not read or alter page content.

### Rejection History

None recorded.
