(() => {
  const now = Date.now();
  const storage = {
    clickCounts: {
      "https://github.com": { count: 89, firstClick: now - 90 * 24 * 60 * 60 * 1000, lastClick: now - 2 * 60 * 60 * 1000 },
      "https://stackoverflow.com": { count: 67, firstClick: now - 120 * 24 * 60 * 60 * 1000, lastClick: now - 1 * 24 * 60 * 60 * 1000 },
      "https://developer.mozilla.org": { count: 54, firstClick: now - 150 * 24 * 60 * 60 * 1000, lastClick: now - 3 * 24 * 60 * 60 * 1000 },
      "https://developer.chrome.com/docs/devtools": { count: 43, firstClick: now - 100 * 24 * 60 * 60 * 1000, lastClick: now - 5 * 24 * 60 * 60 * 1000 },
      "https://code.visualstudio.com": { count: 32, firstClick: now - 200 * 24 * 60 * 60 * 1000, lastClick: now - 7 * 24 * 60 * 60 * 1000 },
      "https://react.dev": { count: 28, firstClick: now - 180 * 24 * 60 * 60 * 1000, lastClick: now - 14 * 24 * 60 * 60 * 1000 },
      "https://www.npmjs.com": { count: 45, firstClick: now - 110 * 24 * 60 * 60 * 1000, lastClick: now - 1 * 60 * 60 * 1000 },
      "https://nodejs.org": { count: 38, firstClick: now - 130 * 24 * 60 * 60 * 1000, lastClick: now - 2 * 24 * 60 * 60 * 1000 },
      "https://www.youtube.com": { count: 8, firstClick: now - 300 * 24 * 60 * 60 * 1000, lastClick: now - 30 * 24 * 60 * 60 * 1000 }
    },
    langOverride: "en"
  };

  const bookmarkTree = [
    {
      id: "0",
      title: "",
      children: [
        {
          id: "1",
          title: "Bookmarks Bar",
          children: [
            {
              id: "10",
              title: "Development",
              children: [
                { id: "100", title: "GitHub", url: "https://github.com" },
                { id: "101", title: "StackOverflow", url: "https://stackoverflow.com" },
                { id: "102", title: "MDN", url: "https://developer.mozilla.org" },
                { id: "103", title: "Chrome DevTools", url: "https://developer.chrome.com/docs/devtools" },
                { id: "104", title: "VS Code", url: "https://code.visualstudio.com" },
                { id: "105", title: "React", url: "https://react.dev" },
                { id: "106", title: "Node.js", url: "https://nodejs.org" },
                { id: "107", title: "NPM", url: "https://www.npmjs.com" }
              ]
            },
            {
              id: "11",
              title: "Learning",
              children: [
                { id: "110", title: "YouTube", url: "https://www.youtube.com" }
              ]
            }
          ]
        },
        {
          id: "2",
          title: "Other Bookmarks",
          children: [
            { id: "20", title: "Web.dev", url: "https://web.dev" },
            { id: "21", title: "CSS-Tricks", url: "https://css-tricks.com" }
          ]
        }
      ]
    }
  ];

  const chromeMock = {
    storage: {
      local: {
        get: (keys, cb) => {
          let result = {};
          if (typeof keys === "string") {
            result[keys] = storage[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(k => { result[k] = storage[k]; });
          } else {
            result = { ...storage };
          }
          cb && cb(result);
        },
        set: (items, cb) => {
          Object.assign(storage, items);
          cb && cb();
        },
        remove: (key, cb) => {
          delete storage[key];
          cb && cb();
        }
      }
    },
    bookmarks: {
      getTree: (cb) => cb(bookmarkTree)
    },
    tabs: {
      create: ({ url }) => {
        console.log("Mock open tab:", url);
      }
    },
    i18n: {
      getMessage: () => "",
      getUILanguage: () => "en"
    }
  };

  if (!window.chrome) {
    window.chrome = chromeMock;
  } else {
    // Merge minimal mocks if chrome exists
    window.chrome.storage = window.chrome.storage || chromeMock.storage;
    window.chrome.bookmarks = window.chrome.bookmarks || chromeMock.bookmarks;
    window.chrome.tabs = window.chrome.tabs || chromeMock.tabs;
    window.chrome.i18n = window.chrome.i18n || chromeMock.i18n;
  }
})();
