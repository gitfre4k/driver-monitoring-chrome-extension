import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  requestDate!: Date;

  constructor() {}

  getDailyLogsDate(date: Date) {
    this.requestDate = date;
    return this.dailyLogsDate;
  }
  getQueryDate(date: Date) {
    this.requestDate = date;
    return this.queryDate;
  }
  getDOTQueryDate(date: Date) {
    this.requestDate = date;
    return this.dotQueryDate;
  }
  getAnalyzeQueryDate(date: Date) {
    this.requestDate = date;
    return this.analyzeQueryDate;
  }

  get offSet() {
    return DateTime.local().offset;
  }
  ///////////
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

  get dailyLogsDate() {
    if (!this.requestDate) {
      console.error('[Date Service] Invalid request date');
      return;
    }

    const utcHour = DateTime.utc().hour;
    const days = utcHour >= 0 && utcHour < 12 + this.offSet / 60 ? 2 : 1;

    const logsDate = DateTime.fromJSDate(this.requestDate)
      .setZone('utc')
      .minus({ days })
      .plus({ milliseconds: 1 })
      .toJSDate();

    return logsDate;
  }

  get queryDate() {
    if (!this.requestDate) {
      console.error('[Date Service] Invalid request date');
      return;
    }

    return DateTime.fromJSDate(this.requestDate)
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: DateTime.local().offset })
      .toJSDate();
  }

  get dotQueryDate() {
    if (!this.requestDate) {
      console.error('[Date Service] Invalid request date');
      return;
    }

    return DateTime.fromJSDate(this.requestDate)
      .setZone('utc')
      .endOf('day')
      .minus({ minutes: DateTime.local().offset })
      .plus({ milliseconds: 1 })
      .toJSDate();
  }

  get analyzeQueryDate() {
    if (!this.requestDate) {
      console.error('[Date Service] Invalid request date');
      return;
    }

    return DateTime.fromJSDate(this.requestDate)
      .endOf('day')
      .setZone('utc')
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
