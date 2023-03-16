chrome.webNavigation.onCommitted.addListener((details) => {
    updateClickCount(details.url);
});

function updateClickCount(url) {
    chrome.bookmarks.search({ url }, (bookmarkResults) => {
        if (bookmarkResults.length > 0) {
            chrome.history.getVisits({ url }, (visitResults) => {
                const lastVisit = visitResults[visitResults.length - 1];
                if (lastVisit.transition === "typed" || lastVisit.transition === "auto_bookmark") {
                    chrome.storage.sync.get("clickCounts", (data) => {
                        const clickCounts = data.clickCounts || {};
                        clickCounts[url] = (clickCounts[url] || 0) + 1;
                        chrome.storage.sync.set({ clickCounts });
                    });
                }
            });
        }
    });
}
