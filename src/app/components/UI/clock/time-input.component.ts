import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  output,
  input,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TInputTime } from '../../../types';

@Component({
  selector: 'app-time-input',
  imports: [ReactiveFormsModule],
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
})
export class TimeInputComponent implements OnInit, OnDestroy {
  @ViewChild('hoursInput') hoursInput!: ElementRef<HTMLInputElement>;
  @ViewChild('minutesInput') minutesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('secondsInput') secondsInput!: ElementRef<HTMLInputElement>;

  fullClock = input(false);
  mm = input<string>();
  hh = input<string>();
  ss = input<string>();
  period = input<'AM' | 'PM'>();
  onHoursInputChange = output<{ hours: string }>();
  onMinutesInputChange = output<{ minutes: string }>();
  onSecondsInputChange = output<{ seconds: string }>();
  onPeriodChange = output<'AM' | 'PM'>();

  timeForm!: FormGroup;

  private formSubscriptions = new Subscription();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.timeForm = this.fb.group({
      hours: [this.hh() ?? '00', [Validators.required]],
      minutes: [this.mm() ?? '00', [Validators.required]],
      seconds: [this.ss() ?? '00', [Validators.required]],
      period: [this.period() ?? 'AM', [Validators.required]],
    });

    this.formSubscriptions.add(
      this.timeForm
        .get('hours')
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate('hours', val)),
    );
    this.formSubscriptions.add(
      this.timeForm
        .get('minutes')
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate('minutes', val)),
    );
    this.formSubscriptions.add(
      this.timeForm
        .get('seconds')
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate('seconds', val)),
    );
  }

  private sanitizeAndValidate(controlName: TInputTime, value: string) {
    let sanitizedValue = String(value).replace(/[^0-9]/g, '');
    const isClockMode = this.fullClock();
    if (controlName === 'hours')
      +sanitizedValue > (isClockMode ? 12 : 99) &&
        (sanitizedValue = isClockMode ? '12' : '99');
    if (controlName === 'minutes' && +sanitizedValue > 59)
      sanitizedValue = '59';
    if (controlName === 'seconds' && +sanitizedValue > 59)
      sanitizedValue = '59';

    this.timeForm
      .get(controlName)
      ?.patchValue(sanitizedValue, { emitEvent: false });

    switch (controlName) {
      case 'hours':
        this.onHoursInputChange.emit({ hours: sanitizedValue });
        break;
      case 'minutes':
        this.onMinutesInputChange.emit({ minutes: sanitizedValue });
        break;
      case 'seconds':
        this.onSecondsInputChange.emit({ seconds: sanitizedValue });
        break;
    }
  }

  onMouseWheel(event: WheelEvent, controlName: TInputTime) {
    event.preventDefault();

    let hours: number = +this.timeForm.get('hours')?.value;
    let minutes: number = +this.timeForm.get('minutes')?.value;
    let period: 'AM' | 'PM' = this.timeForm.get('period')?.value;
    const isClockMode = this.fullClock();

    let value: string = this.timeForm.get(controlName)?.value;

    if (event.deltaY < 0) {
      if (controlName === 'period') value = 'PM';
      // positive +++
      if (controlName === 'hours') {
        if (+value === (isClockMode ? 11 : 99)) {
          if (period === 'PM') {
            value = '11';
          } else {
            value = '99';
          }
        } else if (period === 'AM' && hours === 12) {
          value = '01';
          this.timeForm.get('period')?.patchValue('PM');
        } else value = (+value + 1).toFixed();
      }
      if (controlName === 'minutes') {
        if (+value === 59) {
          if (hours < (isClockMode ? 11 : 99)) {
            let newHours = `${hours + 1 < 10 ? '0' : ''}${hours + 1}`;
            value = '00';
            this.timeForm.get('hours')?.patchValue(newHours);
          } else {
            if (period === 'AM') {
              value = '00';
              this.timeForm.get('hours')?.patchValue('01');
              this.timeForm.get('period')?.patchValue('PM');
            } else {
              value = '59';
            }
          }
        } else {
          value = (+value + 1).toFixed();
        }
      }

      if (controlName === 'seconds') {
        if (+value === 59) {
          if (minutes === 59) {
            if (hours === (isClockMode ? 11 : 99)) {
              if (period && period === 'AM') {
                value = '00';
                this.timeForm.get('minutes')?.patchValue('00');
                this.timeForm.get('hours')?.patchValue('01');
                this.timeForm.get('period')?.patchValue('PM');
              } else {
                value = '59';
              }
            } else {
              value = '00';
              let newHours = `${hours + 1 < 10 ? '0' : ''}${hours + 1}`;
              this.timeForm.get('hours')?.patchValue(newHours);
              this.timeForm.get('minutes')?.patchValue('00');
            }
          } else {
            let newMinutes = `${minutes + 1 < 10 ? '0' : ''}${minutes + 1}`;
            this.timeForm.get('minutes')?.patchValue(newMinutes);
            value = '00';
          }
        } else {
          value = (+value + 1).toFixed();
        }
      }
    }
    if (event.deltaY > 0) {
      if (controlName === 'period') value = 'AM';
      // negative ---

      if (controlName === 'hours') {
        if (hours === 0) value = '00';
        else value = (+value - 1).toFixed();

        if (period === 'PM') {
          if (hours === 12) this.timeForm.get('period')?.patchValue('AM');
          if (hours === 1) value = '12';
        }
      }
      if (controlName === 'minutes') {
        if (+value === 0) {
          value = '59';
          if (hours !== 0) {
            let newHours = `${hours - 1 < 10 ? '0' : ''}${hours - 1}`;
            this.timeForm.get('hours')?.patchValue(newHours);
          }
          if (period === 'PM') {
            if (hours === 12) {
              this.timeForm.get('period')?.patchValue('AM');
            }
            if (hours === 1) {
              this.timeForm.get('hours')?.patchValue('12');
            }
          }
        } else {
          value = (+value - 1).toFixed();
        }
        if (hours === 0 && +value === 0) {
          value = '01';
        }
      }

      if (controlName === 'seconds') {
        if (+value === 0) {
          value = '59';

          if (minutes !== 0) {
            let newMinutes = `${minutes - 1 < 10 ? '0' : ''}${minutes - 1}`;
            this.timeForm.get('minutes')?.patchValue(newMinutes);
          } else {
            if (hours !== 0) {
              this.timeForm.get('minutes')?.patchValue('59');
              let newHours = `${hours - 1 < 10 ? '0' : ''}${hours - 1}`;
              this.timeForm.get('hours')?.patchValue(newHours);
            }
            if (period === 'PM') {
              if (hours === 12) {
                this.timeForm.get('period')?.patchValue('AM');
                this.timeForm.get('hours')?.patchValue('11');
              }
              if (hours === 1) {
                this.timeForm.get('hours')?.patchValue('12');
              }
            } else {
              value = '01';
            }
          }
        } else {
          value = (+value - 1).toFixed();
        }
        if (hours === 0 && minutes === 0 && +value === 0) {
          value = '01';
        }
      }
    }
    if (+value > 0 && +value < 10) value = '0' + +value;
    if (+value <= 0) value = '00';

    this.timeForm.get(controlName)?.patchValue(value);
  }

  ngAfterViewInit(): void {
    !this.fullClock() &&
      setTimeout(() => {
        this.hoursInput.nativeElement.focus();
      }, 150);
  }

  @HostListener('keyup', ['$event']) onKeyUp(event: KeyboardEvent): void {
    const hoursElement = this.hoursInput.nativeElement;
    const minutesElement = this.minutesInput.nativeElement;
    const secondsElement = this.secondsInput?.nativeElement;
    event;

    const id = (event.target as HTMLElement).id;
    let focusMinutesFirst = true;

    if (event.key !== 'Backspace' && event.key !== 'Delete') {
      if (id === 'hours') {
        hoursElement.value.length === 1 && (focusMinutesFirst = true);
        focusMinutesFirst &&
          hoursElement &&
          hoursElement.value.length === 2 &&
          minutesElement &&
          minutesElement.focus() &&
          (focusMinutesFirst = false);
      }
      if (id === 'minutes') {
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
