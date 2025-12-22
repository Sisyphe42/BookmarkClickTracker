// 全局变量
let allBookmarkData = [];
let currentSortField = "clicks"; // title, clicks, lastClick
let currentSortOrder = "desc"; // asc, desc
let currentSearchQuery = "";
let selectedFolders = new Set(); // 选中的分类
let selectedBookmarks = new Set(); // 选中的书签URL
let currentDateRange = "all"; // 日期范围筛选

// 确保 DOM 已加载
function init() {
    const searchBox = document.getElementById("searchBox");
    const menuButton = document.getElementById("menuButton");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const openBookmarkManagerBtn = document.getElementById("openBookmarkManager");
    const generateSampleDataBtn = document.getElementById("generateSampleData");
    const exportCSVBtn = document.getElementById("exportCSV");
    const exportJSONBtn = document.getElementById("exportJSON");
    const resetSpecificBtn = document.getElementById("resetSpecific");
    const cleanDeletedBtn = document.getElementById("cleanDeleted");
    const clearAllBtn = document.getElementById("clearAll");

    // 表头排序
    document.querySelectorAll(".sortable-header").forEach(header => {
        header.addEventListener("click", () => {
            const sortField = header.getAttribute("data-sort");
            
            // 如果点击的是当前排序字段，切换排序方向
            if (currentSortField === sortField) {
                currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
            } else {
                // 否则设置为新字段，默认降序
                currentSortField = sortField;
                currentSortOrder = "desc";
            }
            
            // 更新表头样式
            updateSortHeaders();
            displayBookmarkList();
        });
    });

    // 搜索框
    searchBox.addEventListener("input", (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        displayBookmarkList();
    });

    // 日期范围筛选
    const dateRangeSelect = document.getElementById("dateRangeSelect");
    dateRangeSelect.addEventListener("change", (e) => {
        currentDateRange = e.target.value;
        displayBookmarkList();
    });

    // 分类筛选器（在loadAndDisplayData后初始化）

    // 菜单按钮
    const menuContainer = menuButton.closest(".menu-container");
    menuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
    });

    // 点击外部关闭菜单
    document.addEventListener("click", (e) => {
        if (!menuContainer.contains(e.target)) {
            dropdownMenu.classList.remove("show");
        }
        // 关闭所有操作菜单
        document.querySelectorAll(".action-dropdown").forEach(menu => {
            if (!menu.contains(e.target) && !e.target.closest(".action-button")) {
                menu.classList.remove("show");
            }
        });
    });

    // 打开书签管理器
    openBookmarkManagerBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: "chrome://bookmarks/" });
        dropdownMenu.classList.remove("show");
    });

    // 生成示例数据
    generateSampleDataBtn.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
        if (confirm("生成示例数据将覆盖现有数据，是否继续？")) {
            generateSampleData();
        }
    });

    // 导出CSV
    exportCSVBtn.addEventListener("click", () => {
        exportToCSV();
        dropdownMenu.classList.remove("show");
    });

    // 导出JSON
    exportJSONBtn.addEventListener("click", () => {
        exportToJSON();
        dropdownMenu.classList.remove("show");
    });

    // 重置指定计数
    resetSpecificBtn.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
        const url = prompt("请输入要重置的书签URL（必须与原始URL完全一致）:");
        if (url && url.trim()) {
            const trimmedUrl = url.trim();
            chrome.storage.local.get("clickCounts", (data) => {
                const clickCounts = data.clickCounts || {};
                if (clickCounts[trimmedUrl]) {
                    if (confirm(`确定要重置该URL的点击次数吗？\n${trimmedUrl}`)) {
                        delete clickCounts[trimmedUrl];
                        chrome.storage.local.set({ clickCounts }, () => {
                            loadAndDisplayData();
                            alert("重置成功");
                        });
                    }
                } else {
                    alert("未找到匹配的URL，请确认URL是否完全一致");
                }
            });
        }
    });

    // 清理已删除书签
    cleanDeletedBtn.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
        cleanDeletedBookmarks();
    });

    // 清空所有数据
    clearAllBtn.addEventListener("click", () => {
        if (confirm("确定要清空所有统计数据吗？此操作不可恢复！")) {
            clearAllData();
            dropdownMenu.classList.remove("show");
        }
    });

    // 批量操作
    const selectAllCheckbox = document.getElementById("selectAll");
    const batchActions = document.getElementById("batchActions");
    const selectedCount = document.getElementById("selectedCount");
    const batchResetBtn = document.getElementById("batchReset");
    const batchCancelBtn = document.getElementById("batchCancel");

    selectAllCheckbox.addEventListener("change", (e) => {
        const checked = e.target.checked;
        document.querySelectorAll(".bookmark-checkbox").forEach(cb => {
            cb.checked = checked;
            const url = cb.dataset.url;
            if (checked) {
                selectedBookmarks.add(url);
            } else {
                selectedBookmarks.delete(url);
            }
        });
        updateBatchActions();
    });

    batchResetBtn.addEventListener("click", () => {
        if (selectedBookmarks.size === 0) return;
        if (confirm(`确定要重置选中的 ${selectedBookmarks.size} 个书签的点击次数吗？`)) {
            batchResetSelected();
        }
    });

    batchCancelBtn.addEventListener("click", () => {
        selectedBookmarks.clear();
        selectAllCheckbox.checked = false;
        document.querySelectorAll(".bookmark-checkbox").forEach(cb => {
            cb.checked = false;
        });
        updateBatchActions();
    });

    function batchResetSelected() {
        const count = selectedBookmarks.size;
        const urlsToReset = Array.from(selectedBookmarks);
        chrome.storage.local.get("clickCounts", (data) => {
            const clickCounts = data.clickCounts || {};
            urlsToReset.forEach(url => {
                delete clickCounts[url];
            });
            chrome.storage.local.set({ clickCounts }, () => {
                selectedBookmarks.clear();
                selectAllCheckbox.checked = false;
                updateBatchActions();
                loadAndDisplayData();
                alert(`已重置 ${count} 个书签的点击次数`);
            });
        });
    }

    // 初始加载
    loadAndDisplayData();
}

// 更新批量操作UI（需要在init外部定义，以便displayBookmarkList可以访问）
function updateBatchActions() {
    const batchActions = document.getElementById("batchActions");
    const selectedCount = document.getElementById("selectedCount");
    const selectAllCheckbox = document.getElementById("selectAll");
    
    if (!batchActions || !selectedCount || !selectAllCheckbox) return;
    
    const count = selectedBookmarks.size;
    selectedCount.textContent = count;
    if (count > 0) {
        batchActions.classList.add("show");
    } else {
        batchActions.classList.remove("show");
    }
    selectAllCheckbox.checked = count > 0 && count === document.querySelectorAll(".bookmark-checkbox").length;
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM 已经加载完成
    init();
}

// 更新表头排序样式
function updateSortHeaders() {
    document.querySelectorAll(".sortable-header").forEach(header => {
        header.classList.remove("sort-asc", "sort-desc");
        const sortField = header.getAttribute("data-sort");
        if (currentSortField === sortField) {
            header.classList.add(currentSortOrder === "asc" ? "sort-asc" : "sort-desc");
        }
    });
}

// 性能优化：批量获取所有书签，建立URL映射，并获取一级分类信息
function getAllBookmarks() {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((bookmarkTreeNodes) => {
            const urlMap = new Map();
            const folderMap = new Map(); // 存储文件夹ID到文件夹名称的映射
            
            // 首先构建文件夹映射
            function buildFolderMap(nodes, parentFolder = null) {
                nodes.forEach((node) => {
                    if (!node.url) {
                        // 这是一个文件夹
                        folderMap.set(node.id, {
                            name: node.title,
                            parent: parentFolder
                        });
                        if (node.children) {
                            buildFolderMap(node.children, node.title);
                        }
                    } else if (node.children) {
                        // 有子节点的节点
                        buildFolderMap(node.children, parentFolder);
                    }
                });
            }
            
            // 构建书签映射，同时记录一级分类
            function traverse(nodes, currentFolder = null) {
                nodes.forEach((node) => {
                    if (node.url) {
                        // 这是一个书签
                        urlMap.set(node.url, {
                            title: node.title,
                            id: node.id,
                            folder: currentFolder || "其他"
                        });
                    } else {
                        // 这是一个文件夹
                        const folderName = node.title;
                        if (node.children) {
                            traverse(node.children, folderName);
                        }
                    }
                });
            }
            
            buildFolderMap(bookmarkTreeNodes);
            traverse(bookmarkTreeNodes);
            resolve(urlMap);
        });
    });
}

// 格式化时间
function formatTime(timestamp) {
    if (!timestamp) return "从未";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}天前`;
    } else if (hours > 0) {
        return `${hours}小时前`;
    } else if (minutes > 0) {
        return `${minutes}分钟前`;
    } else {
        return "刚刚";
    }
}

// 加载并显示数据
async function loadAndDisplayData() {
    const bookmarkList = document.getElementById("bookmarkList");
    bookmarkList.innerHTML = "<tr><td colspan='5' style='text-align: center; padding: 20px;'>加载中...</td></tr>";
    
    // 使用 local storage
    chrome.storage.local.get("clickCounts", async (data) => {
        const clickCounts = data.clickCounts || {};
        
        try {
            // 批量获取所有书签
            const bookmarkMap = await getAllBookmarks();
            
            // 转换数据格式，兼容新旧格式
            allBookmarkData = [];
            Object.entries(clickCounts).forEach(([url, value]) => {
            // 兼容旧格式（直接是数字）和新格式（对象）
            const count = typeof value === "number" ? value : (value.count || 0);
            const bookmarkInfo = bookmarkMap.get(url);
            
            if (bookmarkInfo) {
                allBookmarkData.push({
                    url: url,
                    title: bookmarkInfo.title,
                    folder: bookmarkInfo.folder || "其他",
                    clicks: count,
                    firstClick: typeof value === "object" ? value.firstClick : null,
                    lastClick: typeof value === "object" ? value.lastClick : null,
                    deleted: false
                });
            } else {
                // 书签已删除
                allBookmarkData.push({
                    url: url,
                    title: "已删除的书签",
                    folder: "其他",
                    clicks: count,
                    firstClick: typeof value === "object" ? value.firstClick : null,
                    lastClick: typeof value === "object" ? value.lastClick : null,
                    deleted: true
                });
            }
        });
        
            displayBookmarkList();
            updateSortHeaders();
            updateFilterChips();
        } catch (error) {
            console.error('加载数据时出错:', error);
            bookmarkList.innerHTML = "<tr><td colspan='5' style='text-align: center; padding: 20px; color: #d32f2f;'>加载数据时出错，请刷新重试</td></tr>";
        }
    });
}

// 更新分类筛选器
function updateFilterChips() {
    const filterChips = document.getElementById("filterChips");
    if (!filterChips) return;
    
    // 获取所有分类
    const folders = new Set();
    allBookmarkData.forEach(bookmark => {
        if (bookmark.folder) {
            folders.add(bookmark.folder);
        }
    });
    
    // 按点击次数排序分类
    const folderClicks = new Map();
    allBookmarkData.forEach(bookmark => {
        if (bookmark.folder) {
            const currentClicks = folderClicks.get(bookmark.folder) || 0;
            folderClicks.set(bookmark.folder, currentClicks + bookmark.clicks);
        }
    });
    
    const sortedFolders = Array.from(folders).sort((a, b) => {
        const clicksA = folderClicks.get(a) || 0;
        const clicksB = folderClicks.get(b) || 0;
        return clicksB - clicksA;
    });
    
    filterChips.innerHTML = "";
    
    // 添加"全部"选项
    const allChip = document.createElement("div");
    allChip.classList.add("filter-chip", "clear-all");
    allChip.textContent = "全部";
    if (selectedFolders.size === 0) {
        allChip.classList.add("active");
    }
    allChip.addEventListener("click", () => {
        selectedFolders.clear();
        updateFilterChips();
        displayBookmarkList();
    });
    filterChips.appendChild(allChip);
    
    // 添加分类选项
    sortedFolders.forEach(folder => {
        const chip = document.createElement("div");
        chip.classList.add("filter-chip");
        if (selectedFolders.has(folder)) {
            chip.classList.add("active");
        }
        
        const clicks = folderClicks.get(folder) || 0;
        chip.textContent = `${folder} (${clicks})`;
        
        chip.addEventListener("click", () => {
            if (selectedFolders.has(folder)) {
                selectedFolders.delete(folder);
            } else {
                selectedFolders.add(folder);
            }
            updateFilterChips();
            displayBookmarkList();
        });
        
        filterChips.appendChild(chip);
    });
}

// 显示书签列表
function displayBookmarkList() {
    const bookmarkList = document.getElementById("bookmarkList");
    
    // 搜索过滤
    let filteredData = allBookmarkData;
    if (currentSearchQuery) {
        filteredData = filteredData.filter(bookmark => 
            bookmark.title.toLowerCase().includes(currentSearchQuery) ||
            bookmark.url.toLowerCase().includes(currentSearchQuery)
        );
    }
    
    // 分类筛选
    if (selectedFolders.size > 0) {
        filteredData = filteredData.filter(bookmark => 
            selectedFolders.has(bookmark.folder)
        );
    }
    
    // 日期范围筛选
    if (currentDateRange !== "all") {
        const now = Date.now();
        let startTime = 0;
        
        switch (currentDateRange) {
            case "today":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "week":
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case "month":
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case "3months":
                startTime = now - 90 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
        }
        
        filteredData = filteredData.filter(bookmark => {
            if (!bookmark.lastClick) return false;
            return bookmark.lastClick >= startTime;
        });
    }
    
    // 排序
    let sortedData = [...filteredData];
    sortedData.sort((a, b) => {
        let aVal, bVal;
        
        switch (currentSortField) {
            case "title":
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                if (aVal < bVal) return currentSortOrder === "asc" ? -1 : 1;
                if (aVal > bVal) return currentSortOrder === "asc" ? 1 : -1;
                return 0;
            case "clicks":
                aVal = a.clicks;
                bVal = b.clicks;
                return currentSortOrder === "asc" ? aVal - bVal : bVal - aVal;
            case "lastClick":
                aVal = a.lastClick || 0;
                bVal = b.lastClick || 0;
                return currentSortOrder === "asc" ? aVal - bVal : bVal - aVal;
            default:
                return 0;
        }
    });
    
    // 更新统计信息
    updateStats(filteredData);
    
    // 更新图表
    updateCharts(filteredData);
    
    // 清空列表
    bookmarkList.innerHTML = "";
    
    if (sortedData.length === 0) {
        bookmarkList.innerHTML = "<tr><td colspan='5' style='text-align: center; padding: 20px;'>" + 
            (currentSearchQuery ? "未找到匹配的书签" : "暂无书签点击数据") + "</td></tr>";
        return;
    }
    
    // 批量渲染
    sortedData.forEach((bookmark) => {
        const row = document.createElement("tr");

        // 复选框列
        const checkboxCell = document.createElement("td");
        checkboxCell.classList.add("checkbox-cell");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("bookmark-checkbox");
        checkbox.dataset.url = bookmark.url;
        checkbox.checked = selectedBookmarks.has(bookmark.url);
        checkbox.addEventListener("change", (e) => {
            const url = e.target.dataset.url;
            if (e.target.checked) {
                selectedBookmarks.add(url);
            } else {
                selectedBookmarks.delete(url);
            }
            updateBatchActions();
        });
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        const titleCell = document.createElement("td");
        if (bookmark.deleted) {
            titleCell.innerHTML = `<span style="color: rgba(0, 0, 0, 0.38); text-decoration: line-through;">${bookmark.title}</span>`;
            row.style.opacity = "0.6";
        } else {
            titleCell.textContent = bookmark.title;
        }
        row.appendChild(titleCell);

        const urlCell = document.createElement("td");
        const urlDiv = document.createElement("div");
        urlDiv.classList.add("url-wrap");
        const urlLink = document.createElement("a");
        urlLink.href = bookmark.url;
        urlLink.textContent = bookmark.url;
        urlLink.target = "_blank";
        urlDiv.appendChild(urlLink);
        urlCell.appendChild(urlDiv);
        row.appendChild(urlCell);

        const clicksCell = document.createElement("td");
        clicksCell.textContent = bookmark.clicks;
        clicksCell.style.textAlign = "center";
        row.appendChild(clicksCell);

        const timeCell = document.createElement("td");
        const timeDiv = document.createElement("div");
        timeDiv.classList.add("tooltip");
        
        const timeText = document.createElement("span");
        timeText.textContent = formatTime(bookmark.lastClick);
        timeText.classList.add("time-info");
        timeDiv.appendChild(timeText);
        
        // 工具提示显示完整时间信息
        const tooltip = document.createElement("span");
        tooltip.classList.add("tooltiptext");
        let tooltipText = `最后访问: ${bookmark.lastClick ? new Date(bookmark.lastClick).toLocaleString("zh-CN") : "从未"}`;
        if (bookmark.firstClick) {
            tooltipText += `\n首次访问: ${new Date(bookmark.firstClick).toLocaleString("zh-CN")}`;
        }
        if (bookmark.folder) {
            tooltipText += `\n分类: ${bookmark.folder}`;
        }
        tooltip.textContent = tooltipText;
        tooltip.style.whiteSpace = "pre-line";
        timeDiv.appendChild(tooltip);
        
        timeCell.appendChild(timeDiv);
        row.appendChild(timeCell);

        bookmarkList.appendChild(row);
    });
}

// 重置单个书签的计数
function resetBookmarkCount(url) {
    chrome.storage.local.get("clickCounts", (data) => {
        const clickCounts = data.clickCounts || {};
        if (clickCounts[url]) {
            delete clickCounts[url];
            chrome.storage.local.set({ clickCounts }, () => {
                // 重新加载数据
                loadAndDisplayData();
            });
        }
    });
}

// 更新图表
function updateCharts(data) {
    // 检查 Chart.js 是否已加载
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js 未加载，跳过图表更新');
        // 延迟重试
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                updateCharts(data);
            }
        }, 100);
        return;
    }
    
    // 分类分布饼图
    const folderClicks = new Map();
    data.forEach(bookmark => {
        if (bookmark.folder) {
            const currentClicks = folderClicks.get(bookmark.folder) || 0;
            folderClicks.set(bookmark.folder, currentClicks + bookmark.clicks);
        }
    });
    
    const folderLabels = Array.from(folderClicks.keys());
    const folderData = Array.from(folderClicks.values());
    
    const folderCtx = document.getElementById('folderChart');
    const folderChartEmpty = document.getElementById('folderChartEmpty');
    if (folderCtx) {
        // 销毁旧图表
        if (window.folderChartInstance) {
            window.folderChartInstance.destroy();
            window.folderChartInstance = null;
        }
        
        // 如果没有数据，显示空状态
        if (folderLabels.length === 0 || folderData.every(v => v === 0)) {
            folderCtx.style.display = 'none';
            if (folderChartEmpty) folderChartEmpty.style.display = 'flex';
            return;
        }
        
        folderCtx.style.display = 'block';
        if (folderChartEmpty) folderChartEmpty.style.display = 'none';
        
        window.folderChartInstance = new Chart(folderCtx, {
            type: 'doughnut',
            data: {
                labels: folderLabels,
                datasets: [{
                    data: folderData,
                    backgroundColor: [
                        '#1976d2',
                        '#388e3c',
                        '#f57c00',
                        '#7b1fa2',
                        '#c2185b',
                        '#0097a7',
                        '#455a64',
                        '#d32f2f'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 11
                            },
                            padding: 8
                        }
                    }
                }
            }
        });
    }
    
    // Top 10 书签条形图
    const sortedBookmarks = [...data]
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);
    
    const bookmarkLabels = sortedBookmarks.map(b => {
        const title = b.title.length > 15 ? b.title.substring(0, 15) + '...' : b.title;
        return title;
    });
    const bookmarkData = sortedBookmarks.map(b => b.clicks);
    
    const bookmarkCtx = document.getElementById('topBookmarksChart');
    const topBookmarksChartEmpty = document.getElementById('topBookmarksChartEmpty');
    if (bookmarkCtx) {
        // 销毁旧图表
        if (window.bookmarkChartInstance) {
            window.bookmarkChartInstance.destroy();
            window.bookmarkChartInstance = null;
        }
        
        // 如果没有数据，显示空状态
        if (bookmarkLabels.length === 0 || bookmarkData.every(v => v === 0)) {
            bookmarkCtx.style.display = 'none';
            if (topBookmarksChartEmpty) topBookmarksChartEmpty.style.display = 'flex';
            return;
        }
        
        bookmarkCtx.style.display = 'block';
        if (topBookmarksChartEmpty) topBookmarksChartEmpty.style.display = 'none';
        
        window.bookmarkChartInstance = new Chart(bookmarkCtx, {
            type: 'bar',
            data: {
                labels: bookmarkLabels,
                datasets: [{
                    label: '点击次数',
                    data: bookmarkData,
                    backgroundColor: '#1976d2'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }
}

// 更新统计信息
function updateStats(data) {
    const totalBookmarks = data.length;
    const totalClicks = data.reduce((sum, bookmark) => sum + bookmark.clicks, 0);
    const avgClicks = totalBookmarks > 0 ? (totalClicks / totalBookmarks).toFixed(1) : 0;
    
    // 统计分类数和访问最多的分类
    const folders = new Set();
    const folderClicks = new Map();
    
    data.forEach(bookmark => {
        if (bookmark.folder) {
            folders.add(bookmark.folder);
            const currentClicks = folderClicks.get(bookmark.folder) || 0;
            folderClicks.set(bookmark.folder, currentClicks + bookmark.clicks);
        }
    });
    
    const totalFolders = folders.size;
    
    // 找出访问最多的分类
    let topFolder = "-";
    let maxClicks = 0;
    folderClicks.forEach((clicks, folder) => {
        if (clicks > maxClicks) {
            maxClicks = clicks;
            topFolder = folder;
        }
    });
    
    document.getElementById("totalBookmarks").textContent = totalBookmarks;
    document.getElementById("totalClicks").textContent = totalClicks;
    document.getElementById("avgClicks").textContent = avgClicks;
    document.getElementById("totalFolders").textContent = totalFolders;
    document.getElementById("topFolder").textContent = topFolder;
}

// 导出CSV
function exportToCSV() {
    if (allBookmarkData.length === 0) {
        alert("没有数据可导出");
        return;
    }
    
    const headers = ["标题", "URL", "点击次数", "首次访问", "最后访问"];
    const rows = allBookmarkData.map(bookmark => [
        bookmark.title,
        bookmark.url,
        bookmark.clicks,
        bookmark.firstClick ? new Date(bookmark.firstClick).toLocaleString("zh-CN") : "从未",
        bookmark.lastClick ? new Date(bookmark.lastClick).toLocaleString("zh-CN") : "从未"
    ]);
    
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmark_clicks_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// 导出JSON
function exportToJSON() {
    if (allBookmarkData.length === 0) {
        alert("没有数据可导出");
        return;
    }
    
    const jsonData = {
        exportDate: new Date().toISOString(),
        totalBookmarks: allBookmarkData.length,
        totalClicks: allBookmarkData.reduce((sum, b) => sum + b.clicks, 0),
        bookmarks: allBookmarkData.map(bookmark => ({
            title: bookmark.title,
            url: bookmark.url,
            clicks: bookmark.clicks,
            firstClick: bookmark.firstClick,
            lastClick: bookmark.lastClick,
            firstClickFormatted: bookmark.firstClick ? new Date(bookmark.firstClick).toLocaleString("zh-CN") : null,
            lastClickFormatted: bookmark.lastClick ? new Date(bookmark.lastClick).toLocaleString("zh-CN") : null
        }))
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmark_clicks_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// 清理已删除书签
function cleanDeletedBookmarks() {
    chrome.storage.local.get("clickCounts", async (data) => {
        const clickCounts = data.clickCounts || {};
        const bookmarkMap = await getAllBookmarks();
        
        let deletedCount = 0;
        const cleanedCounts = {};
        
        Object.entries(clickCounts).forEach(([url, value]) => {
            const bookmarkInfo = bookmarkMap.get(url);
            if (bookmarkInfo) {
                // 书签仍然存在，保留数据
                cleanedCounts[url] = value;
            } else {
                // 书签已删除
                deletedCount++;
            }
        });
        
        if (deletedCount === 0) {
            alert("没有发现已删除的书签");
            return;
        }
        
        if (confirm(`发现 ${deletedCount} 个已删除书签的数据，是否清理？`)) {
            chrome.storage.local.set({ clickCounts: cleanedCounts }, () => {
                loadAndDisplayData();
                alert(`已清理 ${deletedCount} 个已删除书签的数据`);
            });
        }
    });
}

// 生成示例数据
function generateSampleData() {
    const now = Date.now();
    const sampleData = {
        "https://github.com": {
            count: 89,
            firstClick: now - 90 * 24 * 60 * 60 * 1000,
            lastClick: now - 2 * 60 * 60 * 1000
        },
        "https://stackoverflow.com": {
            count: 67,
            firstClick: now - 120 * 24 * 60 * 60 * 1000,
            lastClick: now - 1 * 24 * 60 * 60 * 1000
        },
        "https://developer.mozilla.org": {
            count: 54,
            firstClick: now - 150 * 24 * 60 * 60 * 1000,
            lastClick: now - 3 * 24 * 60 * 60 * 1000
        },
        "https://developer.chrome.com/docs/devtools": {
            count: 43,
            firstClick: now - 100 * 24 * 60 * 60 * 1000,
            lastClick: now - 5 * 24 * 60 * 60 * 1000
        },
        "https://code.visualstudio.com": {
            count: 32,
            firstClick: now - 200 * 24 * 60 * 60 * 1000,
            lastClick: now - 7 * 24 * 60 * 60 * 1000
        },
        "https://react.dev": {
            count: 28,
            firstClick: now - 180 * 24 * 60 * 60 * 1000,
            lastClick: now - 14 * 24 * 60 * 60 * 1000
        },
        "https://www.typescriptlang.org/docs": {
            count: 21,
            firstClick: now - 160 * 24 * 60 * 60 * 1000,
            lastClick: now - 21 * 24 * 60 * 60 * 1000
        },
        "https://www.youtube.com": {
            count: 8,
            firstClick: now - 300 * 24 * 60 * 60 * 1000,
            lastClick: now - 30 * 24 * 60 * 60 * 1000
        },
        "https://www.npmjs.com": {
            count: 45,
            firstClick: now - 110 * 24 * 60 * 60 * 1000,
            lastClick: now - 1 * 60 * 60 * 1000
        },
        "https://nodejs.org": {
            count: 38,
            firstClick: now - 130 * 24 * 60 * 60 * 1000,
            lastClick: now - 2 * 24 * 60 * 60 * 1000
        },
        "https://web.dev": {
            count: 25,
            firstClick: now - 140 * 24 * 60 * 60 * 1000,
            lastClick: now - 4 * 24 * 60 * 60 * 1000
        },
        "https://css-tricks.com": {
            count: 19,
            firstClick: now - 170 * 24 * 60 * 60 * 1000,
            lastClick: now - 10 * 24 * 60 * 60 * 1000
        },
        "https://www.w3schools.com": {
            count: 15,
            firstClick: now - 250 * 24 * 60 * 60 * 1000,
            lastClick: now - 15 * 24 * 60 * 60 * 1000
        },
        "https://www.reddit.com": {
            count: 12,
            firstClick: now - 220 * 24 * 60 * 60 * 1000,
            lastClick: now - 6 * 24 * 60 * 60 * 1000
        },
        "https://medium.com": {
            count: 6,
            firstClick: now - 280 * 24 * 60 * 60 * 1000,
            lastClick: now - 45 * 24 * 60 * 60 * 1000
        }
    };

    // 先获取现有书签，确保示例数据中的URL都是真实存在的书签
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        const existingUrls = new Set();
        
        function collectUrls(nodes) {
            nodes.forEach((node) => {
                if (node.url) {
                    existingUrls.add(node.url);
                }
                if (node.children) {
                    collectUrls(node.children);
                }
            });
        }
        
        collectUrls(bookmarkTreeNodes);
        
        // 只保留存在的书签URL
        const validSampleData = {};
        Object.keys(sampleData).forEach(url => {
            if (existingUrls.has(url)) {
                validSampleData[url] = sampleData[url];
            }
        });
        
        // 如果用户没有这些书签，生成一些通用的示例数据
        if (Object.keys(validSampleData).length === 0) {
            // 获取用户现有的书签，为它们生成示例数据
            const userBookmarks = [];
            function collectBookmarks(nodes) {
                nodes.forEach((node) => {
                    if (node.url && node.url.startsWith("http")) {
                        userBookmarks.push({
                            url: node.url,
                            title: node.title
                        });
                    }
                    if (node.children) {
                        collectBookmarks(node.children);
                    }
                });
            }
            collectBookmarks(bookmarkTreeNodes);
            
            // 为前15个书签生成示例数据
            userBookmarks.slice(0, 15).forEach((bookmark, index) => {
                const daysAgo = Math.floor(Math.random() * 90) + 1;
                const clicks = Math.floor(Math.random() * 80) + 5;
                validSampleData[bookmark.url] = {
                    count: clicks,
                    firstClick: now - (daysAgo + 30) * 24 * 60 * 60 * 1000,
                    lastClick: now - daysAgo * 24 * 60 * 60 * 1000
                };
            });
        }
        
        chrome.storage.local.set({ clickCounts: validSampleData }, () => {
            loadAndDisplayData();
            alert(`已生成 ${Object.keys(validSampleData).length} 条示例数据`);
        });
    });
}

// 清空所有数据
function clearAllData() {
    chrome.storage.local.set({ clickCounts: {} }, () => {
        allBookmarkData = [];
        displayBookmarkList();
        alert("所有数据已清空");
    });
}
