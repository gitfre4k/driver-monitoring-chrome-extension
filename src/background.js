chrome.runtime.onInstalled.addListener(() => {
  console.log(">> [background.js] chrome.runtime.onInstalled");
});
console.log(">> [background.js] service worker active.");

///////////////////
// "MASTER_TOOLS_PROVIDER_TENANT"
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
      console.warn(
        ` >> [background.js] MASTER_TOOLS_PROVIDER_TENANT not found in localStorage for tab ${tabId}.`
      );
      return null;
    }
  } catch (error) {
    console.error(
      ` >> [background.js] Error getting MASTER_TOOLS_PROVIDER_TENANT for tab ${tabId}:`,
      error
    );
    return null;
  }
}

///////////////////
// on URL Change
function sendMessageToContentScript(tabId, url, tenantData) {
  chrome.runtime.sendMessage(
    {
      action: "urlChanged",
      data: { tabId: tabId, url: url, tenant: tenantData },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          ">> [background.js] Error sending message to content script:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log(
          ">> [background.js] Message sent successfully. Response from content script:",
          response
        );
      }
    }
  );
}

///////////////////
// on chrome tab change
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || !tab.url) {
    return;
  }

  if (
    changeInfo.url &&
    changeInfo.url.startsWith("https://app.monitoringdriver.com/")
  ) {
    console.log(`>> [background.js] URL changed to: ${changeInfo.url}`);
    const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
      tabId
    );
    sendMessageToContentScript(
      tabId,
      changeInfo.url,
      MASTER_TOOLS_PROVIDER_TENANT
    );
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (!tab || !tab.url) {
      return;
    }

    if (tab.url && tab.url.startsWith("https://app.monitoringdriver.com/")) {
      console.log(`>> [background.js] Tab activated: ${tab.url}`);
      const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
        activeInfo.tabId
      );
      sendMessageToContentScript(
        activeInfo.tabId,
        tab.url,
        MASTER_TOOLS_PROVIDER_TENANT
      );
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateLocalStorage") {
    const { tabId, key, value } = message.payload;

    if (tabId === undefined || key === undefined || value === undefined) {
      console.error(
        ">> [background.js] Invalid payload for updateLocalStorage:",
        message.payload
      );
      sendResponse({ success: false, error: "Missing tabId, key, or value" });
      return true; // async
    }

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error(
          ">> [background.js] Error getting tab:",
          chrome.runtime.lastError.message
        );
        sendResponse({
          success: false,
          error: "Tab not found or inaccessible.",
        });
        return;
      }
      if (!tab) {
        console.error(`>> [background.js] Tab with ID ${tabId} not found.`);
        sendResponse({ success: false, error: "Tab not found." });
        return;
      }

      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          function: (localStorageKey, localStorageValue) => {
            try {
              localStorage.setItem(localStorageKey, localStorageValue);
              return { success: true };
            } catch (e) {
              return { success: false, error: e.message };
            }
          },
          args: [key, value],
        })
        .then((results) => {
          const result = results[0]?.result;

          if (result && result.success) {
            sendResponse({
              success: true,
              message: `Local storage updated for tab ${tabId}.`,
            });
          } else {
            sendResponse({
              success: false,
              error: result?.error || "Unknown error during script execution.",
            });
          }
        })
        .catch((error) => {
          console.error(">> [background.js] Error executing script:", error);
          sendResponse({
            success: false,
            error: `Failed to execute script: ${error.message}`,
          });
        });
    });

    return true;
  }
});
