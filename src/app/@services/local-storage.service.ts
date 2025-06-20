// local-storage.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface ChromeRuntime {
  sendMessage: (message: any) => Promise<any>;
  lastError?: { message: string };
}

// Declare chrome global to avoid TypeScript errors
// declare const chrome: { runtime: ChromeRuntime };

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  constructor(private ngZone: NgZone) {
    // Check if chrome.runtime is available (only in extension context)
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn(
        'Chrome extension APIs not available. This service should run within a Chrome extension context.'
      );
    }
  }

  /**
   * Updates a specific key in the local storage of a given Chrome tab.
   *
   * @param tabId The ID of the target Chrome tab.
   * @param key The key of the local storage item to update.
   * @param value The value to set for the local storage item.
   * @returns An Observable that emits true on success, or an error on failure.
   */
  updateTabLocalStorage(
    tabId: number,
    key: string,
    value: string
  ): Observable<boolean> {
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      return new Observable((observer) => {
        observer.error(
          new Error(
            'Chrome extension APIs not available. Cannot update local storage.'
          )
        );
        observer.complete();
      });
    }

    const message = {
      action: 'updateLocalStorage',
      payload: { tabId, key, value },
    };

    // Use NgZone to ensure that the Observable's completion/error
    // runs within Angular's change detection zone.
    return new Observable<boolean>((observer) => {
      this.ngZone.run(() => {
        from(chrome.runtime.sendMessage(message))
          .pipe(
            map((response) => {
              if (response && response.success) {
                console.log(
                  'Local storage update successful:',
                  response.message
                );
                return true;
              } else {
                const errorMessage =
                  response?.error || 'Unknown error updating local storage.';
                console.error('Local storage update failed:', errorMessage);
                throw new Error(errorMessage);
              }
            }),
            catchError((error) => {
              const errorMessage =
                chrome.runtime.lastError?.message ||
                error.message ||
                'Error sending message to background.';
              console.error('Error in sendMessage Observable:', errorMessage);
              throw new Error(errorMessage);
            })
          )
          .subscribe({
            next: (success) => observer.next(success),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
      });
    });
  }
}
