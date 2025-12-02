import { Component, inject } from '@angular/core';
import { BackendService } from '../../@services/backend.service';
import { KeyValuePipe } from '@angular/common';

@Component({
  selector: 'app-shift-report',
  imports: [KeyValuePipe],
  templateUrl: './shift-report.component.html',
  styleUrl: './shift-report.component.scss',
})
export class ShiftReportComponent {
  backendService = inject(BackendService);
}
