import { Component, computed, inject, signal } from '@angular/core';
import { TabChangeMonitoringService } from '../../services/tab-change-monitor.service';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { map, Observable, startWith } from 'rxjs';

import { ICompany } from '../../interfaces';

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
  private tabChangeMonitorService = inject(TabChangeMonitoringService);
  url = this.tabChangeMonitorService.url;
  parts = computed(() => this.url()?.split('/'));
  logs = computed(() => this.parts()?.[3]);
  id = computed(() => this.parts()?.[4]);
  timestamp = computed(() => this.parts()?.[5]);

  myControl = new FormControl<string | ICompany>('');
  options: ICompany[] = [
    { id: '1', name: 'QWE' },
    { id: '2', name: 'aaa' },
    { id: '3', name: 'eee' },
  ];
  filteredOptions!: Observable<ICompany[]>;

  ngOnInit() {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map((value) => {
        const name = typeof value === 'string' ? value : value?.name;
        return name ? this._filter(name as string) : this.options.slice();
      })
    );
  }

  getRoutes = () => {
    const parts = this.url()?.split('/');
    if (!parts) return;

    const logs = parts[3];
    const id = parts[4];
    const timestamp = parts[5];

    return { logs, id, timestamp };
  };

  displayFn(company: ICompany): string {
    return company && company.name ? company.name : '';
  }

  private _filter(name: string): ICompany[] {
    const filterValue = name.toLowerCase();

    return this.options.filter((option) =>
      option.name.toLowerCase().includes(filterValue)
    );
  }
}
