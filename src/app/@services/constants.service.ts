import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ConstantsService {
  httpLimit = signal(5);
  extensionVersion = signal("0.0.4.20");
}
