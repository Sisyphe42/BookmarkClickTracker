// 全局变量
let allBookmarkData = [];
let currentLangOverride = null; // 'zh_CN' | 'en' | null
let currentSortField = "clicks"; // title, clicks, lastClick
let currentSortOrder = "desc"; // asc, desc
let currentSearchQuery = "";
let currentSearchMode = "bookmark"; // "bookmark" | "category"
let selectedFolders = new Set(); // 选中的分类
let selectedBookmarks = new Set(); // 选中的书签URL
let currentDateRange = "all"; // 日期范围筛选
let allCategoryPaths = new Set(); // 所有分类路径

// 确保 DOM 已加载
async function init() {
    const searchBox = document.getElementById("searchBox");
    const modeToggle = document.getElementById("modeToggle");
    const menuButton = document.getElementById("menuButton");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const openBookmarkManagerBtn = document.getElementById("openBookmarkManager");
    const generateSampleDataBtn = document.getElementById("generateSampleData");
    const exportCSVBtn = document.getElementById("exportCSV");
    const exportJSONBtn = document.getElementById("exportJSON");
    const resetSpecificBtn = document.getElementById("resetSpecific");
    const cleanDeletedBtn = document.getElementById("cleanDeleted");
    const clearAllBtn = document.getElementById("clearAll");
    const languageMenuToggle = document.getElementById("languageMenuToggle");
    const languageMenu = document.getElementById("languageMenu");
    const folderWrapper = document.getElementById("folderWrapper");
    const folderToggle = document.getElementById("folderToggle");
    const folderToggleIcon = document.getElementById("folderToggleIcon");

    await initLanguage();
    initI18n();

    // 模式切换按钮
    if (modeToggle) {
        modeToggle.addEventListener("click", () => {
            currentSearchMode = currentSearchMode === "bookmark" ? "category" : "bookmark";
            updateModeToggleUI();
            currentSearchQuery = "";
            searchBox.value = "";
            displayBookmarkList();
        });
    }

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

    // 分类展开/折叠
    if (folderWrapper && folderToggle && folderToggleIcon) {
        folderToggle.addEventListener("click", () => {
            const expanded = folderWrapper.classList.toggle("expanded");
            folderToggleIcon.src = expanded ? "assets/fold.svg" : "assets/expand.svg";
        });
    }

    // 点击外部关闭菜单
    document.addEventListener("click", (e) => {
        if (!menuContainer.contains(e.target)) {
            dropdownMenu.classList.remove("show");
        }
        if (languageMenu) languageMenu.classList.remove("show");
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
    
    // 语言按钮与菜单
    if (languageMenuToggle && languageMenu) {
        languageMenuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            languageMenu.classList.toggle("show");
        });
        languageMenu.querySelectorAll("button").forEach(btn => {
            btn.addEventListener("click", async () => {
                const lang = btn.getAttribute("data-lang");
                if (lang === "default") {
                    currentLangOverride = null;
                    chrome.storage.local.remove("langOverride", () => {});
                } else {
                    currentLangOverride = lang;
                    chrome.storage.local.set({ langOverride: lang }, () => {});
                }
                await initLanguage();
                initI18n();
                updateSortHeaders();
                displayBookmarkList();
                languageMenu.classList.remove("show");
            });
        });
    }

    // 生成示例数据
    generateSampleDataBtn.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
        if (confirm(t("confirmGenerateSampleData"))) {
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
        const url = prompt(t("promptResetSpecific"));
        if (url && url.trim()) {
            const trimmedUrl = url.trim();
            chrome.storage.local.get("clickCounts", (data) => {
                const clickCounts = data.clickCounts || {};
                if (clickCounts[trimmedUrl]) {
                    if (confirm(t("confirmResetSpecific", [trimmedUrl]))){
                        delete clickCounts[trimmedUrl];
                        chrome.storage.local.set({ clickCounts }, () => {
                            loadAndDisplayData();
                            alert(t("resetSuccess"));
                        });
                    }
                } else {
                    alert(t("notFoundExactURL"));
                }
            });
        }
    });

    // 合并书签
    const mergeBookmarksBtn = document.getElementById("mergeBookmarks");
    mergeBookmarksBtn.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
        mergeBookmarks();
    });

    // 清理已删除书签
    cleanDeletedBtn.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
        cleanDeletedBookmarks();
    });

    // 清空所有数据
    clearAllBtn.addEventListener("click", () => {
        if (confirm(t("confirmClearAll"))) {
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
        if (confirm(t("confirmBatchReset", [String(selectedBookmarks.size)]))) {
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
    const batchInfo = document.querySelector(".batch-info");
    if (batchInfo) {
        // 重置文本为“已选择 {count} 项”
        batchInfo.innerHTML = `${t("batchSelectedLabel")} <span id="selectedCount">${count}</span> ${t("batchItemsSuffix")}`;
    }
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

// 更新模式切换UI
function updateModeToggleUI() {
    const modeToggle = document.getElementById("modeToggle");
    const searchBox = document.getElementById("searchBox");
    
    if (modeToggle) {
        modeToggle.textContent = currentSearchMode === "bookmark" ? t("modeBookmark") : t("modeCategory");
        modeToggle.classList.toggle("active", currentSearchMode === "category");
    }
    
    if (searchBox) {
        if (currentSearchMode === "bookmark") {
            searchBox.placeholder = t("searchPlaceholder");
        } else {
            // 生成分类提示
            const categoryHint = generateCategoryHint();
            searchBox.placeholder = categoryHint;
        }
    }
}

// 生成分类提示
function generateCategoryHint() {
    if (allCategoryPaths.size === 0) {
        return t("categoryPlaceholderDefault");
    }
    
    // 获取书签数据中的分类
    const dataCategories = new Set();
    allBookmarkData.forEach(bookmark => {
        if (bookmark.folder) {
            dataCategories.add(bookmark.folder);
        }
    });
    
    // 优先使用书签数据中的分类
    const categories = dataCategories.size > 0 ? dataCategories : allCategoryPaths;
    
    // 找一个最短的分类路径作为示例
    const sortedCategories = Array.from(categories).sort((a, b) => a.length - b.length);
    const example = sortedCategories[0] || "A";
    
    // 如果示例包含/，说明是子分类
    if (example.includes("/")) {
        const parts = example.split("/");
        return t("categoryPlaceholderWithPath", [parts[0], parts.slice(0, 2).join("/")]);
    }
    
    return t("categoryPlaceholderSimple", [example]);
}

// 性能优化：批量获取所有书签，建立URL映射，并获取分类路径信息
function getAllBookmarks() {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((bookmarkTreeNodes) => {
            const urlMap = new Map();
            const categoryPaths = new Set();
            
            function isRootContainer(title) {
                return [
                    "书签栏",
                    "其他书签",
                    "移动书签",
                    "Bookmarks Bar",
                    "Bookmarks bar",
                    "Other Bookmarks",
                    "Mobile Bookmarks"
                ].includes(title);
            }
            
            function traverse(nodes, currentPath = [], inRoot = false) {
                nodes.forEach((node) => {
                    if (node.url) {
                        const folderPath = currentPath.length > 0 ? currentPath.join("/") : "其他";
                        urlMap.set(node.url, {
                            title: node.title,
                            id: node.id,
                            folder: currentPath[0] || "其他",
                            folderPath: folderPath
                        });
                        if (currentPath.length > 0) {
                            categoryPaths.add(folderPath);
                        }
                    } else {
                        const title = node.title;
                        const isRoot = isRootContainer(title);
                        if (node.children) {
                            if (isRoot) {
                                traverse(node.children, [], true);
                            } else {
                                const newPath = inRoot ? [title] : [...currentPath, title];
                                traverse(node.children, newPath, false);
                            }
                        }
                    }
                });
            }
            
            traverse(bookmarkTreeNodes, [], false);
            allCategoryPaths = categoryPaths;
            resolve(urlMap);
        });
    });
}

// 格式化时间
function formatTime(timestamp) {
    if (!timestamp) return t("never");
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return t("timeDaysAgo", [String(days)]);
    if (hours > 0) return t("timeHoursAgo", [String(hours)]);
    if (minutes > 0) return t("timeMinutesAgo", [String(minutes)]);
    return t("timeJustNow");
}

// 加载并显示数据
async function loadAndDisplayData() {
    const bookmarkList = document.getElementById("bookmarkList");
    bookmarkList.innerHTML = `<tr><td colspan='5' style='text-align: center; padding: 20px;'>${t("loading")}</td></tr>`;
    
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
                    folderPath: bookmarkInfo.folderPath || bookmarkInfo.folder || "其他",
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
            updateModeToggleUI();
        } catch (error) {
            console.error('加载数据时出错:', error);
            bookmarkList.innerHTML = `<tr><td colspan='5' style='text-align: center; padding: 20px; color: #d32f2f;'>${t("errorLoadData")}</td></tr>`;
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
    allChip.textContent = t("filterAll");
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

    // 动态计算行高与最大高度，确保完全显示第二行并浅浅露出第三行
    const folderWrapper = document.getElementById("folderWrapper");
    if (folderWrapper) {
        const firstChip = filterChips.querySelector(".filter-chip");
        const chipHeight = firstChip ? Math.round(firstChip.getBoundingClientRect().height) : 28;
        let gap = 6;
        try {
            const gapStr = getComputedStyle(filterChips).gap;
            const num = parseFloat(gapStr);
            if (!isNaN(num)) gap = num;
        } catch (_) {}
        folderWrapper.style.setProperty("--chip-line-height", `${chipHeight}px`);
        folderWrapper.style.setProperty("--chips-row-gap", `${gap}px`);
        folderWrapper.style.setProperty("--peek", `8px`);
    }
}

// 显示书签列表
function displayBookmarkList() {
    const bookmarkList = document.getElementById("bookmarkList");
    
    // 搜索过滤
    let filteredData = allBookmarkData;
    if (currentSearchQuery) {
        if (currentSearchMode === "category") {
            // 分类模式：按分类路径过滤
            filteredData = filteredData.filter(bookmark => {
                const folderPath = bookmark.folderPath || bookmark.folder || "";
                // 支持部分匹配，如输入"A"匹配"A"和"A/B"
                return folderPath.toLowerCase().startsWith(currentSearchQuery.toLowerCase()) ||
                       folderPath.toLowerCase().includes("/" + currentSearchQuery.toLowerCase());
            });
        } else {
            // 书签模式：按标题或URL过滤
            filteredData = filteredData.filter(bookmark => 
                bookmark.title.toLowerCase().includes(currentSearchQuery) ||
                bookmark.url.toLowerCase().includes(currentSearchQuery)
            );
        }
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
    
    // 更新图表 - 搜索时隐藏图表和统计面板
    const chartsSection = document.querySelector('.charts-section');
    const statsPanel = document.getElementById('statsPanel');
    
    if (currentSearchQuery) {
        // 搜索模式下隐藏图表和统计面板
        if (chartsSection) chartsSection.style.display = 'none';
        if (statsPanel) statsPanel.style.display = 'none';
    } else {
        // 非搜索模式下显示图表和统计面板
        if (chartsSection) chartsSection.style.display = 'block';
        if (statsPanel) statsPanel.style.display = 'block';
        updateCharts(filteredData);
    }
    
    // 清空列表
    bookmarkList.innerHTML = "";
    
    if (sortedData.length === 0) {
        bookmarkList.innerHTML = "<tr><td colspan='5' style='text-align: center; padding: 20px;'>" + 
            (currentSearchQuery ? t("emptyNoMatch") : t("emptyNoData")) + "</td></tr>";
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
            titleCell.innerHTML = `<span style="color: rgba(0, 0, 0, 0.38); text-decoration: line-through;">${t("deletedBookmarkTitle")}</span>`;
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
        let tooltipText = `${t("lastAccessPrefix")} ${bookmark.lastClick ? new Date(bookmark.lastClick).toLocaleString() : t("never")}`;
        if (bookmark.firstClick) {
            tooltipText += `\n${t("firstAccessPrefix")} ${new Date(bookmark.firstClick).toLocaleString()}`;
        }
        if (bookmark.folder) {
            tooltipText += `\n${t("folderPrefix")} ${bookmark.folder}`;
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
                    label: t("chartDatasetClicks"),
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
    const trackedBookmarks = data.length;
    const totalClicks = data.reduce((sum, bookmark) => sum + bookmark.clicks, 0);
    const avgClicks = trackedBookmarks > 0 ? (totalClicks / trackedBookmarks).toFixed(1) : 0;
    
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
    
    // 获取书签管理器中的实际书签总数
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        let actualTotal = 0;
        function countBookmarks(nodes) {
            nodes.forEach((node) => {
                if (node.url && node.url.startsWith("http")) {
                    actualTotal++;
                }
                if (node.children) {
                    countBookmarks(node.children);
                }
            });
        }
        countBookmarks(bookmarkTreeNodes);
        
        // 更新显示格式: tracked/actual
        const totalBookmarksEl = document.getElementById("totalBookmarks");
        totalBookmarksEl.textContent = `${trackedBookmarks}/${actualTotal}`;
        totalBookmarksEl.title = `${t("trackedBookmarks")}: ${trackedBookmarks}\n${t("actualBookmarks")}: ${actualTotal}`;
    });
    
    document.getElementById("totalClicks").textContent = totalClicks;
    document.getElementById("avgClicks").textContent = avgClicks;
    document.getElementById("totalFolders").textContent = totalFolders;
    document.getElementById("topFolder").textContent = topFolder;
}

// 导出CSV
function exportToCSV() {
    if (allBookmarkData.length === 0) {
        alert(t("exportNoData"));
        return;
    }
    
    const headers = [t("csvHeaderTitle"), t("csvHeaderURL"), t("csvHeaderClicks"), t("csvHeaderFirstAccess"), t("csvHeaderLastAccess")];
    const rows = allBookmarkData.map(bookmark => [
        bookmark.title,
        bookmark.url,
        bookmark.clicks,
        bookmark.firstClick ? new Date(bookmark.firstClick).toISOString() : t("never"),
        bookmark.lastClick ? new Date(bookmark.lastClick).toISOString() : t("never")
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
        alert(t("exportNoData"));
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
            firstClickFormatted: bookmark.firstClick ? new Date(bookmark.firstClick).toISOString() : null,
            lastClickFormatted: bookmark.lastClick ? new Date(bookmark.lastClick).toISOString() : null
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
            alert(t("noDeletedBookmarks"));
            return;
        }
        
        if (confirm(t("confirmBatchReset", [String(deletedCount)]))) {
            chrome.storage.local.set({ clickCounts: cleanedCounts }, () => {
                loadAndDisplayData();
                alert(t("batchResetSuccess", [String(deletedCount)]));
            });
        }
    });
}

// 合并书签
function mergeBookmarks() {
    const sourceUrl = prompt(t("promptMergeSource"));
    if (!sourceUrl || !sourceUrl.trim()) return;
    
    const sourceTrimmed = sourceUrl.trim();
    
    const targetUrl = prompt(t("promptMergeTarget"));
    if (!targetUrl || !targetUrl.trim()) return;
    
    const targetTrimmed = targetUrl.trim();
    
    if (sourceTrimmed === targetTrimmed) {
        alert(t("mergeSameUrl"));
        return;
    }
    
    chrome.storage.local.get("clickCounts", (data) => {
        const clickCounts = data.clickCounts || {};
        
        const sourceData = clickCounts[sourceTrimmed];
        const targetData = clickCounts[targetTrimmed];
        
        if (!sourceData) {
            alert(t("mergeSourceNotFound"));
            return;
        }
        
        const sourceCount = typeof sourceData === "number" ? sourceData : (sourceData.count || 0);
        const targetCount = targetData ? (typeof targetData === "number" ? targetData : (targetData.count || 0)) : 0;
        
        const sourceFirstClick = typeof sourceData === "object" ? sourceData.firstClick : null;
        const sourceLastClick = typeof sourceData === "object" ? sourceData.lastClick : null;
        const targetFirstClick = targetData && typeof targetData === "object" ? targetData.firstClick : null;
        const targetLastClick = targetData && typeof targetData === "object" ? targetData.lastClick : null;
        
        // 合并计数
        const mergedCount = sourceCount + targetCount;
        
        // 合并时间戳
        const mergedFirstClick = [sourceFirstClick, targetFirstClick].filter(Boolean).length > 0 
            ? Math.min(...[sourceFirstClick, targetFirstClick].filter(Boolean)) 
            : Date.now();
        const mergedLastClick = Math.max(sourceLastClick || 0, targetLastClick || 0) || Date.now();
        
        if (confirm(t("confirmMerge", [sourceTrimmed, targetTrimmed, String(sourceCount), String(targetCount), String(mergedCount)]))) {
            // 删除源书签数据，合并到目标书签
            delete clickCounts[sourceTrimmed];
            clickCounts[targetTrimmed] = {
                count: mergedCount,
                firstClick: mergedFirstClick,
                lastClick: mergedLastClick
            };
            
            chrome.storage.local.set({ clickCounts }, () => {
                loadAndDisplayData();
                alert(t("mergeSuccess"));
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
        alert(t("menuClearAll"));
    });
}

// 语言工具
function t(key, substitutions) {
    try {
        if (currentLangOverride === "en") {
            const msg = defaultI18nEn[key];
            if (msg) return substitute(msg, substitutions);
        } else if (currentLangOverride === "zh_CN") {
            const msg = defaultI18nZhCN[key];
            if (msg) return substitute(msg, substitutions);
        } else if (chrome && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
            const msg = chrome.i18n.getMessage(key, substitutions);
            if (msg) return msg;
        }
    } catch (_) {}
    const fallback = defaultI18nZhCN[key];
    if (fallback) return substitute(fallback, substitutions);
    return key;
}

function substitute(str, substitutions) {
    if (Array.isArray(substitutions) && substitutions.length) {
        let s = String(str);
        // 支持多个占位符: $URL, $TARGET, $COUNT, $COUNT2, $COUNT3
        s = s.replace("$URL", substitutions[0] || "");
        s = s.replace("$TARGET", substitutions[1] || "");
        s = s.replace("$COUNT", substitutions[2] || substitutions[0] || "");
        s = s.replace("$COUNT2", substitutions[3] || "");
        s = s.replace("$COUNT3", substitutions[4] || "");
        return s;
    }
    return str;
}

// 最小中文默认文案（预览模式无 i18n 时使用）
const defaultI18nZhCN = {
    searchPlaceholder: "搜索书签标题或URL...",
    language: "语言",
    langDefault: "默认",
    menuOpenBookmarkManager: "打开书签管理器",
    menuGenerateSampleData: "生成示例数据",
    menuExportCSV: "导出 CSV",
    menuExportJSON: "导出 JSON",
    menuResetSpecific: "重置指定计数",
    menuCleanDeleted: "清理已删除书签",
    menuClearAll: "清空所有数据",
    filterLabel: "分类:",
    dateRangeLabel: "时间范围:",
    dateAll: "全部时间",
    dateToday: "今天",
    dateWeek: "最近7天",
    dateMonth: "最近30天",
    date3months: "最近3个月",
    dateYear: "最近1年",
    statsTotalBookmarks: "总书签数:",
    statsTotalClicks: "总点击次数:",
    statsAvgClicks: "平均点击次数:",
    statsTotalFolders: "分类数:",
    statsTopFolder: "访问最多的分类:",
    chartFolderDistribution: "分类点击分布",
    chartTopBookmarks: "最常用书签 Top 10",
    tableTitle: "标题",
    tableURL: "URL",
    tableClicks: "点击",
    tableLastClick: "最后访问",
    emptyNoData: "暂无书签点击数据",
    emptyNoMatch: "未找到匹配的书签",
    loading: "加载中...",
    deletedBookmarkTitle: "已删除的书签",
    batchReset: "批量重置",
    batchCancel: "取消",
    batchSelectedLabel: "已选择",
    batchItemsSuffix: "项",
    filterAll: "全部",
    confirmGenerateSampleData: "生成示例数据将覆盖现有数据，是否继续？",
    promptResetSpecific: "请输入要重置的书签URL（必须与原始URL完全一致）:",
    confirmResetSpecific: "确定要重置该URL的点击次数吗？\n$URL",
    resetSuccess: "重置成功",
    notFoundExactURL: "未找到匹配的URL，请确认URL是否完全一致",
    confirmClearAll: "确定要清空所有统计数据吗？此操作不可恢复！",
    confirmBatchReset: "确定要重置选中的 $COUNT 个书签的点击次数吗？",
    batchResetSuccess: "已重置 $COUNT 个书签的点击次数",
    errorLoadData: "加载数据时出错，请刷新重试",
    never: "从未",
    lastAccessPrefix: "最后访问:",
    firstAccessPrefix: "首次访问:",
    folderPrefix: "分类:",
    csvHeaderTitle: "标题",
    csvHeaderURL: "URL",
    csvHeaderClicks: "点击次数",
    csvHeaderFirstAccess: "首次访问",
    csvHeaderLastAccess: "最后访问",
    exportNoData: "没有数据可导出",
    chartDatasetClicks: "点击次数",
    timeDaysAgo: "$COUNT天",
    timeHoursAgo: "$COUNT小时",
    timeMinutesAgo: "$COUNT分钟",
    timeJustNow: "刚刚",
    noDeletedBookmarks: "没有已删除的书签",
    menuMergeBookmarks: "合并书签",
    promptMergeSource: "请输入要合并的书签URL（源URL，数据将被合并到目标URL）:",
    promptMergeTarget: "请输入目标书签URL（源URL的数据将合并到此URL）:",
    mergeSameUrl: "源URL和目标URL不能相同",
    mergeSourceNotFound: "未找到源URL的点击数据",
    confirmMerge: "确定要将以下书签合并吗？\n源URL: $URL\n目标URL: $TARGET\n源点击次数: $COUNT → 目标点击次数: $COUNT2\n合并后点击次数: $COUNT3",
    mergeSuccess: "合并成功",
    modeBookmark: "书签",
    modeCategory: "分类",
    categoryPlaceholderDefault: "请输入分类，如 A 或 A/B",
    categoryPlaceholderSimple: "请输入分类，如 $URL",
    categoryPlaceholderWithPath: "请输入分类，如 $URL 或 $TARGET",
    trackedBookmarks: "统计到",
    actualBookmarks: "实际总数"
};

// 英文默认文案
const defaultI18nEn = {
    searchPlaceholder: "Search bookmarks by title or URL...",
    language: "Language",
    langDefault: "Default",
    menuOpenBookmarkManager: "Open Bookmark Manager",
    menuGenerateSampleData: "Generate Sample Data",
    menuExportCSV: "Export CSV",
    menuExportJSON: "Export JSON",
    menuResetSpecific: "Reset Specific Count",
    menuCleanDeleted: "Clean Deleted Bookmarks",
    menuClearAll: "Clear All Data",
    filterLabel: "Folder:",
    dateRangeLabel: "Date Range:",
    dateAll: "All Time",
    dateToday: "Today",
    dateWeek: "Last 7 Days",
    dateMonth: "Last 30 Days",
    date3months: "Last 3 Months",
    dateYear: "Last 1 Year",
    statsTotalBookmarks: "Total Bookmarks:",
    statsTotalClicks: "Total Clicks:",
    statsAvgClicks: "Average Clicks:",
    statsTotalFolders: "Folders:",
    statsTopFolder: "Top Folder:",
    chartFolderDistribution: "Folder Click Distribution",
    chartTopBookmarks: "Top 10 Bookmarks",
    tableTitle: "Title",
    tableURL: "URL",
    tableClicks: "Clicks",
    tableLastClick: "Last Access",
    emptyNoData: "No bookmark click data",
    emptyNoMatch: "No matching bookmarks",
    loading: "Loading...",
    deletedBookmarkTitle: "Deleted Bookmark",
    batchReset: "Batch Reset",
    batchCancel: "Cancel",
    batchSelectedLabel: "Selected",
    batchItemsSuffix: "items",
    filterAll: "All",
    confirmGenerateSampleData: "Generating sample data will overwrite existing data. Continue?",
    promptResetSpecific: "Enter the bookmark URL to reset (must match exactly):",
    confirmResetSpecific: "Are you sure to reset the click count for this URL?\n$URL",
    resetSuccess: "Reset successful",
    notFoundExactURL: "No matching URL found. Please check the exact URL.",
    confirmClearAll: "Clear all statistics? This action cannot be undone!",
    confirmBatchReset: "Reset click counts for selected $COUNT bookmarks?",
    batchResetSuccess: "Reset $COUNT bookmarks",
    errorLoadData: "Error loading data, please refresh and try again",
    never: "Never",
    lastAccessPrefix: "Last Access:",
    firstAccessPrefix: "First Access:",
    folderPrefix: "Folder:",
    csvHeaderTitle: "Title",
    csvHeaderURL: "URL",
    csvHeaderClicks: "Clicks",
    csvHeaderFirstAccess: "First Access",
    csvHeaderLastAccess: "Last Access",
    exportNoData: "No data to export",
    chartDatasetClicks: "Clicks",
    timeDaysAgo: "$COUNT days",
    timeHoursAgo: "$COUNT hours",
    timeMinutesAgo: "$COUNT minutes",
    timeJustNow: "Just now",
    noDeletedBookmarks: "No deleted bookmarks found",
    menuMergeBookmarks: "Merge Bookmarks",
    promptMergeSource: "Enter the source bookmark URL (data will be merged to target):",
    promptMergeTarget: "Enter the target bookmark URL (source data will be merged here):",
    mergeSameUrl: "Source and target URLs cannot be the same",
    mergeSourceNotFound: "No click data found for source URL",
    confirmMerge: "Merge the following bookmarks?\nSource: $URL\nTarget: $TARGET\nSource clicks: $COUNT → Target clicks: $COUNT2\nCombined clicks: $COUNT3",
    mergeSuccess: "Merge successful",
    modeBookmark: "Bookmark",
    modeCategory: "Category",
    categoryPlaceholderDefault: "Enter category, e.g. A or A/B",
    categoryPlaceholderSimple: "Enter category, e.g. $URL",
    categoryPlaceholderWithPath: "Enter category, e.g. $URL or $TARGET",
    trackedBookmarks: "Tracked",
    actualBookmarks: "Total"
};
// 初始化静态UI文案
function initI18n() {
    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.placeholder = t("searchPlaceholder");

    const ids = {
        openBookmarkManager: "menuOpenBookmarkManager",
        generateSampleData: "menuGenerateSampleData",
        exportCSV: "menuExportCSV",
        exportJSON: "menuExportJSON",
        resetSpecific: "menuResetSpecific",
        mergeBookmarks: "menuMergeBookmarks",
        cleanDeleted: "menuCleanDeleted",
        clearAll: "menuClearAll",
        batchReset: "batchReset",
        batchCancel: "batchCancel"
    };
    Object.entries(ids).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    });
    const languageToggle = document.getElementById("languageMenuToggle");
    if (languageToggle) languageToggle.textContent = `🌐 ${t("language")}`;
    const langMenu = document.getElementById("languageMenu");
    if (langMenu) {
        const defaultBtn = langMenu.querySelector('button[data-lang="default"]');
        if (defaultBtn) defaultBtn.textContent = t("langDefault");
        const zhBtn = langMenu.querySelector('button[data-lang="zh_CN"]');
        if (zhBtn) zhBtn.textContent = "中文";
        const enBtn = langMenu.querySelector('button[data-lang="en"]');
        if (enBtn) enBtn.textContent = "English";
    }

    const filterLabel = document.querySelector(".filter-label");
    if (filterLabel) filterLabel.textContent = t("filterLabel");
    const dateLabel = document.querySelector(".date-filter-label");
    if (dateLabel) dateLabel.textContent = t("dateRangeLabel");

    const dateSelect = document.getElementById("dateRangeSelect");
    if (dateSelect) {
        const optionsMap = {
            all: "dateAll",
            today: "dateToday",
            week: "dateWeek",
            month: "dateMonth",
            "3months": "date3months",
            year: "dateYear"
        };
        Array.from(dateSelect.options).forEach(opt => {
            const key = optionsMap[opt.value];
            if (key) opt.textContent = t(key);
        });
    }

    const rows = document.querySelectorAll(".stats-row");
    const statKeys = ["statsTotalBookmarks", "statsTotalClicks", "statsAvgClicks", "statsTotalFolders", "statsTopFolder"];
    rows.forEach((row, idx) => {
        const labelSpan = row.querySelector("span:first-child");
        if (labelSpan && statKeys[idx]) labelSpan.textContent = t(statKeys[idx]);
    });

    const chartTitles = document.querySelectorAll(".chart-title");
    if (chartTitles[0]) chartTitles[0].textContent = t("chartFolderDistribution");
    if (chartTitles[1]) chartTitles[1].textContent = t("chartTopBookmarks");

    const folderEmpty = document.getElementById("folderChartEmpty");
    const topEmpty = document.getElementById("topBookmarksChartEmpty");
    if (folderEmpty) folderEmpty.textContent = t("emptyNoData");
    if (topEmpty) topEmpty.textContent = t("emptyNoData");

    const thTitle = document.querySelector('th[data-sort="title"]');
    const thClicks = document.querySelector('th[data-sort="clicks"]');
    const thLast = document.querySelector('th[data-sort="lastClick"]');
    const thUrl = document.querySelector('table thead th:nth-child(3)');
    if (thTitle) thTitle.textContent = t("tableTitle");
    if (thUrl) thUrl.textContent = t("tableURL");
    if (thClicks) thClicks.textContent = t("tableClicks");
    if (thLast) thLast.textContent = t("tableLastClick");
}

async function initLanguage() {
    try {
        await new Promise(resolve => {
            chrome.storage.local.get("langOverride", (data) => {
                currentLangOverride = data.langOverride || null;
                resolve();
            });
        });
    } catch (_) {
        currentLangOverride = null;
    }
    let docLang = "zh-CN";
    if (currentLangOverride === "en") docLang = "en";
    else if (currentLangOverride === "zh_CN") docLang = "zh-CN";
    else {
        try {
            const uiLang = chrome.i18n.getUILanguage();
            docLang = uiLang || docLang;
        } catch (_) {}
    }
    document.documentElement.lang = docLang;
}
