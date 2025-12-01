import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";

import { MatIconModule } from "@angular/material/icon";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { ConstantsService } from "../../@services/constants.service";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDialog } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";

@Component({
  selector: "app-settings",
  imports: [
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    MatCheckboxModule,
    MatInputModule,
  ],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
  providers: [],
})
export class SettingsComponent {
  constantsService = inject(ConstantsService);

  readonly dialog = inject(MatDialog);
}
