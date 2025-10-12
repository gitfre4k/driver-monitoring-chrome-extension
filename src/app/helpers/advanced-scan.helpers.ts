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
    "pretrip inspection",
    "pre trip inspection",
    "pre-trip inspection",
    "pre - trip inspection",
    "pretrip",
    "pre trip",
    "pre-trip",
    "post trip",
    "post-trip",
    "post trip inspection",
    "post-trip inspection",
    "pti inspection",
    "pt inspection",

    "pu",
    "pick up",
    "pickup",
    "load",
    "loaded",
    "loading",
    "shipper",
    "del",
    "delivery",
    "unload",
    "unloaded",
    "unloading",
    "scale",
    "drop",
    "drop off",
    "hook",
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

  const isMatch = (arr: string[], note: string) => {
    const isIncluded = arr.some((element) => {
      return element === note;
    });
    if (isIncluded) return true;

    const splitNote = note.split(/\s+/);
    if (splitNote.length < 2) {
      return false;
    }

    const isCombinedMatch = splitNote.every(
      (part) => arr.includes(part) || part === "and",
    );
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
