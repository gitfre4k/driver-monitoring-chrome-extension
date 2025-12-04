import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-dialog-add-note',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
  ],
  templateUrl: './dialog-add-note.component.html',
  styleUrl: './dialog-add-note.component.scss',
})
export class DialogAddNoteComponent {
  readonly dialogRef = inject(MatDialogRef<DialogAddNoteComponent>);
  readonly data = inject(MAT_DIALOG_DATA);
  readonly company = model(this.data.company);
  readonly note = model(this.data.note);

  onNoClick(): void {
    this.dialogRef.close();
  }
}
