import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { ProgressBarService } from '../../@services/progress-bar.service';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * @title Basic expansion panel
 */
@Component({
  selector: 'app-scan-result',
  imports: [
    CommonModule,
    MatExpansionModule,
    MatTooltipModule,
    MatIconModule,
    MatDivider,
    MatButtonModule,
  ],
  templateUrl: './scan-result.component.html',
  styleUrl: './scan-result.component.scss',
})
export class ScanResultComponent {
  private _snackBar = inject(MatSnackBar);
  private progressBarService = inject(ProgressBarService);

  scanResults = this.progressBarService.advancedResaults;

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  copyDriverName(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }
}

// const hasSmokingPrivileges = () => {
//   if (['Milorad Maric'].includes(this.shift.budaci())) {
//     return false;
//   } else {
//     if ($time > '20:00' || $time < '08:00') {
//       return true;
//     }
//     return false;
//   }
// };
