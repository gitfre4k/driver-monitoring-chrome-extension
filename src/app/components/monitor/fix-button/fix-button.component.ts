import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { MonitorService } from "../../../@services/monitor.service";
import { ContextMenuService } from "../../../@services/context-menu.service";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { IEvent } from "../../../interfaces/driver-daily-log-events.interface";

@Component({
  selector: "app-fix-button",
  imports: [MatProgressSpinnerModule, MatIconModule],
  templateUrl: "./fix-button.component.html",
  styleUrl: "./fix-button.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FixButtonComponent {
  monitorService = inject(MonitorService);
  contextMenuService = inject(ContextMenuService);

  event = input.required<IEvent>();
  action = input.required<"ADD_PTI" | "EXTEND_PTI">();

  isDisabled = computed(() => {
    if (this.monitorService.isUpdating()) return true;
    if (this.action() === "ADD_PTI")
      return this.monitorService.addPTIBtnDisabled();
    else return this.monitorService.extendPTIBtnDisabled();
  });

  button = computed(() => {
    const action = this.action();
    const icon = action === "ADD_PTI" ? "playlist_add" : "expand_content";
    const name =
      action === "ADD_PTI"
        ? "add Pre-Trip Inspection"
        : "extend Pre-Trip Inspection";
    const iconClass =
      action === "ADD_PTI"
        ? "fix-error__button__icon"
        : "fix-error__button__icon-rotate";

    return { icon, name, iconClass };
  });

  handleAction() {
    const event = this.event();
    const action = this.action();

    this.contextMenuService.handleAction(action, event);
  }
}
