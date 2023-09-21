import { AuthService } from './auth.service';
import { GenericCRUDService } from 'src/2.data/helpers/generic-crud.service';
import { IUsuarioAgencia } from '../interfaces/usuario-agencia.interface';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponseEntity } from 'src/2.data/entities/response.entity';
import { StorageService } from './storage.service';
import { USER_LOGGED_KEY } from 'src/base/config/constantes';
import { UserCreatePasswordUseCase } from 'src/1.domain/usecases/Users/user-create-password.usecase';
import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly base_url = `${environment.url_services}/User`;
  constructor(
    private _userCreatePwd: UserCreatePasswordUseCase,
    private _localStorage: StorageService,
    private genericService: GenericCRUDService,
    private _authService:AuthService
  ) { }

  resetPassword$ = (password: string): Observable<boolean> => {
    let userId = this._authService.userLogged ?? this._localStorage.getData(USER_LOGGED_KEY)??'';
    debugger
    return this._userCreatePwd.execute({ userId, password });
  };

  getUsersByAgencies$ = (params: { agencia: number | string , rolesId: string }) => {
    params.agencia = params.agencia.toString()
    return this.genericService.postApiData<IUsuarioAgencia[]>(
    { url: `${this.base_url}/usersByAgency`, body: params  }
  );}




}
