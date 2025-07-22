function attachRowContextMenuListener(rowElement) {
  if (rowElement.dataset.contextMenuListenerAttached) {
    return;
  }
  rowElement.dataset.contextMenuListenerAttached = "true";

  rowElement.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    const time = rowElement.children[3]?.textContent;
    const place = rowElement.children[5]?.textContent;
    const drivingTimeLeft = document.querySelector(
      "#layout > div.w-full.h-screen.flex.overflow-hidden.text-primary-0.bg-buildings.bg-cover > div > main > div > div > div > section.h-32.flex.justify-between.flex-nowrap.border-b.px-5.pb-4.pt-3 > div.flex.items-end.relative > div:nth-child(1) > svg > text:nth-child(3)"
    )?.textContent;

    const menuObserver = new MutationObserver((mutations, observerInstance) => {
      const existingDiv = document.querySelector(
        "div.absolute.z-50.bg-secondary-0.shadow-xl.border.border-shade-2 > div > div"
      );

      if (existingDiv && !document.getElementById("copyTextReply")) {
        const newDiv = document.createElement("div");
        newDiv.id = "copyTextReply";
        newDiv.className =
          "hover:bg-secondary-4 border-shade-3 border-t first:border-0 text-base bg-secondary-1";

        const innerDiv1 = document.createElement("div");
        innerDiv1.className = "px-4 py-1";

        const innerDiv2 = document.createElement("div");
        innerDiv2.className = "w-full cursor-pointer";
        innerDiv2.textContent = "Copy Shift Info for Reply";

        existingDiv.appendChild(newDiv);
        newDiv.appendChild(innerDiv1);
        innerDiv1.appendChild(innerDiv2);

        newDiv.addEventListener("click", () => {
          const parsedPlace = `${place.split(" ")[2]} ${place.split(" ")[3]}${
            place.split(" ")[4] ? " " + place.split(" ")[4] : ""
          }${place.split(" ")[5] ? " " + place.split(" ")[5] : ""}`;
          const clipboardText = `This shift began at ${time}, location ${parsedPlace}.${
            drivingTimeLeft
              ? ` As of the current time, ${drivingTimeLeft} hours remain for driving.`
              : ""
          } Please ensure that logs for previous days are certified and that your trailer ID and BOL number are up-to-date.`;
          navigator.clipboard.writeText(clipboardText);
        });

        observerInstance.disconnect();
      }
    });

    menuObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      if (menuObserver) {
        menuObserver.disconnect();
      }
    }, 700);
  });
}

function scanAndAttachListenersToRows(nodes) {
  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.id && node.id.startsWith("row-")) {
        attachRowContextMenuListener(node);
      }
      const descendantRows = node.querySelectorAll('[id^="row-"]');
      descendantRows.forEach((row) => {
        if (row.id && row.id.startsWith("row-")) {
          attachRowContextMenuListener(row);
        }
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const initialRows = document.querySelectorAll('[id^="row-"]');
  scanAndAttachListenersToRows(initialRows);
});

const mainContentObserver = new MutationObserver(
  (mutationsList, observerInstance) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        scanAndAttachListenersToRows(mutation.addedNodes);
      }
    }
  }
);

mainContentObserver.observe(document.body, { childList: true, subtree: true });
