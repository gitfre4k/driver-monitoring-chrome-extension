import { Component } from '@angular/core';
import { ScanResultComponent } from '../scan-result/scan-result.component';

@Component({
  selector: 'app-info',
  imports: [ScanResultComponent],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss',
})
export class InfoComponent {}
