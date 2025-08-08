import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
  MatExpansionModule,
} from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-templates',
  imports: [MatExpansionModule, MatButtonModule, MatIconModule],
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss',
  providers: [
    {
      provide: MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
      useValue: {
        collapsedHeight: '28px',
        expandedHeight: '40px',
      },
    },
  ],
})
export class TemplatesComponent {
  private _snackBar = inject(MatSnackBar);
  copyText(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }
}
