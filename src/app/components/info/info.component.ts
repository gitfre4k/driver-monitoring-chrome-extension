import { Component, inject } from '@angular/core';
import { AppService } from '../../@services/app.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info',
  imports: [CommonModule],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss',
})
export class InfoComponent {
  appService = inject(AppService);

  constructor() {}
}
