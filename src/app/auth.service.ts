import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'Mentorstreak_auth_token';
  private refreshTokenKey = 'Mentorstreak_refresh_token';
  private uuidKey = 'Mentorstreak_uuid';
  private creatorKey = 'Mentorstreak_creator';
  // Observable login state so components can react
  public loggedIn$ = new BehaviorSubject<boolean>(!!this.getToken());

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  this.loggedIn$.next(true);
  }
  saveRefreshToken(token: string) {
    localStorage.setItem(this.refreshTokenKey, token);
  }
  saveUuid(uuid: string) {
    localStorage.setItem(this.uuidKey, uuid);
  }
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  clear() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.creatorKey);
  this.loggedIn$.next(false);
  }
  saveCreator(data: any) {
    localStorage.setItem(this.creatorKey, JSON.stringify(data));
  }
  getCreator() {
    const v = localStorage.getItem(this.creatorKey);
    return v ? JSON.parse(v) : null;
  }
}
