import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FormattedDateService {
  constructor() {}

  private getFormattedDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    console.log(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}.999Z`);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.999Z`;
  }

  private getSevenDaysAgo(date?: Date): Date {
    const today = date ? date : new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    return sevenDaysAgo;
  }

  getFormatedDates(date?: Date) {
    let currentDate = this.getFormattedDate(date ? date : new Date());
    let sevenDaysAgo = this.getFormattedDate(this.getSevenDaysAgo(date));

    return { currentDate, sevenDaysAgo };
  }
}
