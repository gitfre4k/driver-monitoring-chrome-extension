import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';

import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ConstantsService } from '../../@services/constants.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GlobalSmartfFixService } from '../../@services/global-smartf-fix.service';
import { ExtensionTabNavigationService } from '../../@services/extension-tab-navigation.service';
import { CertificationsScanService } from '../../@services/certifications-scan.service';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { ScanService } from '../../@services/scan.service';
import { AdvancedScanComponent } from '../advanced-scan/advanced-scan.component';
import { DialogKeyboardShortcutsComponent } from '../UI/dialog-keyboard-shortcuts/dialog-keyboard-shortcuts.component';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatRadioModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    MatCheckboxModule,
    MatInputModule,
    MatSliderModule,
    MatSlideToggleModule,
    AdvancedScanComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  constantsService = inject(ConstantsService);
  globalSmartfFixService = inject(GlobalSmartfFixService);
  certScanService = inject(CertificationsScanService);
  progressBarService = inject(ProgressBarService);
  scanService = inject(ScanService);
  private extTabNavService = inject(ExtensionTabNavigationService);

  readonly dialog = inject(MatDialog);

  /** Which settings group is visible: General or Scan settings. Shared via the
   *  navigation service so other tabs (e.g. the Scan page) can preselect it. */
  readonly view = this.extTabNavService.settingsView;

  openShortcuts(): void {
    this.dialog.open(DialogKeyboardShortcutsComponent, { width: '300px' });
  }
}
