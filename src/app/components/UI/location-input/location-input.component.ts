import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-location-input",
  imports: [FormsModule],
  templateUrl: "./location-input.component.html",
  styleUrl: "./location-input.component.scss",
})
export class LocationInputComponent {
  geolocation = signal("4mi SSE North Little Rock, AR");
  latitude = signal("34.420741456767395");
  longitude = signal("-103.57080647791211");
}
