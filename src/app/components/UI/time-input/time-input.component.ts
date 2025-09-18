import {
  Component,
  ViewChild,
  ElementRef,
  input,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DateTime } from "luxon";
import { FormInputService } from "../../../@services/form-input.service";

@Component({
  selector: "app-time-input",
  imports: [FormsModule],
  templateUrl: "./time-input.component.html",
  styleUrl: "./time-input.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeInputComponent {
  @ViewChild("hoursInput") hoursInput!: ElementRef<HTMLInputElement>;
  @ViewChild("minutesInput") minutesInput!: ElementRef<HTMLInputElement>;
  @ViewChild("secondsInput") secondsInput!: ElementRef<HTMLInputElement>;
  @ViewChild("periodInput") periodInput!: ElementRef<HTMLInputElement>;
  @ViewChild("dateInput") dateInput!: ElementRef<HTMLInputElement>;

  formInputService = inject(FormInputService);

  date = input("");
  zone = input("");

  clock = this.formInputService.clock;

  constructor() {}

  ngOnInit(): void {
    this.formInputService.newDate.set(this.date());
    this.formInputService.zone.set(this.zone());
  }

  onMouseWheel(
    event: Event,
    inputType: "hours" | "minutes" | "seconds" | "period" | "date",
  ) {
    event.preventDefault();

    const newDate = this.formInputService.newDate();

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
      this.updateNewDate(
        DateTime.fromISO(newDate)
          .setZone(this.zone())
          [isScrollUp ? "plus" : "minus"]({ [inputType]: 1 })
          .toUTC()
          .toISO()!,
      );
    }
    if (inputType === "period") {
      const isAM = this.clock().period === "AM";
      if ((isAM && isScrollUp) || (!isAM && !isScrollUp))
        this.updateNewDate(
          DateTime.fromISO(newDate)
            .setZone(this.zone())
            [isScrollUp ? "plus" : "minus"]({ hours: 12 })
            .toUTC()
            .toISO()!,
        );
    }
    if (inputType === "date") {
      this.updateNewDate(
        DateTime.fromISO(newDate)
          .setZone(this.zone())
          [isScrollUp ? "plus" : "minus"]({ days: 1 })
          .toUTC()
          .toISO()!,
      );
    }
  }

  updateNewDate(newDate: string) {
    const inputDateAsTime = DateTime.fromISO(newDate).toJSDate().getTime();
    const thisMomentAsTime = DateTime.now()
      .setZone(this.zone())
      .toJSDate()
      .getTime();

    this.formInputService.newDate.set(
      inputDateAsTime > thisMomentAsTime
        ? DateTime.now().setZone(this.zone()).toUTC().toISO()!
        : newDate,
    );
  }
}
