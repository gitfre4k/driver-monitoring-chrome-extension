import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-keyboard-shortcuts',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './dialog-keyboard-shortcuts.component.html',
  styleUrl: './dialog-keyboard-shortcuts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogKeyboardShortcutsComponent {
  readonly shortcuts: { label: string; keys: string }[] = [
    { label: 'Shift Operation', keys: 'SHIFT' },
    { label: 'Delete Operation', keys: 'DELETE' },
    { label: 'Zip Operation', keys: 'Z / 0' },
    { label: 'navigate to next day', keys: 'Right Arrow' },
    { label: 'navigate to previous day', keys: 'Left Arrow' },
  ];
}
