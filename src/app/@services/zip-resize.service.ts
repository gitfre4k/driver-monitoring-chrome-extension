import { inject, Injectable } from "@angular/core";
import { IEvent } from "../interfaces/driver-daily-log-events.interface";
import { IResizeItem } from "../interfaces/zip.interface";
import {
  getDuration,
  getMinusOneToTwoSecDateISO,
  getRandomIntInclusive,
  timeToSeconds,
} from "../helpers/zip.helpers";
import { ITenant } from "../interfaces";
import {
  catchError,
  concatMap,
  from,
  mergeMap,
  Observable,
  of,
  switchMap,
  throwError,
  toArray,
} from "rxjs";
import { ApiOperationsService } from "./api-operations.service";
import { parseErrorMessage } from "../helpers/context-menu.helpers";
import { ProceedWithAdvancedResizeDialogComponent } from "../components/UI/proceed-with-advanced-resize-dialog/proceed-with-advanced-resize-dialog.component";
import { MatDialog } from "@angular/material/dialog";
import { TEventTypeCode } from "../types";

@Injectable({
  providedIn: "root",
})
export class ZipResizeService {
  apiOperationsService = inject(ApiOperationsService);
  private dialog = inject(MatDialog);

  createResizeItems(
    zipEvents: IEvent[],
    resizeSpeed: number,
    resizeMinDuration: number,
    fill: boolean,
    gapMinDuration: number,
    eventsWithPotentialGaps: { [id: string]: IEvent },
  ): IResizeItem[] {
    return zipEvents
      .filter(
        (event) =>
          event.statusName === "Driving" &&
          event.realEndTime &&
          (event.averageSpeed ?? Infinity) < resizeSpeed, // Handle null/undefined averageSpeed
      )
      .map((event) => {
        const minDuration =
          resizeMinDuration * 60 + getRandomIntInclusive(1, 90);
        const defaultReturn = {
          event,
          duration: getDuration(Math.min(minDuration, event.durationInSeconds)),
          duplicateForGapFillEvent:
            fill &&
            event.durationInSeconds - minDuration >= gapMinDuration * 60 &&
            eventsWithPotentialGaps[event.id],
        };

        if (!event.averageSpeed) return defaultReturn;

        const speed = resizeSpeed - 4 + Math.random() * 8;
        const newSpeed = speed >= 75 ? 74.95 : speed;
        const originalSpeed = event.averageSpeed * 10000;
        const originalDuration = event.durationInSeconds;
        const fillGapMinimalDuration = gapMinDuration * 60;
        const distance = originalSpeed * (originalDuration / 3600);
        const newDuration = ((distance / newSpeed) * 3600) / 10000;

        if (minDuration > newDuration) return defaultReturn;

        const duration = getDuration(newDuration);
        const durationDiff = originalDuration - newDuration;
        const fillGap = durationDiff >= fillGapMinimalDuration;
        const duplicateForGapFillEvent =
          fill && fillGap && eventsWithPotentialGaps[event.id];

        return {
          event,
          duration,
          duplicateForGapFillEvent,
        };
      })
      .filter((resizeItem) => {
        const targetDuration = timeToSeconds(resizeItem.duration);
        return targetDuration > resizeMinDuration * 60;
      });
  }

  processResizeItems(
    tenant: ITenant,
    resizeItems: IResizeItem[],
    resize: boolean,
    fillStatus: TEventTypeCode,
  ): Observable<any> {
    if (!resize || resizeItems.length === 0) {
      return of({});
    }

    return from(resizeItems).pipe(
      concatMap((resizeItem) => {
        // 1. Handle duplication for gap fill
        if (resizeItem.duplicateForGapFillEvent) {
          const eventToDuplicate = resizeItem.duplicateForGapFillEvent;
          return this.apiOperationsService
            .duplicateEvent(tenant, eventToDuplicate, {
              eventTypeCode: fillStatus,
              startTime: getMinusOneToTwoSecDateISO(eventToDuplicate.startTime),
              note: "",
            })
            .pipe(
              mergeMap(() => this.executeResize(tenant, resizeItem)), // Proceed to resize after duplication
            );
        } else {
          // 2. Execute resize directly
          return this.executeResize(tenant, resizeItem);
        }
      }),
      toArray(),
    );
  }

  executeResize(tenant: ITenant, resizeItem: IResizeItem): Observable<any> {
    return this.apiOperationsService
      .resizeEvent(tenant, resizeItem.event.id, {
        duration: resizeItem.duration,
        durationAsTimeSpan: `${new Date().getTime()}`,
      })
      .pipe(
        catchError((err: any) => {
          if (err.error.code === "ResizeEvents.DifferenceInMiles") {
            const parsedErrorInfo = parseErrorMessage(err.error.message);
            if (parsedErrorInfo) {
              return this.dialog
                .open(ProceedWithAdvancedResizeDialogComponent, {
                  data: {
                    title: "Resize Error",
                    info: ` > ${err.error.message}`,
                    message: "Proceed with advanced resize?",
                    event: resizeItem.event,
                  },
                })
                .afterClosed()
                .pipe(
                  switchMap((result) =>
                    result
                      ? this.apiOperationsService.advancedResize(
                          tenant,
                          resizeItem.event,
                          {
                            resizePayload: {
                              duration: resizeItem.duration,
                              durationAsTimeSpan: `${new Date().getTime()}`,
                            },
                            parsedErrorInfo,
                          },
                        )
                      : of({}),
                  ),
                );
            }
          }
          return throwError(() => err);
        }),
      );
  }
}
