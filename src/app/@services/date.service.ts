import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  constructor() {}

  get today() {
    return DateTime.now().endOf('day').toUTC().toJSDate();
  }

  get sevenDaysAgo() {
    return DateTime.now().minus({ days: 7 }).endOf('day').toUTC().toJSDate();
  }

  get monthAgo() {
    return DateTime.now().minus({ months: 1 }).endOf('day').toUTC().toJSDate();
  }

  getFormatedDates(d: Date) {
    return {
      date: DateTime.fromJSDate(d).endOf('day').toUTC().toJSDate(),
      sevenDaysAgo: DateTime.fromJSDate(d)
        .minus({ days: 7 })
        .endOf('day')
        .toUTC()
        .toJSDate(),
      monthAgo: DateTime.fromJSDate(d)
        .minus({ months: 1 })
        .endOf('day')
        .toUTC()
        .toJSDate(),
    };
  }
}
