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
  /////////////////////////////////////////
  if (message.action === "focusElement" && message.payload) {
    const { tabId, elementId } = message.payload;

    // Use chrome.scripting.executeScript to inject and run a function in the target tab.
    // The target is the specific tab ID provided in the message.
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: (id) => {
          // This function runs in the context of the content script.
          const element = document.getElementById(`row-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
            element.style.transition = "background-color 0.2s ease-in-out";
            element.classList.add("bg-shade-3");
            element.style.transition = "background-color 0.3s ease-in";
            setTimeout(() => element.classList.remove("bg-shade-3"), 250);

            return {
              success: true,
              message: `Element with ID '${id}' has been focused.`,
            };
          } else {
            return {
              success: false,
              error: `Element with ID '${id}' not found.`,
            };
          }
        },
        args: [elementId], // Pass the elementId as an argument to the injected function.
      },
      (injectionResults) => {
        // Handle the result of the script injection.
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: `Script injection failed: ${chrome.runtime.lastError.message}`,
          });
          return;
        }

        const result = injectionResults[0]?.result;
        if (result) {
          // Pass the result from the injected function back to the Angular app.
          sendResponse(result);
        } else {
          sendResponse({
            success: false,
            error: "Failed to get result from injected script.",
          });
        }
      }
    );
    // Return true to indicate that you will send a response asynchronously.
    return true;
  }
});
