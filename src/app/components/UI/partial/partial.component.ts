import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-partial',
  imports: [],
  templateUrl: './partial.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartialComponent {}
