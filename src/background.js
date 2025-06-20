chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled....");
});
console.log('Background service worker active.');

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
        `MASTER_TOOLS_PROVIDER_TENANT not found in localStorage for tab ${tabId}.`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `Error getting MASTER_TOOLS_PROVIDER_TENANT for tab ${tabId}:`,
      error
    );
    return null;
  }
}

function sendMessageToContentScript(tabId, url, tenantData) {
  chrome.runtime.sendMessage(
    {
      action: "urlChanged",
      data: { tabId: tabId, url: url, tenant: tenantData },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending message to content script:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log(
          "Message sent successfully. Response from content script:",
          response
        );
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
      console.log(`Tab activated: ${tab.url}`);
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
  if (message.action === 'updateLocalStorage') {
    const { tabId, key, value } = message.payload;

    if (tabId === undefined || key === undefined || value === undefined) {
      console.error('Invalid payload for updateLocalStorage:', message.payload);
      sendResponse({ success: false, error: 'Missing tabId, key, or value' });
      return true; // Indicate that sendResponse will be called asynchronously
    }

    // Check if the tab exists and is accessible
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting tab:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: 'Tab not found or inaccessible.' });
        return;
      }
      if (!tab) {
        console.error(`Tab with ID ${tabId} not found.`);
        sendResponse({ success: false, error: 'Tab not found.' });
        return;
      }

      // Execute a function directly in the target tab's context
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: (localStorageKey, localStorageValue) => {
          try {
            localStorage.setItem(localStorageKey, localStorageValue);
            return { success: true };
          } catch (e) {
            return { success: false, error: e.message };
          }
        },
        args: [key, value]
      })
      .then((results) => {
        // results is an array, each element corresponds to a result from each frame.
        // For 'function' injection, it's usually one element from the main frame.
        const result = results[0]?.result; // Get the result from the executed function

        if (result && result.success) {
          sendResponse({ success: true, message: `Local storage updated for tab ${tabId}.` });
        } else {
          sendResponse({ success: false, error: result?.error || 'Unknown error during script execution.' });
        }
      })
      .catch((error) => {
        console.error('Error executing script:', error);
        sendResponse({ success: false, error: `Failed to execute script: ${error.message}` });
      });
    });

    return true; // Keep the message channel open for sendResponse
  }
});

