import { effect, Injectable, Signal, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConstantsService {
  extensionVersion = signal('0.0.4.20');

  httpLimit = signal(2);

  rightSide = this.createSignal('rightSide', true);
  showLocationDisplayName = this.createSignal('showLocationDisplayName', true);

  createSignal<T>(key: string, initialValue: T): Signal<T> {
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
