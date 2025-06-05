import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

/**
 * @title Basic expansion panel
 */
@Component({
  selector: 'app-scan-result',
  imports: [MatExpansionModule],
  templateUrl: './scan-result.component.html',
  styleUrl: './scan-result.component.scss',
})
export class ScanResultComponent {
  readonly panelOpenState = signal(false);
}
