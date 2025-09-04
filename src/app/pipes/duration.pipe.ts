import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
})
export class DurationPipe implements PipeTransform {
  transform(totalSeconds: number, withSeconds?: boolean): string {
    if (isNaN(totalSeconds) || totalSeconds <= 0) {
      return '';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor((totalSeconds % 3600) % 60);

    const formattedHours = hours.toString();
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds.toString();

    if (withSeconds)
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

    return `${formattedHours}:${formattedMinutes}`;
  }
}
