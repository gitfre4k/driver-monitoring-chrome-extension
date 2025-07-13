import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  constructor() {
    console.log('################ [Date Service]', this.today);
  }

  get today() {
    return DateTime.utc().endOf('day').toJSDate();
  }

  get sevenDaysAgo() {
    return DateTime.now().minus({ days: 7 }).endOf('day').toJSDate();
  }

  get monthAgo() {
    return DateTime.now().minus({ months: 1 }).endOf('day').toJSDate();
  }

  // getFormatedDates(d: Date) {query
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
