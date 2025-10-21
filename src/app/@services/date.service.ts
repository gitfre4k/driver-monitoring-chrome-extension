import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  /////////////////////////////
  // >> today
  now = DateTime.now();
  startOfToday = this.now.startOf('day');
  endOfToday = this.now.endOf('day');

  // custom format
  formatedDate = (date: Date) => {
    const luxDate = DateTime.fromJSDate(date) as DateTime<true>;
    return {
      startOfDay: luxDate.startOf('day').toUTC().toISO(),
      endOfDay: luxDate.endOf('day').toUTC().toISO(),
    };
  };

  /////////////////////////////
  // >> Violations (end of day)
  violationsToday = this.endOfToday.toUTC().toISO();
  violationsSevenDaysAgo = this.endOfToday.minus({ days: 7 }).toUTC().toISO();
  violationsMonthAgo = this.endOfToday.minus({ months: 1 }).toUTC().toISO();
  // custom
  violationsRange = (from: Date, to: Date) => ({
    from: this.formatedDate(from).endOfDay,
    to: this.formatedDate(to).endOfDay,
  });

  /////////////////////////////
  // >> FMCSA Ins (end + start)
  fmcsaRange = () => ({
    from: this.startOfToday.toUTC().toISO(),
    to: this.endOfToday.toUTC().toISO(),
  });
  //custom
  fmcsaCustomRange = (date: Date) => ({
    from: this.formatedDate(date).startOfDay,
    to: this.formatedDate(date).endOfDay,
  });

  /////////////////////////////
  // >> Analyze Logs Date (end)
  analyzeDate = this.startOfToday.toUTC().toISO();
  analyzeCustomDate = (date: Date) => this.formatedDate(date).startOfDay;

  /////////////////////////////
  // >> getLog Date Range (end)
  getLogsDateRange = () => ({
    from: this.endOfToday.minus({ days: 7 }).toUTC().toISO(),
    to: this.endOfToday.toUTC().toISO(),
  });
  getLogsCustomDateRange = (date: Date) => ({
    from: this.formatedDate(
      DateTime.fromJSDate(date).minus({ days: 7 }).toJSDate(),
    ).endOfDay,
    to: this.formatedDate(date).endOfDay,
  });

  get offSet() {
    return DateTime.local().offset;
  }

  // const utcHour = DateTime.utc().hour;

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
