import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyUsageScanComponent } from './monthly-usage-scan.component';

describe('MonthlyUsageScanComponent', () => {
  let component: MonthlyUsageScanComponent;
  let fixture: ComponentFixture<MonthlyUsageScanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyUsageScanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyUsageScanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
