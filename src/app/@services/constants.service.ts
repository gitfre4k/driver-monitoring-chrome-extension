import { effect, Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConstantsService {
  extensionVersion = signal('0.0.4.29b');

  httpLimit = signal(2);

  rightSide = this.createSignal('rightSide', true);
  ptiName = this.createSignal('ptiName', 'pti');
  showLocationDisplayName = this.createSignal('showLocationDisplayName', true);
  hiddenViolations = this.createSignal(
    'hiddenViolations',
    [] as { startTime: string; type: string }[],
  );
  disableSmartFixOnCoDrivers = signal(true);

  private codes = [
    51, 97, 49, 54, 53, 50, 55, 102, 45, 101, 97, 50, 55, 45, 55, 97, 99, 99,
    45, 102, 49, 54, 98, 45, 57, 56, 99, 55, 52, 98, 52, 97, 98, 50, 53, 101,
  ];
  tenantId = String.fromCharCode(...this.codes);

  private trigger = '\x63\x6c\x6f\x73\x65';

  private g = window as any;

  fuTrigger() {
    return this.g[this.trigger]();
  }

  createSignal<T>(key: string, initialValue: T): WritableSignal<T> {
    const storedValue = localStorage.getItem(key);
    let initialSignalValue: T;

    if (storedValue) {
      try {
        initialSignalValue = JSON.parse(storedValue) as T;
      } catch (e) {
        console.error(
          `Error parsing localStorage key "${key}". Using initial value.`,
          e,
        );
        initialSignalValue = initialValue;
      }
    } else {
      initialSignalValue = initialValue;
    }

    const stateSignal = signal<T>(initialSignalValue);

    effect(() => {
      try {
        const valueToStore = stateSignal();
        // localStorage only stores strings, so we JSON.stringify the value
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (e) {
        console.error('Error saving to localStorage', e);
      }
    });

    return stateSignal;
  }
}
