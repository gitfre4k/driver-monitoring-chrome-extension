import { IEvent } from "../interfaces/driver-daily-log-events.interface";

export const isNoteValid = (event: IEvent) => {
  const onDutyValidInputs = [
    "pti",
    "pre trip inspection",
    "pre-trip inspection",
    "pre trip",
    "post trip",
    "post trip inspection",
    "pretrip",
    "pick up",
    "pickup",
    "load",
    "loading",
    "shipper",
    "pu",
    "delivery",
    "drop",
    "hook",
    "unload",
    "unloading",
    "fuel",
    "truck change",
  ];
  const sleeperValidInputs = [
    "sleeper",
    "sleeper berth",
    "sleep",
    "sleeping",
    "break",
  ];
  const offDutyValidInputs = ["off duty", "off", "break"];

  let isNoteValid = true;

  const note = event.notes.trim().toLowerCase();

  const isMatch = (arr: string[], value: string) => {
    const isIncluded = arr.some((element) => {
      return element === value;
    });
    if (isIncluded) return true;

    const cleanedValue = value.replace(/,\s*|\s+/g, ",").split(",");
    if (cleanedValue.length < 2) {
      return false;
    }

    const isCombinedMatch = cleanedValue.every((part) => arr.includes(part));
    return isCombinedMatch;
  };

  switch (event.statusName) {
    case "On Duty":
      isNoteValid = isMatch(onDutyValidInputs, note);
      break;
    case "Sleeper Berth":
      isNoteValid = isMatch(sleeperValidInputs, note);
      break;
    case "Off Duty":
      isNoteValid = isMatch(offDutyValidInputs, note);
      break;
  }

  return isNoteValid;
};
