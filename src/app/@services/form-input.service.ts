import { computed, Injectable, linkedSignal, signal } from "@angular/core";
import { DateTime } from "luxon";

@Injectable({
  providedIn: "root",
})
export class FormInputService {
  newDate = signal("");
  zone = signal("");

  clock = linkedSignal(() => {
    let newDate = this.newDate();
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

  geolocation = signal("");
  latitude = signal("");
  isLatValid = computed(() => !isNaN(+this.latitude()));
  longitude = signal("");
  isLongValid = computed(() => !isNaN(+this.longitude()));
}
