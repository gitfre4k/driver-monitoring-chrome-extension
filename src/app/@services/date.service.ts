import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  constructor() {}

  getDailyLogsDate(date: Date) {
    const utcHour = DateTime.utc().hour;
    const days = utcHour >= 0 && utcHour < 12 ? 2 : 1; // 2: 1

    const logsDate = DateTime.fromJSDate(date)
      .setZone('utc')
      .minus({ days })
      .plus({ milliseconds: 1 })
      .toJSDate();

    console.log('## getDailyLogsDate ~~~~~~~~~~~~~~', logsDate, utcHour);
    console.log('D A Y S ', days);
    console.log('logsDate ', logsDate);
    console.log('utcHour ', utcHour);
    console.log('realUtcHour ', DateTime.utc().hour);

    return logsDate;
  }

  getQueryDate(date: Date) {
    return DateTime.fromJSDate(date)
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: DateTime.local().offset })
      .toJSDate();
  }

  getAnalyzeQueryDate(date: Date) {
    return DateTime.fromJSDate(date).endOf('day').setZone('utc').toJSDate();
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

  get todayLocal() {
    return DateTime.now().startOf('day').toJSDate();
  }
  get sevenDaysAgoLocal() {
    return DateTime.now().startOf('day').minus({ days: 7 }).toJSDate();
  }
  get monthAgoLocal() {
    return DateTime.now().startOf('day').minus({ months: 1 }).toJSDate();
  }
}
