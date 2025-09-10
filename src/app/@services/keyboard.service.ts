import { Injectable, signal } from '@angular/core';
import { fromEvent, map, merge, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class KeyboardService {
  private _isCtrlPressed = signal(false);
  public readonly isCtrlPressed = this._isCtrlPressed.asReadonly();

  constructor() {
    const keydown$ = fromEvent<KeyboardEvent>(window, 'keydown').pipe(
      tap((event) => event.preventDefault()),
      map((event) => event.ctrlKey),
    );
    const keyup$ = fromEvent<KeyboardEvent>(window, 'keyup').pipe(
      tap((event) => event.preventDefault()),
      map((event) => event.ctrlKey),
    );

    merge(keydown$, keyup$).subscribe((isCtrl) => {
      this._isCtrlPressed.set(isCtrl);
    });

    console.log(this._isCtrlPressed());
  }

  ngOnInit() {}
}
