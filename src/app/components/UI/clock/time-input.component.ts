import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-time-input',
  imports: [ReactiveFormsModule],
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
})
export class TimeInputComponent implements OnInit, OnDestroy {
  @ViewChild('hoursInput') hoursInput!: ElementRef<HTMLInputElement>;
  @ViewChild('minutesInput') minutesInput!: ElementRef<HTMLInputElement>;

  timeForm!: FormGroup;

  private formSubscriptions = new Subscription();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.timeForm = this.fb.group({
      hours: [
        '',
        [Validators.required, Validators.min(0o0), Validators.max(99)],
      ],
      minutes: [
        '',
        [Validators.required, Validators.min(0o0), Validators.max(59)],
      ],
    });

    this.formSubscriptions.add(
      this.timeForm
        .get('hours')
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate('hours', val))
    );
    this.formSubscriptions.add(
      this.timeForm
        .get('minutes')
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe((val) => this.sanitizeAndValidate('minutes', val))
    );
  }

  private sanitizeAndValidate(controlName: string, value: string) {
    let sanitizedValue = String(value).replace(/[^0-9]/g, '');
    if (controlName === 'hours') {
      +sanitizedValue > 99 && (sanitizedValue = '99');
    }
    if (controlName === 'minutes' && +sanitizedValue > 59)
      sanitizedValue = '59';

    this.timeForm
      .get(controlName)
      ?.patchValue(sanitizedValue, { emitEvent: false });
  }

  onMouseWheel(event: WheelEvent, controlName: 'hours' | 'minutes') {
    event.preventDefault();
    let hours: number = +this.timeForm.get('hours')?.value;

    let value: string = this.timeForm.get(controlName)?.value;

    if (event.deltaY > 0) {
      if (controlName === 'hours') {
        if (+value === 99) {
          value = '99';
        } else value = (+value + 1).toFixed();
      }
      if (controlName === 'minutes') {
        if (+value === 59) {
          if (hours < 99) {
            let newHours = `${hours + 1 < 10 ? '0' : ''}${hours + 1}`;
            value = '00';
            this.timeForm.get('hours')?.patchValue(newHours);
          } else value = '59';
        } else {
          value = (+value + 1).toFixed();
        }
      }
    }
    if (event.deltaY < 0) {
      if (controlName === 'hours') {
        if (hours === 0) value = '00';
        else value = (+value - 1).toFixed();
      }
      if (controlName === 'minutes') {
        if (+value === 0) {
          value = '59';
          if (hours !== 0) {
            let newHours = `${hours - 1 < 10 ? '0' : ''}${hours - 1}`;
            this.timeForm.get('hours')?.patchValue(newHours);
          }
        } else {
          value = (+value - 1).toFixed();
        }
        if (hours === 0 && +value === 0) {
          value = '01';
        }
      }
    }
    if (+value > 0 && +value < 10) value = '0' + +value;
    if (+value <= 0) value = '00';

    this.timeForm.get(controlName)?.patchValue(value);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.hoursInput.nativeElement.focus();
    }, 150);
  }

  @HostListener('keyup', ['$event']) onKeyUp(event: KeyboardEvent): void {
    const hoursElement = this.hoursInput.nativeElement;
    const minutesElement = this.minutesInput.nativeElement;
    if (
      hoursElement &&
      hoursElement.value.length === hoursElement.maxLength &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete'
    ) {
      minutesElement && minutesElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.formSubscriptions.unsubscribe();
  }
}
