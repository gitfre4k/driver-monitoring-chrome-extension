import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  constructor() {}

  get today() {
    return DateTime.now().startOf('day').toUTC().toJSDate();
  }

  get sevenDaysAgo() {
    return DateTime.now().minus({ days: 7 }).startOf('day').toUTC().toJSDate();
  }

  get monthAgo() {
    return DateTime.now()
      .minus({ months: 1 })
      .startOf('day')
      .toUTC()
      .toJSDate();
  }

  // getFormatedDates(d: Date) {
  //   return {
  //     date: DateTime.fromJSDate(d).startOf('day').toUTC().toJSDate(),
  //     sevenDaysAgo: DateTime.fromJSDate(d)
  //       .minus({ days: 7 })

  //       .startOf('day')
  //       .toUTC()
  //       .toJSDate(),
  //     monthAgo: DateTime.fromJSDate(d)
  //       .minus({ months: 1 })

  //       .startOf('day')
  //       .toUTC()
  //       .toJSDate(),
  //   };
  // }
}
