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
  // focus webApp's event on chromeExt click
  if (message.action === "focusElement" && message.payload) {
    const { tabId, elementId } = message.payload;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: (id) => {
          const listElement = document.getElementById(`row-${id}`);
          // const graphElement = document.querySelector(
          //   `g:has(line#hos-event-${id}) > g > rect`
          // );

          if (listElement) {
            const mouseOverEvent = new MouseEvent("mouseover", {
              bubbles: true,
              cancelable: true,
              view: window,
            });

            listElement.dispatchEvent(mouseOverEvent);
            listElement.scrollIntoView({ behavior: "smooth", block: "center" });
            listElement.focus();
            listElement.style.transition = "background-color 0.3s ease-in-out";
            listElement.classList.add("bg-shade-3");
            listElement.style.transition = "background-color 0.5s ease-in";
            setTimeout(() => listElement.classList.remove("bg-shade-3"), 400);

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
        args: [elementId],
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: `[background.js] focusElement: Script injection failed: ${chrome.runtime.lastError.message}`,
          });
          return;
        }

        const result = injectionResults[0]?.result;
        if (result) {
          sendResponse(result);
        } else {
          sendResponse({
            success: false,
            error:
              "[background.js] focusElement: Failed to get result from injected script.",
          });
        }
      }
    );
    return true;
  }
  //////////////////////////////////
  // refresh webApp's view on chromeExt click
  if (message.action === "refresh" && message.payload) {
    const { tabId } = message.payload;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: () => {
          const refreshButton = document.querySelector(
            "#layout > div.w-full.h-screen.flex.overflow-hidden.text-primary-0.bg-buildings.bg-cover > div > header > div.flex.gap-4.items-center.justify-between.border-l.pl-4.h-full > button.flex.rounded-full.p-1.bg-transparent.text-theme-primary.hover\\:bg-shade-4.disabled\\:text-shade-1.disabled\\:bg-transparent.hover\\:bg-theme-primary\\/60.relative.p-2"
          );
          if (refreshButton) {
            refreshButton.click();
            return {
              success: true,
              message: "Refresh button clicked successfully.",
            };
          } else {
            return {
              success: false,
              error: "Refresh button not found.",
            };
          }
        },
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: `[background.js] refresh: Script injection failed: ${chrome.runtime.lastError.message}`,
          });
          return;
        }

        const result = injectionResults[0]?.result;
        if (result) {
          sendResponse(result);
        } else {
          sendResponse({
            success: false,
            error:
              "[background.js] refresh: Failed to get result from injected script.",
          });
        }
      }
    );
    return true;
  }
});
