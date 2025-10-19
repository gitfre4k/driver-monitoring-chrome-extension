import { inject, Injectable } from "@angular/core";
import { IEvent } from "../interfaces/driver-daily-log-events.interface";
import { Observable, of } from "rxjs";
import {
  deletableStatusNames,
  dutyStatusNames,
  getRangeDuration,
  getTime,
} from "../helpers/zip.helpers";
import { MonitorService } from "./monitor.service";
import { IZipInitializationData } from "../interfaces/zip.interface";

@Injectable({
  providedIn: "root",
})
export class ZipInitializationService {
  monitorService = inject(MonitorService);

  initializeZipEvents(allEvents: IEvent[]): Observable<IZipInitializationData> {
    const selectedEvents = this.monitorService.selectedEvents();

    const { 0: firstSelected, [selectedEvents.length - 1]: lastSelected } =
      selectedEvents.sort((a, b) => getTime(a) - getTime(b));

    const startTime = getTime(firstSelected);
    const endTime = getTime(lastSelected);

    const zipEvents = allEvents.filter((e) => {
      const eventTime = getTime(e);
      return eventTime >= startTime && eventTime <= endTime;
    });

    const dutyStatuses = zipEvents.filter((event) =>
      dutyStatusNames.has(event.statusName),
    );

    const onDutyIdsToFill = dutyStatuses
      .filter((event, index) => {
        if (
          index !== 0 &&
          event.statusName === "On Duty" &&
          dutyStatuses[index - 1] &&
          dutyStatuses[index - 1]?.statusName === "Driving"
        )
          return true;
        else return false;
      })
      .map((event) => event.id);

    const eventsWithPotentialGaps = {} as { [id: string]: IEvent };

    dutyStatuses.forEach((event, index) => {
      if (onDutyIdsToFill.includes(event.id)) {
        eventsWithPotentialGaps[dutyStatuses[index - 1].id] =
          dutyStatuses[index];
      }
    });

    const eventsToDelete: IEvent[] = [];

    zipEvents.forEach((event) => {
      deletableStatusNames.has(event.statusName) && eventsToDelete.push(event);
    });

    const selectedRangeDuration = getRangeDuration(
      dutyStatuses[0].startTime,
      dutyStatuses[dutyStatuses.length - 1].startTime,
    );

    return of({
      zipEvents: zipEvents.filter((event) => {
        const eventTime = getTime(event);
        return (
          eventTime >= startTime &&
          eventTime <= endTime &&
          dutyStatusNames.has(event.statusName)
        );
      }),
      startTime,
      endTime,
      selectedRangeDuration,
      eventsToDelete,
      eventsWithPotentialGaps,
    });
  }
}
