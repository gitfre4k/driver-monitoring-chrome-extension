import { Injectable, NgZone } from "@angular/core";
import { Observable, from } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { TFocusElementAction } from "../types";

@Injectable({
  providedIn: "root",
})
export class BackgroundJsService {
  constructor(private ngZone: NgZone) {
    if (typeof chrome === "undefined" || !chrome.runtime) {
      console.warn(
        "Chrome extension APIs not available. This service should run within a Chrome extension context.",
      );
    }
  }

  getAdminProLogsToken(): Observable<string> {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      return new Observable((observer) => {
        observer.error(
          new Error(
            "Chrome extension APIs not available. Cannot retrieve admin token.",
          ),
        );
        observer.complete();
      });
    }

    const message = {
      action: "GET_ADMIN_PROLOGS_TOKEN",
      payload: {}, // Payload is empty since the background script finds the tab
    };

    return new Observable<string>((observer) => {
      this.ngZone.run(() => {
        from(chrome.runtime.sendMessage(message))
          .pipe(
            map(
              (response: {
                success: boolean;
                authToken?: string;
                error?: string;
              }) => {
                if (response && response.success) {
                  // console.log("Admin token retrieval successful.");
                  if (response.authToken) {
                    return response.authToken;
                  } else {
                    throw new Error(
                      "Admin tab found but 'auth-token' was null/undefined.",
                    );
                  }
                } else {
                  const errorMessage =
                    response?.error || "Unknown error retrieving admin token.";
                  console.error("Admin token retrieval failed:", errorMessage);
                  throw new Error(errorMessage);
                }
              },
            ),
            catchError((error) => {
              const errorMessage =
                chrome.runtime.lastError?.message ||
                error.message ||
                "Error sending message to background.";
              console.error(
                "Error in getAdminAuthToken Observable:",
                errorMessage,
              );
              throw new Error(errorMessage);
            }),
          )
          .subscribe({
            next: (token) => {
              const oidcUser = JSON.parse(token);
              observer.next(oidcUser.access_token);
            },
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
      });
    });
  }

  updateTabLocalStorage(
    tabId: number,
    key: string,
    value: string,
  ): Observable<boolean> {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      return new Observable((observer) => {
        observer.error(
          new Error(
            "Chrome extension APIs not available. Cannot update local storage.",
          ),
        );
        observer.complete();
      });
    }

    const message = {
      action: "updateLocalStorage",
      payload: { tabId, key, value },
    };

    return new Observable<boolean>((observer) => {
      this.ngZone.run(() => {
        from(chrome.runtime.sendMessage(message))
          .pipe(
            map((response) => {
              if (response && response.success) {
                console.log(
                  "Local storage update successful:",
                  response.message,
                );
                return true;
              } else {
                const errorMessage =
                  response?.error || "Unknown error updating local storage.";
                console.error("Local storage update failed:", errorMessage);
                throw new Error(errorMessage);
              }
            }),
            catchError((error) => {
              const errorMessage =
                chrome.runtime.lastError?.message ||
                error.message ||
                "Error sending message to background.";
              console.error("Error in sendMessage Observable:", errorMessage);
              throw new Error(errorMessage);
            }),
          )
          .subscribe({
            next: (success) => observer.next(success),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
      });
    });
  }

  focusElement(
    action: TFocusElementAction,
    payload: { tabId: number; elementId: number; statusName?: string },
  ): Observable<boolean> {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      return new Observable((observer) => {
        observer.error(
          new Error(
            "Chrome extension APIs not available. Cannot focus element.",
          ),
        );
        observer.complete();
      });
    }

    const message = {
      action,
      payload,
    };

    return new Observable<boolean>((observer) => {
      this.ngZone.run(() => {
        from(chrome.runtime.sendMessage(message))
          .pipe(
            map((response) => {
              if (response && response.success) {
                // console.log('Element focus successful:', response.message);
                return true;
              } else {
                const errorMessage =
                  response?.error || "Unknown error focusing element.";
                console.error("Element focus failed:", errorMessage);
                throw new Error(errorMessage);
              }
            }),
            catchError((error) => {
              const errorMessage =
                chrome.runtime.lastError?.message ||
                error.message ||
                "Error sending message to background.";
              console.error("Error in sendMessage Observable:", errorMessage);
              throw new Error(errorMessage);
            }),
          )
          .subscribe({
            next: (success) => observer.next(success),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
      });
    });
  }

  refreshWebApp(tabId: number): Observable<boolean> {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      return new Observable((observer) => {
        observer.error(
          new Error(
            "Chrome extension APIs not available. Cannot refresh web app.",
          ),
        );
        observer.complete();
      });
    }

    const message = {
      action: "refresh",
      payload: { tabId },
    };

    return new Observable<boolean>((observer) => {
      this.ngZone.run(() => {
        from(chrome.runtime.sendMessage(message))
          .pipe(
            map((response) => {
              if (response && response.success) {
                console.log("Refreshing web app successful:", response.message);
                return true;
              } else {
                const errorMessage =
                  response?.error || "Unknown error refreshing web app.";
                console.error("Refreshing web app failed:", errorMessage);
                throw new Error(errorMessage);
              }
            }),
            catchError((error) => {
              const errorMessage =
                chrome.runtime.lastError?.message ||
                error.message ||
                "Error sending message to background.";
              console.error("Error in sendMessage Observable:", errorMessage);
              throw new Error(errorMessage);
            }),
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
