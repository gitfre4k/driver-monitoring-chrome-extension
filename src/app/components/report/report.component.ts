import { Component, Input, input } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';


import { IScanErrors } from '../../interfaces';

@Component({
  selector: 'app-report',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent {
  @Input() analyzeError: IScanErrors[] | null = null;
  constructor() {}
}
