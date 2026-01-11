import { effect, Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConstantsService {
  extensionVersion = signal('0.0.4.29');

  httpLimit = signal(2);

  rightSide = this.createSignal('rightSide', true);
  ptiName = this.createSignal('ptiName', 'pti');
  showLocationDisplayName = this.createSignal('showLocationDisplayName', true);
  hiddenViolations = this.createSignal(
    'hiddenViolations',
    [] as { startTime: string; type: string }[],
  );
  disableSmartFixOnCoDrivers = signal(true);

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
