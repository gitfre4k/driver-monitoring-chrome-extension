import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  signal,
} from "@angular/core";
import { DateTime } from "luxon";
import { ApiOperationsService } from "./api-operations.service";
import { ITenant } from "../interfaces";
import { ILocationData } from "../interfaces/api.interface";

@Injectable({
  providedIn: "root",
})
export class FormInputService {
  apiOperationsService = inject(ApiOperationsService);

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

  latitude = signal("");
  isLatValid = computed(() => !isNaN(+this.latitude()));
  longitude = signal("");
  isLongValid = computed(() => !isNaN(+this.longitude()));

  geolocation = signal<ILocationData | null>(null);
  locationDisplayName = computed(() => {
    const geolocation = this.geolocation();
    if (!geolocation) return null;

    const { distance, direction, name, state } = geolocation;

    const distanceString = distance ? `${distance}mi` : "";
    const directionString = direction ? `${distance ? direction : ""}` : "";
    if (isNaN(distance)) return `E R R O R`;

    return `${distanceString} ${directionString} ${name}, ${state}`
      .replace(/\s+/g, " ")
      .trim();
  });

  getGeolocation = (tenant: ITenant) => {
    const lat = +this.latitude();
    const long = +this.longitude();
    return this.apiOperationsService.getGeolocation(tenant, lat, long);
  };
}
