import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-change',
  imports: [],
  templateUrl: './change.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeComponent {}
