import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateAgo',
  pure: true,
})
export class DateAgoPipe implements PipeTransform {
  transform(value: string | Date | number): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      console.error('DateAgoPipe: Invalid date value provided', value);
      return '';
    }

    const seconds = Math.floor((+new Date() - +date) / 1000);

    if (seconds < 30) {
      return 'Just now';
    }

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1,
    };

    let counter: number;
    for (const unit in intervals) {
      if (intervals.hasOwnProperty(unit)) {
        counter = Math.floor(seconds / intervals[unit]);
        if (counter > 0) {
          if (counter === 1) {
            return `${counter} ${unit} ago`;
          } else {
            return `${counter} ${unit}s ago`;
          }
        }
      }
    }

    return '';
  }
}
