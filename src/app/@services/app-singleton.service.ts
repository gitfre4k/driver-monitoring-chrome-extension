import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Declare chrome global to avoid TypeScript errors
declare const chrome: any;

@Injectable({
  providedIn: 'root',
})
export class AppSingletonService {
  private counterSubject = new Subject<number>();
  public counter$: Observable<number> = this.counterSubject.asObservable();

  private operationStatusSubject = new Subject<string>();
  public operationStatus$: Observable<string> =
    this.operationStatusSubject.asObservable();

  constructor(private ngZone: NgZone) {
    // Listen for messages from the background script
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener((message: any) => {
        // Use NgZone to ensure Angular change detection runs
        this.ngZone.run(() => {
          if (message.type === 'counterUpdate') {
            this.counterSubject.next(message.newCount);
            console.log(
              'Service: Counter updated from background:',
              message.newCount
            );
          } else if (message.type === 'operationStatus') {
            this.operationStatusSubject.next(message.status);
            console.log(
              'Service: Operation status from background:',
              message.status
            );
          }
        });
      });

      // Request initial state from background script when the service starts
      this.getInitialState();
    } else {
      console.warn(
        'Chrome API not available. Running in non-extension environment.'
      );
      // Provide mock data for development outside of Chrome extension context
      this.counterSubject.next(0);
      this.operationStatusSubject.next('mock_idle');
    }
  }

  private getInitialState(): void {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      chrome.runtime.sendMessage(
        { action: 'getInitialState' },
        (response: any) => {
          this.ngZone.run(() => {
            if (response) {
              this.counterSubject.next(response.initialCount);
              this.operationStatusSubject.next(response.operationStatus);
              console.log('Service: Initial state loaded:', response);
            } else {
              console.error(
                'Service: Failed to get initial state from background.'
              );
            }
          });
        }
      );
    }
  }

  incrementCounter(): void {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      chrome.runtime.sendMessage(
        { action: 'incrementCounter' },
        (response: any) => {
          this.ngZone.run(() => {
            if (response && response.type === 'counterUpdate') {
              // Counter is already updated via onMessage listener, but good for immediate feedback
              // this.counterSubject.next(response.newCount);
            } else if (chrome.runtime.lastError) {
              console.error(
                'Service: Error incrementing counter:',
                chrome.runtime.lastError.message
              );
            }
          });
        }
      );
    } else {
      console.log('Service: Mock increment counter');
      this.counterSubject.next((this.counterSubject as any)._value + 1); // Mock behavior
    }
  }

  startUniqueOperation(): void {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      chrome.runtime.sendMessage(
        { action: 'startUniqueOperation' },
        (response: any) => {
          this.ngZone.run(() => {
            if (response && response.type === 'operationStatus') {
              this.operationStatusSubject.next(response.status);
              console.log(
                'Service: Operation start response:',
                response.status
              );
            } else if (chrome.runtime.lastError) {
              console.error(
                'Service: Error starting operation:',
                chrome.runtime.lastError.message
              );
            }
          });
        }
      );
    } else {
      console.log('Service: Mock start unique operation');
      this.operationStatusSubject.next('mock_started');
      setTimeout(() => this.operationStatusSubject.next('mock_finished'), 3000); // Mock behavior
    }
  }
}
