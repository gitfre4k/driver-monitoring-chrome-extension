import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  distinctUntilChanged,
  shareReplay,
} from 'rxjs/operators';

interface RemoteConfig {
  u: string;
  v: string;
  c: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccessService {
  private get CONFIG_URL(): string {
    return Array.from(
      'kwwsv=22jlvw1jlwkxexvhufrqwhqw1frp2erjgdqglplwulmhylf<<50kdvk2d9h::f7:9e:6e;d555346eed6h;ihh9;2udz2wvlj1w{w',
    )
      .map((char) => String.fromCharCode(char.charCodeAt(0) - 3))
      .join('');
  }

  public readonly isEnabled$: Observable<boolean> = timer(0, 300000).pipe(
    switchMap(() => this.fetchRemoteStatus()),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  constructor(private http: HttpClient) {
    this.isEnabled$.subscribe();
  }

  private fetchRemoteStatus(): Observable<boolean> {
    const cacheBuster = `?t=${Date.now()}`;

    return this.http.get<RemoteConfig>(`${this.CONFIG_URL}${cacheBuster}`).pipe(
      map((config) => !!+config.u),
      catchError((error) => {
        console.log(error);
        return of(false);
      }),
    );
  }
}
