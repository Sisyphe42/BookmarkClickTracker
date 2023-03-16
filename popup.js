document.addEventListener("DOMContentLoaded", () => {
    const sortButton = document.getElementById("sortButton");
    let sortOrder = "default";

    sortButton.addEventListener("click", () => {
        if (sortOrder === "default") {
            sortOrder = "descending";
            sortButton.textContent = "Sort by Clicks ⏷";
        } else if (sortOrder === "descending") {
            sortOrder = "ascending";
            sortButton.textContent = "Sort by Clicks ⏶";
        } else {
            sortOrder = "default";
            sortButton.textContent = "Sort by Clicks";
        }
        displayBookmarkList(sortOrder);
    });

    displayBookmarkList(sortOrder);
});

function displayBookmarkList(sortOrder) {
    chrome.storage.sync.get("clickCounts", (data) => {
        const clickCounts = data.clickCounts || {};
        const sortedClickCounts = Object.entries(clickCounts);

        if (sortOrder === "descending") {
            sortedClickCounts.sort((a, b) => b[1] - a[1]);
        } else if (sortOrder === "ascending") {
            sortedClickCounts.sort((a, b) => a[1] - b[1]);
        }

        const bookmarkList = document.getElementById("bookmarkList");
        bookmarkList.innerHTML = "";

        sortedClickCounts.forEach(([url, clicks]) => {
            chrome.bookmarks.search({ url }, (results) => {
                if (results.length > 0) {
                    const bookmarkTitle = results[0].title;

                    const row = document.createElement("tr");

                    const titleCell = document.createElement("td");
                    titleCell.textContent = bookmarkTitle;
                    row.appendChild(titleCell);

                    const urlCell = document.createElement("td");
                    const urlDiv = document.createElement("div");
                    urlDiv.classList.add("url-wrap");
                    const urlLink = document.createElement("a");
                    urlLink.href = url;
                    urlLink.textContent = url;
                    urlLink.target = "_blank";
                    urlDiv.appendChild(urlLink);
                    urlCell.appendChild(urlDiv);
                    row.appendChild(urlCell);

                    const clicksCell = document.createElement("td");
                    clicksCell.textContent = clicks;
                    row.appendChild(clicksCell);

                    bookmarkList.appendChild(row);
                }
            });
        });
    });
}
