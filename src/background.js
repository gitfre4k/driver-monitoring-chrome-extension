chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled....");
});

async function getMasterToolsProviderTenant(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return localStorage.getItem("MASTER_TOOLS_PROVIDER_TENANT");
      },
    });

    if (results && results.length > 0 && results[0].result !== null) {
      return results[0].result;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting MASTER_TOOLS_PROVIDER_TENANT:", error);
    return null;
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.url &&
    changeInfo.url.startsWith("https://app.monitoringdriver.com/")
  ) {
    console.log(`URL changed to: ${changeInfo.url}`);
    const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
      tabId
    );
    chrome.runtime.sendMessage({
      action: "urlChanged",
      data: { url: changeInfo.url, tenant: MASTER_TOOLS_PROVIDER_TENANT },
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (tab.url && tab.url.startsWith("https://app.monitoringdriver.com/")) {
      console.log(`Tab activated: ${tab.url}`);
      const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
        activeInfo.tabId
      );
      chrome.runtime.sendMessage({
        action: "urlChanged",
        data: { url: tab.url, tenant: MASTER_TOOLS_PROVIDER_TENANT },
      });
    }
  });
});
