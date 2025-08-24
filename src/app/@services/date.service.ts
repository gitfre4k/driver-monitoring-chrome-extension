import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  requestDate!: Date;

  constructor() {}

  getDailyLogsDate(date: Date, offSet: number) {
    this.requestDate = date;
    return this.dailyLogsDate(offSet);
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
    console.log(
      'today ',
      DateTime.now()
        .setZone('utc')
        .endOf('day')
        .minus({ minutes: this.offSet })
        .toJSDate()
    );
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

  dailyLogsDate(offSet: number) {
    const utcHour = DateTime.utc().hour;
    const days = utcHour >= 0 && utcHour < 12 + offSet / 60 ? 2 : 1;

    console.log('LOLOGOGOGOGOLOG ', offSet, days);

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

    return DateTime.fromJSDate(this.requestDate).setZone('utc').toJSDate();
  }

  get analyzeQueryDate() {
    if (!this.requestDate) {
      console.error('[Date Service] Invalid request date');
      return;
    }

    console.log(
      'analyzeQueryDate ',
      DateTime.fromJSDate(this.requestDate)
        .setZone('utc')
        .plus({ days: 1 })
        .toJSDate()
    );

    return DateTime.fromJSDate(this.requestDate)
      .setZone('utc')
      .plus({ days: 1 })
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

  getOffsetFromTimeZone(timeZone: string) {
    switch (timeZone) {
      case 'Hawaii-Aleutian Standard Time':
        return -660;
      case 'Alaska Daylight Time':
        return -540;
      case 'Pacific Standard Time':
        return -480;
      case 'Pacific Daylight Time':
        return -420;
      case 'Mountain Standard Time':
        return -420;
      case 'Central Standard Time':
        return -360;
      case 'Eastern Standard Time':
        return -300;
      case 'Atlantic Standard Time':
        return -240;
      default:
        return -300;
    }
  }
}
