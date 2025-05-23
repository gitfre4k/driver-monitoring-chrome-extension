import { Component, inject, Input } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import {
  IAdvancedResaults,
  IScanDOTInspections,
  IScanViolations,
} from '../../interfaces';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatDivider,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent {
  @Input() violations: IScanViolations[] | null = null;
  @Input() inspections: IScanDOTInspections[] | null = null;
  @Input() advancedScanResults: IAdvancedResaults | null = null;

  private _snackBar = inject(MatSnackBar);

  constructor() {}

  copyDriverName(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }
}
