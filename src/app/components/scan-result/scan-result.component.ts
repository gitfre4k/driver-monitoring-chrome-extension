import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';

import { ProgressBarService } from '../../@services/progress-bar.service';

@Component({
  selector: 'app-scan-result',
  imports: [
    CommonModule,
    MatExpansionModule,
    FormsModule,
    MatDivider,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './scan-result.component.html',
  styleUrl: './scan-result.component.scss',
})
export class ScanResultComponent {
  private _snackBar = inject(MatSnackBar);
  private progressBarService = inject(ProgressBarService);

  scanResults = this.progressBarService.advancedResaults;
  driverCount = this.progressBarService.activeDriversCount;

  favoriteSeason!: string;
  seasons: string[] = ['Winter', 'Spring', 'Summer', 'Autumn'];

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  copyDriverName(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }
}
