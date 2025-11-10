import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConstantsService {
  httpLimit = signal(5);
  rightSide = signal(false);
  extensionVersion = signal('0.0.4.13');
}
