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
      console.warn(`MASTER_TOOLS_PROVIDER_TENANT not found in localStorage for tab ${tabId}.`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting MASTER_TOOLS_PROVIDER_TENANT for tab ${tabId}:`, error);
    return null;
  }
}

function sendMessageToContentScript(tabId, url, tenantData) {
  chrome.runtime.sendMessage(
    {
      action: "urlChanged",
      data: { url: url, tenant: tenantData },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message to content script:", chrome.runtime.lastError.message);
      } else {
        console.log("Message sent successfully. Response from content script:", response);
      }
    }
  );
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || !tab.url) {
    return;
  }

  if (
    changeInfo.url &&
    changeInfo.url.startsWith("https://app.monitoringdriver.com/")
  ) {
    console.log(`URL changed to: ${changeInfo.url}`);
    const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
      tabId
    );
    sendMessageToContentScript(tabId, changeInfo.url, MASTER_TOOLS_PROVIDER_TENANT);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (!tab || !tab.url) {
      return;
    }

    if (tab.url && tab.url.startsWith("https://app.monitoringdriver.com/")) {
      console.log(`Tab activated: ${tab.url}`);
      const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
        activeInfo.tabId
      );
      sendMessageToContentScript(activeInfo.tabId, tab.url, MASTER_TOOLS_PROVIDER_TENANT);
    }
  });
});
