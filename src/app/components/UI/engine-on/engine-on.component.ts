import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-engine-on',
  imports: [],
  templateUrl: './engine-on.component.html',
  styleUrl: './engine-on.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineOnComponent {
  green = '#48bb78';
  red = '#ef4444';
}
