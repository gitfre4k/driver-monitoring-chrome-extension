import { Component, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppService } from '../../@services/app.service';
import { ITenant } from '../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SelectAllDirective } from '../../directive/select-all.directive';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { DateTime } from 'luxon';
import { DateService } from '../../@services/date.service';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../@services/api.service';

@Component({
  selector: 'app-cert-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    SelectAllDirective,
    MatDatepickerModule,
    DatePipe,
    CommonModule,
    MatButtonModule,
  ],
  templateUrl: './cert-form.component.html',
  styleUrl: './cert-form.component.scss',
})
export class CertFormComponent {
  private appService = inject(AppService);
  private dateService = inject(DateService);
  private apiService = inject(ApiService);

  tenantList = this.appService.tenantsSignal;
  companies = new FormControl([] as ITenant[]);

  date = new FormControl<Date>(
    DateTime.fromISO(this.dateService.certifyDate).toJSDate(),
  );

  certifyDate = signal(
    this.date.value
      ? this.dateService.certifyCustomDate(this.date.value)
      : this.dateService.certifyDate,
  );

  disableScan = false;

  changeDate(ev: MatDatepickerInputEvent<Date>) {
    this.certifyDate.set(this.dateService.analyzeCustomDate(ev.value!));
  }

  onCertifyLogs() {
    this.disableScan = true;
    setTimeout(() => (this.disableScan = false), 500);

    this.apiService
      .certifyLogDay(
        { id: '3a173017-8724-6b52-332f-eb388cd3c725' } as ITenant,
        223,
        '2026-04-09T04:00:00.000Z',
      )
      .subscribe();
  }
}
