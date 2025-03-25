setTimeout(() => {
  console.log("yo");

  const currentCompany = document.querySelector(
    "#layout > div.w-full.h-screen.flex.overflow-hidden.text-primary-0.bg-buildings.bg-cover > div > header > div.flex.gap-4.items-center.justify-between.border-l.pl-4.h-full > div > button > span > span"
  ).textContent;

  console.log(currentCompany);

  const statusEvents = document.querySelectorAll('[id^="row-"]');
  statusEvents.forEach((statusEvent) => {
    statusEvent.addEventListener("contextmenu", (event) => {
      const time = document.getElementById(statusEvent.id).children[3]
        .textContent;
      const place = document.getElementById(statusEvent.id).children[5]
        .textContent;

      const drivingTimeLeft = document.querySelector(
        "#layout > div.w-full.h-screen.flex.overflow-hidden.text-primary-0.bg-buildings.bg-cover > div > main > div > div > div > section.h-32.flex.justify-between.flex-nowrap.border-b.px-5.pb-4.pt-3 > div.flex.items-end.relative > div:nth-child(1) > svg > text:nth-child(3)"
      ).textContent;

      setTimeout(() => {
        if (document.getElementById("copyTextReplay") != null) return;

        const existingDiv = document.querySelector(
          "div.absolute.z-50.bg-secondary-0.shadow-xl.border.border-shade-2 > div > div"
        );

        if (existingDiv) {
          const newDiv = document.createElement("div");
          newDiv.id = "copyTextReplay";
          newDiv.className =
            "hover:bg-secondary-4 border-shade-3 border-t first:border-0 text-base bg-secondary-1";

          const innerDiv1 = document.createElement("div");
          innerDiv1.className = "px-4 py-1";

          const innerDiv2 = document.createElement("div");
          innerDiv2.className = "w-full cursor-pointer";
          innerDiv2.textContent = "Copy time and location for text replay";

          existingDiv.appendChild(newDiv);
          newDiv.appendChild(innerDiv1);
          innerDiv1.appendChild(innerDiv2);

          newDiv.addEventListener("click", () => {
            navigator.clipboard.writeText(
              `This shift began at ${time}, location ${
                place.split(" ")[2] +
                " " +
                place.split(" ")[3] +
                (place.split(" ")[4] ? " " + place.split(" ")[4] : "") +
                (place.split(" ")[5] ? " " + place.split(" ")[5] : "")
              }. As of the current time, ${drivingTimeLeft} hours remain for driving. ` +
                `Please ensure that logs for previous days are certified and that your trailer ID and BOL number are up-to-date.`
            );
          });
        }
      }, 300);
    });
  });
}, 1500);
