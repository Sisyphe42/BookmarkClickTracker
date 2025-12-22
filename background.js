// 改进的书签点击检测：使用更准确的方法
chrome.webNavigation.onCommitted.addListener((details) => {
    // 只处理主框架导航，避免重复计数
    if (details.frameId !== 0) {
        return;
    }
    
    updateClickCount(details.url, details.transitionType);
});

// 使用 onBeforeNavigate 来更准确地检测书签点击
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) {
        return;
    }
    
    // 检查是否来自书签栏
    chrome.history.getVisits({ url: details.url }, (visitResults) => {
        if (visitResults.length > 0) {
            const lastVisit = visitResults[visitResults.length - 1];
            // auto_bookmark 是书签点击的明确标识
            if (lastVisit.transition === "auto_bookmark") {
                updateClickCount(details.url, "auto_bookmark");
            }
        }
    });
});

function updateClickCount(url, transitionType) {
    // 验证URL是否有效
    if (!url || !url.startsWith("http")) {
        return;
    }
    
    chrome.bookmarks.search({ url }, (bookmarkResults) => {
        if (bookmarkResults.length > 0) {
            // 使用 local storage 替代 sync，避免大小限制
            chrome.storage.local.get("clickCounts", (data) => {
                const clickCounts = data.clickCounts || {};
                const currentCount = clickCounts[url] || 0;
                
                // 获取时间戳信息
                const now = Date.now();
                const urlData = clickCounts[url] || { count: 0, firstClick: now, lastClick: now };
                
                // 更新计数和时间戳
                clickCounts[url] = {
                    count: urlData.count + 1,
                    firstClick: urlData.firstClick || now,
                    lastClick: now
                };
                
                chrome.storage.local.set({ clickCounts }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("存储错误:", chrome.runtime.lastError);
                    }
                });
            });
        }
    });
}

// 数据迁移：从 sync 迁移到 local
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
        migrateDataFromSync();
    }
});

function migrateDataFromSync() {
    chrome.storage.sync.get("clickCounts", (syncData) => {
        if (syncData.clickCounts) {
            chrome.storage.local.get("clickCounts", (localData) => {
                // 如果本地已有数据，合并它们
                const localCounts = localData.clickCounts || {};
                const syncCounts = syncData.clickCounts || {};
                
                // 合并数据：优先保留更大的计数值
                Object.keys(syncCounts).forEach(url => {
                    const syncValue = syncCounts[url];
                    const localValue = localCounts[url];
                    
                    if (typeof syncValue === "number") {
                        // 旧格式：直接是数字
                        const syncCount = syncValue;
                        const localCount = localValue?.count || 0;
                        
                        if (!localCounts[url] || syncCount > localCount) {
                            localCounts[url] = {
                                count: Math.max(syncCount, localCount),
                                firstClick: localValue?.firstClick || Date.now(),
                                lastClick: localValue?.lastClick || Date.now()
                            };
                        }
                    } else if (syncValue && typeof syncValue === "object") {
                        // 新格式：对象
                        localCounts[url] = syncValue;
                    }
                });
                
                chrome.storage.local.set({ clickCounts: localCounts }, () => {
                    // 迁移完成后，清除 sync 中的数据
                    chrome.storage.sync.remove("clickCounts");
                });
            });
        }
    });
}
