import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ConstantsService {
  httpLimit = signal(2);
  rightSide = signal(true);
  extensionVersion = signal("0.0.4.20");
}
