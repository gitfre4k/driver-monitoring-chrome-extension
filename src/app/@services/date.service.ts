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
      DateTime.fromJSDate(this.today).toUTC().toISO(),
      DateTime.fromJSDate(this.getDailyLogsDate(this.today)).toUTC().toISO()
    );
  }

  getDailyLogsDate(date: Date) {
    return DateTime.fromJSDate(date)
      .setZone('utc')
      .minus({ days: 2 })
      .plus({ milliseconds: 1 })
      .toJSDate();
  }

  getQueryDate(date: Date) {
    return DateTime.fromJSDate(date)
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: this.offSet })
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
