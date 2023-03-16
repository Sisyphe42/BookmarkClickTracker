document.addEventListener("DOMContentLoaded", () => {
    const sortButton = document.getElementById("sortButton");
    let sortOrderDescending = false;

    sortButton.addEventListener("click", () => {
        sortOrderDescending = !sortOrderDescending;
        displayBookmarkList(sortOrderDescending);
    });

    displayBookmarkList(sortOrderDescending);
});

function displayBookmarkList(sortOrderDescending) {
    chrome.storage.sync.get("clickCounts", (data) => {
        const clickCounts = data.clickCounts || {};
        const sortedClickCounts = Object.entries(clickCounts);

        if (sortOrderDescending) {
            sortedClickCounts.sort((a, b) => b[1] - a[1]);
        } else {
            sortedClickCounts.sort((a, b) => a[1] - b[1]);
        }

        const bookmarkList = document.getElementById("bookmarkList");
        bookmarkList.innerHTML = "";

        sortedClickCounts.forEach(([url, clicks]) => {
            const row = document.createElement("tr");

            const urlCell = document.createElement("td");
            const urlLink = document.createElement("a");
            urlLink.href = url;
            urlLink.textContent = url;
            urlLink.target = "_blank";
            urlCell.appendChild(urlLink);
            row.appendChild(urlCell);

            const clicksCell = document.createElement("td");
            clicksCell.textContent = clicks;
            row.appendChild(clicksCell);

            bookmarkList.appendChild(row);
        });
    });
}
