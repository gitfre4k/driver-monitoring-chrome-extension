import { DateTime } from "luxon";

export const formatTenantName = (tenant: string) => {
  const keywordsToRemove = new Set([
    "logistics",
    "logistic",
    "express",
    "service",
    "trans",
    "transport",
    "transportations",
    "transportation",
    "express",
    "enterprises",
    "enterprise",
    "freight",
    "international",
    "cargo",
    "services",
    "trucking",
    "systems",
    "transporting",
  ]);
  let words = tenant.replace(/,/g, "").trim().split(" ");

  if (words.length === 0) return "";

  let lastWord = words[words.length - 1];
  if (
    lastWord.length === 3 ||
    (lastWord.length === 4 && lastWord[lastWord.length - 1] === ".")
  )
    words.pop();
  if (words.length > 0) {
    const newLastWord = words[words.length - 1];
    if (keywordsToRemove.has(newLastWord.toLowerCase())) words.pop();
  }

  return words.join(" ");
};

export const getHoursAndMinutes = (date: string, zone: string) => {
  const hh = DateTime.fromISO(date).setZone(zone).toFormat("hh");
  const mm = DateTime.fromISO(date).setZone(zone).toFormat("mm");
  const ss = DateTime.fromISO(date).setZone(zone).toFormat("ss");
  const period: "AM" | "PM" =
    +DateTime.fromISO(date).setZone(zone).toFormat("HH") >= 12 ? "PM" : "AM";
  return { hh, mm, ss, period };
};

export const getNoSpaceNote = (note: string) => {
  return note.replace(/\s/g, "");
};
