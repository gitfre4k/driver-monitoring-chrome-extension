import { IEvent } from "../interfaces/driver-daily-log-events.interface";

// export const invalidPTINote = (n: string) => {
//   const validPTINotes = [
//     'pti',
//     'pre trip inspection',
//     'pre-trip inspection',
//     'pre trip',
//     'post trip',
//     'post trip inspection',
//     'pretrip',
//   ];

//   const note = n.trim().toLowerCase();

//   const isMatch = (arr: string[], value: string) => {
//     const isIncluded = arr.some((element) => {
//       return element === value;
//     });
//     if (isIncluded) return true;

//     const cleanedValue = value.replace(/,\s*|\s+/g, ',').split(',');
//     if (cleanedValue.length < 2) {
//       return false;
//     }

//     const isCombinedMatch = cleanedValue.every((part) => arr.includes(part));
//     return isCombinedMatch;
//   };

//   return isMatch(validPTINotes, note);
// };

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
    "fueling",
    "truck change",
  ];
  const sleeperValidInputs = [
    "sleeper",
    "sleeper berth",
    "sleep",
    "sleeping",
    "break",
    "rest",
  ];
  const offDutyValidInputs = ["off duty", "off", "break", "rest"];

  let isNoteValid = true;

  const note = event.notes.replace(/,/g, " ").trim().toLowerCase();

  const isMatch = (arr: string[], value: string) => {
    const isIncluded = arr.some((element) => {
      return element === value;
    });
    if (isIncluded) return true;

    const splitValue = value.split(/\s+/);
    if (splitValue.length < 2) {
      return false;
    }

    const isCombinedMatch = splitValue.every((part) => arr.includes(part));
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
