import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ConstantsService {
  httpLimit = signal(8);
}
