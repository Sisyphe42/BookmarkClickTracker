# BookmarkClickTracker

一个 Chrome 浏览器扩展，用于统计和追踪书签的点击次数。

## 功能特性

- 📊 **点击统计** - 自动追踪每个书签的点击次数
- 📈 **数据统计** - 显示总书签数、总点击次数、平均点击次数、分类数等
- 🔍 **搜索过滤** - 支持按标题或 URL 搜索书签
- 📑 **分类管理** - 自动识别书签的一级分类（文件夹）
- 🕒 **时间追踪** - 记录首次访问和最后访问时间
- 📤 **数据导出** - 支持导出 CSV 和 JSON 格式
- 🎨 **Material Design** - 现代化的用户界面设计

## 预览效果

打开 `preview.html` 文件可以在浏览器中查看扩展的实际使用效果。

### 界面展示

扩展弹窗包含以下部分：

1. **搜索栏** - 顶部搜索框，支持实时搜索过滤
2. **数据菜单** - 搜索框右侧的菜单按钮（⋮），包含：
   - 打开书签管理器
   - 导出 CSV
   - 导出 JSON
   - 重置指定计数
   - 清空所有数据

3. **统计面板** - 显示关键统计数据：
   - 总书签数
   - 总点击次数
   - 平均点击次数
   - 分类数
   - 访问最多的分类

4. **书签列表** - 表格形式展示所有书签：
   - 标题（可排序）
   - URL（可点击跳转）
   - 点击次数（可排序）
   - 最后访问时间（可排序，悬停显示详细信息）

### 示例数据

预览页面包含以下示例书签数据：

| 标题 | URL | 点击 | 最后访问 |
|------|-----|------|----------|
| GitHub | https://github.com | 89 | 2小时前 |
| Stack Overflow | https://stackoverflow.com | 67 | 1天前 |
| MDN Web Docs | https://developer.mozilla.org | 54 | 3天前 |
| Chrome DevTools | https://developer.chrome.com/docs/devtools | 43 | 5天前 |
| VS Code | https://code.visualstudio.com | 32 | 1周前 |
| React 官方文档 | https://react.dev | 28 | 2周前 |
| TypeScript 手册 | https://www.typescriptlang.org/docs | 21 | 3周前 |
| YouTube | https://www.youtube.com | 8 | 1个月前 |

## 安装使用

1. 下载或克隆此仓库
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用方法

1. 点击浏览器工具栏中的扩展图标
2. 查看书签点击统计数据
3. 使用搜索框快速查找书签
4. 点击表头进行排序
5. 通过菜单导出数据或管理统计

## 技术栈

- Chrome Extension Manifest V3
- HTML5 / CSS3
- JavaScript (ES6+)
- Material Design 设计规范
