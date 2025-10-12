chrome.runtime.onInstalled.addListener(() => {
  console.log(">> [background.js] chrome.runtime.onInstalled");
});
console.log(">> [background.js] service worker active.");

///////////////////
// read from webApp's local storage
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
        ` >> [background.js] MASTER_TOOLS_PROVIDER_TENANT not found in localStorage for tab ${tabId}.`,
      );
      return null;
    }
  } catch (error) {
    console.error(
      ` >> [background.js] Error getting MASTER_TOOLS_PROVIDER_TENANT for tab ${tabId}:`,
      error,
    );
    return null;
  }
}

///////////////////
// find admin.prologs.us chrome tab and retrieve its session storage
async function findPrologTabAndGetAuthToken() {
  const targetUrl = "https://admin.prologs.us/*";

  try {
    const tabs = await chrome.tabs.query({
      url: targetUrl,
    });

    if (tabs.length === 0) {
      console.log(">> [background.js] Admin tab not found.");
      return null;
    }

    const tabId = tabs[0].id;
    // console.log(`>> [background.js] Found Admin tab ID: ${tabId}`);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (key) => {
        return sessionStorage.getItem(key);
      },
      args: ["oidc.user:https://identity.prologs.us:ProLogs_Admin"],
    });

    const authToken = results[0]?.result;

    if (authToken) {
      // console.log(
      //   ">> [background.js] Successfully retrieved token from admin.prologs.us session storage.",
      // );
      return authToken;
    } else {
      console.warn(
        ">> [background.js] 'token from admin.prologs.us session storage' not found in sessionStorage.",
      );
      return null;
    }
  } catch (error) {
    console.error(
      `>> [background.js] Error finding tab or getting token from admin.prologs.us session storage:`,
      error,
    );
    return null;
  }
}

///////////////////
// sendMessageToContentScript
function sendMessageToContentScript(tabId, url, tenantData) {
  chrome.runtime.sendMessage(
    {
      action: "urlChanged",
      data: { tabId: tabId, url: url, tenant: tenantData },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.log(
          ">> [background.js] Error sending message to content script:",
          chrome.runtime.lastError.message,
        );
      } else {
        console.log(
          ">> [background.js] Message sent successfully. Response from content script:",
          response,
        );
      }
    },
  );
}

///////////////////
// on url change
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || !tab.url) {
    return;
  }

  if (
    changeInfo.url &&
    changeInfo.url.startsWith("https://app.monitoringdriver.com/")
  ) {
    console.log(`>> [background.js] URL changed to: ${changeInfo.url}`);
    const MASTER_TOOLS_PROVIDER_TENANT =
      await getMasterToolsProviderTenant(tabId);
    sendMessageToContentScript(
      tabId,
      changeInfo.url,
      MASTER_TOOLS_PROVIDER_TENANT,
    );
  }
});

///////////////////
// on chrome tab change
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (!tab || !tab.url) {
      return;
    }

    if (tab.url && tab.url.startsWith("https://app.monitoringdriver.com/")) {
      console.log(`>> [background.js] Tab activated: ${tab.url}`);
      const MASTER_TOOLS_PROVIDER_TENANT = await getMasterToolsProviderTenant(
        activeInfo.tabId,
      );
      sendMessageToContentScript(
        activeInfo.tabId,
        tab.url,
        MASTER_TOOLS_PROVIDER_TENANT,
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
        message.payload,
      );
      sendResponse({ success: false, error: "Missing tabId, key, or value" });
      return true;
    }

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error(
          ">> [background.js] Error getting tab:",
          chrome.runtime.lastError.message,
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

  ///////////////////
  // get token from admin.prologs.us session storage
  if (message.action === "GET_ADMIN_PROLOGS_TOKEN") {
    findPrologTabAndGetAuthToken()
      .then((token) => {
        sendResponse({
          success: token !== null,
          authToken: token,
        });
      })
      .catch((error) => {
        console.error(
          ">> [background.js] Failed to get admin auth token:",
          error,
        );
        sendResponse({ success: false, error: "Failed to retrieve token." });
      });
    return true;
  }

  /////////////////////////////////////////
  // focus webApp's event on chromeExt click
  if (
    (message.action === "FOCUS_TACHOGRAPH_START" ||
      message.action === "FOCUS_TACHOGRAPH_STOP" ||
      message.action === "ELEMENT_ON_CLICK") &&
    message.payload
  ) {
    const { tabId, elementId, statusName } = message.payload;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: (id, status, action) => {
          console.log("id, status, action", id, status, action);
          const listElement = document.getElementById(`row-${id}`);
          const graphLineElement = document.getElementById(`hos-event-${id}`);
          const graphParent =
            graphLineElement && graphLineElement.parentElement;
          const graphElement =
            graphParent && graphParent.querySelector(".group");
          const rectElement = graphElement && graphElement.children[1];

          const targetClassName =
            status && status !== "Driving"
              ? "fill-primary-0/10"
              : "fill-green-500/10";

          if (rectElement) {
            if (action === "FOCUS_TACHOGRAPH_START") {
              rectElement.classList.remove("fill-transparent");
              rectElement.classList.add(targetClassName);
            }
            if (action === "FOCUS_TACHOGRAPH_STOP") {
              rectElement.classList.remove(targetClassName);
              rectElement.classList.add("fill-transparent");
            }
          }

          if (listElement) {
            if (action === "ELEMENT_ON_CLICK") {
              listElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              listElement.focus();
              listElement.classList.add(
                "transition-colors",
                "duration-300",
                "ease-in-out",
                "bg-shade-3",
              );
              setTimeout(
                () =>
                  listElement.classList.remove(
                    "transition-colors",
                    "duration-700",
                    "ease-in-out",
                    "bg-shade-3",
                  ),
                300,
              );
            }

            return {
              success: true,
              message: `Element with ID '${id}' has been focused.`,
            };
          } else {
            return {
              success: true,
              error: `Element with ID '${id}' not found.`,
            };
          }
        },
        args: [elementId, statusName, message.action],
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
      },
    );
    return true;
  }
  //////////////////////////////////
  // refresh webApp's view on chromeExt click
  // + on hover event dispatch
  if (message.action === "refresh" && message.payload) {
    const { tabId } = message.payload;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: () => {
          const refreshButton = document.querySelector(
            "#layout > div.w-full.h-screen.flex.overflow-hidden.text-primary-0.bg-buildings.bg-cover > div > header > div.flex.gap-4.items-center.justify-between.border-l.pl-4.h-full > button.flex.rounded-full.p-1.bg-transparent.text-theme-primary.hover\\:bg-shade-4.disabled\\:text-shade-1.disabled\\:bg-transparent.hover\\:bg-theme-primary\\/60.relative.p-2",
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
      },
    );
    return true;
  }
  if (
    (message.action === "HOVER_START" || message.action === "HOVER_STOP") &&
    message.payload
  ) {
    const { elementId } = message.payload;
    const tabId = sender.tab.id;

    chrome.runtime.sendMessage({
      action: "hoverEvent",
      data: {
        tabId: tabId,
        elementId: elementId,
        hoverAction: message.action,
      },
    });

    sendResponse({ success: true });
    return true;
  }
});
