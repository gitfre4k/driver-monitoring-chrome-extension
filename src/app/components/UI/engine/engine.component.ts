import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-engine',
  imports: [],
  templateUrl: './engine.component.html',
  styleUrl: './engine.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineComponent {
  green = '#48bb78';
  red = '#ef4444';
}
