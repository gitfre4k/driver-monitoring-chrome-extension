import {
  Component,
  computed,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { MonitorService } from '../../ser../../services/monitor.service';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { concatMap, map, Observable, startWith, take } from 'rxjs';

import { ICompany } from '../../interfaces';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-monitor',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    AsyncPipe,
  ],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);
  private apiService = inject(ApiService);

  url = this.monitorService.url;
  tenant = this.monitorService.tenant;

  parts = computed(() => this.url()?.split('/'));
  logs = computed(() => this.parts()?.[3]);
  id = computed(() => this.parts()?.[4]);
  timestamp = computed(() => this.parts()?.[5]);

  myControl = new FormControl<string | ICompany>('');
  companies: ICompany[] = [];
  filteredOptions!: Observable<ICompany[]>;

  ngOnInit() {
    this.filteredOptions = this.apiService.getAccessibleTenants().pipe(
      take(1),
      concatMap((companies) => {
        this.companies = companies;
        return this.myControl.valueChanges.pipe(
          startWith(''),
          map((value) => {
            const name = typeof value === 'string' ? value : value?.name;
            return name ? this._filter(name as string) : this.companies.slice();
          })
        );
      })
    );
  }

  test() {
    console.log(this.url(), this.parts());
  }

  displayFn(company: ICompany): string {
    return company && company.name ? company.name : '';
  }

  private _filter(name: string): ICompany[] {
    const filterValue = name.toLowerCase();

    return this.companies.filter((company) =>
      company.name.toLowerCase().includes(filterValue)
    );
  }
}
