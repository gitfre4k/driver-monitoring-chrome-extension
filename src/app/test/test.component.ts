import { Component, inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { concatMap, from, map, mergeMap, tap } from 'rxjs';
import { ITenant } from '../interfaces';

@Component({
  selector: 'app-test',
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss',
})
export class TestComponent {
  private apiService: ApiService = inject(ApiService);

  companies = this.apiService.getAccessibleTenants();

  getLogs() {
    let currentCompany: ITenant;

    // get All Drivers
    const getAllDrivers = this.apiService
      .getAccessibleTenants()
      .pipe(mergeMap((tenant) => from(tenant)))
      .pipe(
        concatMap((tenant) => {
          currentCompany = tenant;
          console.log(currentCompany.name);
          return this.apiService.getLogs(tenant).pipe(
            mergeMap((log) => from(log.items)),
            tap((drivers) =>
              console.log(
                'Company: ',
                currentCompany.name,
                'Active Drivers: ',
                drivers
              )
            ),
            concatMap((driver) =>
              this.apiService
                .getDriverDailyLogEvents(
                  driver.id,
                  new Date('2025-05-19T05:00:00.000Z'),
                  currentCompany.id
                )

                .pipe(tap((x) => console.log(x)))
            )
          );
        })
      )
      .subscribe();
  }
}
