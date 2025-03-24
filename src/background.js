chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled....");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log("tab: ", tab);
    console.log(`Tab ${tabId} URL changed to: ${changeInfo.url}`);

    chrome.runtime.sendMessage({ action: "urlChanged", url: changeInfo.url });
  }
});
