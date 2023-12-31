import { CanActivate, Router } from '@angular/router';

import { ACCESS_TOKEN_KEY } from '../../base/config/rutas-app';
import { AuthService } from '../services/auth.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private _authService: AuthService, private _route: Router, private _localStorage: StorageService) { }
  canActivate(): Observable<boolean> | boolean {
    // let existToken = this._localStorage.getData(ACCESS_TOKEN_KEY);
    // //If token is  null redirecto return true to go login
    // if (existToken) {
    //   this._route.navigateByUrl("/home")
    //   return false;
    // }
    // this._authService.isAuthenticated$.emit(false);
    return true;
  }

}
