import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  output,
  input,
  inject,
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Subscription } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { TInputTime } from "../../../types";
import { MonitorService } from "../../../@services/monitor.service";

@Component({
  selector: "app-shift-period",
  imports: [ReactiveFormsModule],
  templateUrl: "./shift-period.component.html",
  styleUrls: ["./shift-period.component.scss"],
})
export class ShiftPeriodComponent implements OnInit, OnDestroy {
  @ViewChild("hoursInput") hoursInput!: ElementRef<HTMLInputElement>;
  @ViewChild("minutesInput") minutesInput!: ElementRef<HTMLInputElement>;
  @ViewChild("secondsInput") secondsInput!: ElementRef<HTMLInputElement>;

  monitorService = inject(MonitorService);

  fullClock = input(false);
  mm = input<string>();
  hh = input<string>();
  ss = input<string>();
  period = input<"AM" | "PM">();
  onHoursInputChange = output<{ hours: string }>();
  onMinutesInputChange = output<{ minutes: string }>();
  onSecondsInputChange = output<{ seconds: string }>();
  onPeriodChange = output<"AM" | "PM">();

  timeForm!: FormGroup;

  private formSubscriptions = new Subscription();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.timeForm = this.fb.group({
      hours: [this.hh() ?? "00", [Validators.required]],
      minutes: [this.mm() ?? "00", [Validators.required]],
      seconds: [this.ss() ?? "00", [Validators.required]],
      period: [this.period() ?? "AM", [Validators.required]],
    });

    this.formSubscriptions.add(
      this.timeForm
        .get("hours")
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate("hours", val)),
    );
    this.formSubscriptions.add(
      this.timeForm
        .get("minutes")
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate("minutes", val)),
    );
    this.formSubscriptions.add(
      this.timeForm
        .get("seconds")
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate("seconds", val)),
    );
  }

  private sanitizeAndValidate(controlName: TInputTime, value: string) {
    let sanitizedValue = String(value).replace(/[^0-9]/g, "");
    const isClockMode = this.fullClock();
    if (controlName === "hours")
      +sanitizedValue > (isClockMode ? 12 : 99) &&
        (sanitizedValue = isClockMode ? "12" : "99");
    if (controlName === "minutes" && +sanitizedValue > 59)
      sanitizedValue = "59";
    if (controlName === "seconds" && +sanitizedValue > 59)
      sanitizedValue = "59";

    this.timeForm
      .get(controlName)
      ?.patchValue(sanitizedValue, { emitEvent: false });

    switch (controlName) {
      case "hours":
        this.onHoursInputChange.emit({ hours: sanitizedValue });
        break;
      case "minutes":
        this.onMinutesInputChange.emit({ minutes: sanitizedValue });
        break;
      case "seconds":
        this.onSecondsInputChange.emit({ seconds: sanitizedValue });
        break;
    }
  }
  onMouseWheel(event: WheelEvent, controlName: TInputTime) {
    event.preventDefault();

    if (this.monitorService.isShifting()) return;

    let hours: number = +this.timeForm.get("hours")?.value;
    let minutes: number = +this.timeForm.get("minutes")?.value;
    let seconds: number = +this.timeForm.get("seconds")?.value;
    let period: "AM" | "PM" = this.timeForm.get("period")?.value;

    const isClockMode: boolean = this.fullClock();
    let currentValue: number = +this.timeForm.get(controlName)?.value;

    const isScrollUp = event.deltaY < 0; // true for up, false for down

    switch (controlName) {
      case "hours":
        if (isScrollUp) {
          hours++;
          if (isClockMode) {
            if (hours > 12) {
              hours = 1;
              if (period) this.togglePeriod(period);
            }
          } else {
            if (hours > 99) hours = 0;
          }
        } else {
          // Scroll down
          hours--;
          if (isClockMode) {
            if (hours < 1) {
              hours = 12;
              if (period) this.togglePeriod(period);
            }
          } else {
            if (hours < 0) hours = 99;
          }
        }
        this.timeForm.get(controlName)?.patchValue(this.formatValue(hours));
        break;

      case "minutes":
        if (isScrollUp) {
          minutes++;
          if (minutes > 59) {
            minutes = 0;
            this.timeForm
              .get("hours")
              ?.patchValue(
                this.formatValue(
                  isClockMode
                    ? this.incrementHour(hours, period)
                    : this.incrementHour(hours),
                ),
              );
            if (isClockMode && period) this.togglePeriod(period);
          }
        } else {
          // Scroll down
          minutes--;
          if (minutes < 0) {
            minutes = 59;
            this.timeForm
              .get("hours")
              ?.patchValue(
                this.formatValue(
                  isClockMode
                    ? this.decrementHour(hours, period)
                    : this.decrementHour(hours),
                ),
              );
            if (isClockMode && period) this.togglePeriod(period);
          }
        }
        this.timeForm.get(controlName)?.patchValue(this.formatValue(minutes));
        break;

      case "seconds":
        if (isScrollUp) {
          seconds++;
          if (seconds > 59) {
            seconds = 0;
            this.timeForm
              .get("minutes")
              ?.patchValue(this.formatValue(this.incrementMinute(minutes)));
            if (minutes + 1 > 59) {
              this.timeForm
                .get("hours")
                ?.patchValue(
                  this.formatValue(
                    isClockMode
                      ? this.incrementHour(hours, period)
                      : this.incrementHour(hours),
                  ),
                );
              if (isClockMode && period) this.togglePeriod(period);
            }
          }
        } else {
          // Scroll down
          seconds--;
          if (seconds < 0) {
            seconds = 59;
            this.timeForm
              .get("minutes")
              ?.patchValue(this.formatValue(this.decrementMinute(minutes)));
            if (minutes - 1 < 0) {
              this.timeForm
                .get("hours")
                ?.patchValue(
                  this.formatValue(
                    isClockMode
                      ? this.decrementHour(hours, period)
                      : this.decrementHour(hours),
                  ),
                );
              if (isClockMode && period) this.togglePeriod(period);
            }
          }
        }
        this.timeForm.get(controlName)?.patchValue(this.formatValue(seconds));
        break;

      case "period":
        if (period) {
          this.togglePeriod(period, isScrollUp);
        }
        break;
    }
  }

  private formatValue(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  private togglePeriod(currentPeriod: "AM" | "PM", isScrollUp?: boolean): void {
    const newPeriod = currentPeriod === "AM" ? "PM" : "AM";
    this.timeForm.get("period")?.patchValue(newPeriod);
  }

  private incrementHour(hours: number, period?: "AM" | "PM"): number {
    if (period) {
      if (hours === 11) {
        if (period === "AM") this.togglePeriod("AM");
        else this.togglePeriod("PM");
      }
      if (hours === 12) return 1;
    }
    return (hours + 1) % 100;
  }

  private decrementHour(hours: number, period?: "AM" | "PM"): number {
    if (period) {
      if (hours === 12) {
        if (period === "AM") this.togglePeriod("AM");
        else this.togglePeriod("PM");
      }
      if (hours === 1) return 12;
    }
    return hours - 1 < 0 ? 99 : hours - 1;
  }

  private incrementMinute(minutes: number): number {
    return (minutes + 1) % 60;
  }

  private decrementMinute(minutes: number): number {
    return minutes - 1 < 0 ? 59 : minutes - 1;
  }

  ngAfterViewInit(): void {
    if (!this.fullClock()) {
      this.onMinutesInputChange.emit({ minutes: "00" });
      this.onHoursInputChange.emit({ hours: "00" });
      setTimeout(() => {
        this.hoursInput.nativeElement.focus();
      }, 150);
    }
  }

  @HostListener("keyup", ["$event"]) onKeyUp(event: KeyboardEvent): void {
    const hoursElement = this.hoursInput.nativeElement;
    const minutesElement = this.minutesInput.nativeElement;
    const secondsElement = this.secondsInput?.nativeElement;
    event;

    const id = (event.target as HTMLElement).id;
    let focusMinutesFirst = true;

    if (
      event.key !== "Backspace" &&
      event.key !== "Delete" &&
      event.key !== "Shift"
    ) {
      if (id === "hours") {
        hoursElement.value.length === 1 && (focusMinutesFirst = true);
        focusMinutesFirst &&
          hoursElement &&
          hoursElement.value.length === 2 &&
          minutesElement &&
          minutesElement.focus() &&
          (focusMinutesFirst = false);
      }
      if (id === "minutes") {
        minutesElement.value.length === 2 &&
          secondsElement &&
          secondsElement.focus();
      }
    }
  }

  ngOnDestroy(): void {
    this.formSubscriptions.unsubscribe();
  }
}
