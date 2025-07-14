import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  constructor() {
    console.log(
      '##~##~##~#~##~#~#~',
      this.offSet,
      DateTime.local().zoneName,
      DateTime.fromJSDate(this.today)
        .minus({ days: 2 })
        .plus({ milliseconds: 1 })
        .toUTC()
        .toISO()
    );
  }

  getDailyLogsDate(date: Date) {
    return DateTime.fromJSDate(date)
      .setZone('utc')
      .minus({ days: 2 })
      .plus({ milliseconds: 1 })
      .toJSDate();
  }

  get offSet() {
    return DateTime.local().offset;
  }

  get today() {
    return DateTime.now()
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: this.offSet })
      .toJSDate();
  }

  get sevenDaysAgo() {
    return DateTime.now()
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: this.offSet, days: 7 })
      .toJSDate();
  }

  get monthAgo() {
    return DateTime.now()
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: this.offSet, months: 1 })
      .toJSDate();
  }
}
