import { Injectable, linkedSignal, signal } from "@angular/core";
import { DateTime } from "luxon";

@Injectable({
  providedIn: "root",
})
export class TimeInputService {
  newDate = signal("");
  zone = signal("");

  clock = linkedSignal(() => {
    const newDate = this.newDate();
    const zone = this.zone();

    const hours = DateTime.fromISO(newDate).setZone(zone).toFormat("hh");
    const minutes = DateTime.fromISO(newDate).setZone(zone).toFormat("mm");
    const seconds = DateTime.fromISO(newDate).setZone(zone).toFormat("ss");
    const period = DateTime.fromISO(newDate).setZone(zone).toFormat("a") as
      | "AM"
      | "PM";
    const date = DateTime.fromISO(newDate)
      .setZone(zone)
      .toFormat("LLL dd, yyyy");

    return { hours, minutes, seconds, period, date };
  });
}
