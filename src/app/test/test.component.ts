import { Component, inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test',
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent {

  private apiService: ApiService = inject(ApiService)

  companies = this.apiService.getAccessibleTenants()

  getLogs() {
    this.apiService.getLogs().subscribe(
      {
        next: (drivers) => {
          console.log(drivers)
        }
      }
    )
  }
}
