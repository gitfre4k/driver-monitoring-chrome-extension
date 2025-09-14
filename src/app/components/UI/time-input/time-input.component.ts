import { Component, ViewChild, ElementRef, input, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DateTime } from "luxon";
import { TimeInputService } from "../../../@services/time-input.service";

@Component({
  selector: "app-time-input",
  imports: [FormsModule],
  templateUrl: "./time-input.component.html",
  styleUrl: "./time-input.component.scss",
})
export class TimeInputComponent {
  @ViewChild("hoursInput") hoursInput!: ElementRef<HTMLInputElement>;
  @ViewChild("minutesInput") minutesInput!: ElementRef<HTMLInputElement>;
  @ViewChild("secondsInput") secondsInput!: ElementRef<HTMLInputElement>;
  @ViewChild("periodInput") periodInput!: ElementRef<HTMLInputElement>;
  @ViewChild("dateInput") dateInput!: ElementRef<HTMLInputElement>;

  timeInputService = inject(TimeInputService);

  date = input("");
  zone = input("");

  clock = this.timeInputService.clock;

  constructor() {}

  ngOnInit(): void {
    this.timeInputService.newDate.set(this.date());
    this.timeInputService.zone.set(this.zone());
  }

  onMouseWheel(
    event: Event,
    inputType: "hours" | "minutes" | "seconds" | "period" | "date",
  ) {
    event.preventDefault();

    let isScrollUp = false;
    if (event instanceof WheelEvent) {
      isScrollUp = event.deltaY < 0;
    }
    if (event instanceof KeyboardEvent) {
      event.key === "ArrowUp" && (isScrollUp = true);
      event.key === "ArrowDown" && (isScrollUp = false);
    }

    switch (inputType) {
      case "hours":
        this.hoursInput.nativeElement.focus();
        break;
      case "minutes":
        this.minutesInput.nativeElement.focus();
        break;
      case "seconds":
        this.secondsInput.nativeElement.focus();
        break;
      case "period":
        this.periodInput.nativeElement.focus();
        break;
      case "date":
        this.dateInput.nativeElement.focus();
        break;
      default:
        break;
    }

    if (["hours", "minutes", "seconds"].includes(inputType)) {
      this.timeInputService.newDate.update(
        (date) =>
          DateTime.fromISO(date)
            .setZone(this.zone())
            [isScrollUp ? "plus" : "minus"]({ [inputType]: 1 })
            .toUTC()
            .toISO()!,
      );
    }
    if (inputType === "period") {
      const isAM = this.clock().period === "AM";
      if ((isAM && isScrollUp) || (!isAM && !isScrollUp))
        this.timeInputService.newDate.update(
          (date) =>
            DateTime.fromISO(date)
              .setZone(this.zone())
              [isScrollUp ? "plus" : "minus"]({ hours: 12 })
              .toUTC()
              .toISO()!,
        );
    }
    if (inputType === "date") {
      this.timeInputService.newDate.update(
        (date) =>
          DateTime.fromISO(date)
            .setZone(this.zone())
            [isScrollUp ? "plus" : "minus"]({ days: 1 })
            .toUTC()
            .toISO()!,
      );
    }
  }
}
