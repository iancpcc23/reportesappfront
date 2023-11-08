import {
  AppStateEntity,
  DataState,
} from 'src/data/entities/app-state.entity';
import { Component, Type, ViewChild } from '@angular/core';
import { Observable, Subject, catchError, map, of, startWith } from 'rxjs';

import { AgenciasService } from 'src/app/services/agencias.service';
import { AlertService } from 'src/app/utils/alert.service';
import { AuthService } from '../../../services/auth.service';
import { DataTableDirective } from 'angular-datatables';
import { HelpersService } from 'src/app/utils/helpers.service';
import { IAgencia } from 'src/app/interfaces/agencia.interface';
import { IUsuarioAgencia } from 'src/app/interfaces/usuario-agencia.interface';
import { MENU_OPTIONS } from 'src/base/config/rutas-app';
import { RPlazoFijo } from 'src/app/interfaces/IReportes/plazo-fijo.interface';
import { ReportService } from 'src/app/services/report.service';
import { ResponseEntity } from 'src/data/entities/response.entity';
import { Role } from 'src/app/interfaces/role.enum';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-plazo-fijo',
  templateUrl: './plazo-fijo.component.html',
  styleUrls: ['./plazo-fijo.component.css'],
})
export class PlazoFijoComponent {
  @ViewChild(DataTableDirective, { static: false })
  dtElement: DataTableDirective | undefined;

  rolesUsuarioLogeado = this.authSrv.roles; //Cargo los roles del usuario
  rolesPaginaPermitidos:Role[] = [Role.ADMINISTRATIVO, Role.ADMIN, Role.ASISTENTE_TECNOLOGIA];

  // usuarios$: IUsuarioAgencia[] = [];
  readonly DataState = DataState;
  // consultaCuotasVencidas: CuotasVencidas[] = []
  paramsToAPI: any = {
    codigoAgencias: '0',
    codigoAsesores: '0',
    diaFin: 7,
    diaInicio: 0,
  };

  reportState$: AppStateEntity<RPlazoFijo[]> = {};
  isFirstCallAjax: boolean = true;
  dtOptions: any = {};
  dtTrigger = new Subject<any>();

  usuarios$!: Observable<ResponseEntity<IUsuarioAgencia[]>>;
  agencias$!: Observable<AppStateEntity<IAgencia[]>>;

  constructor(
    private agenciaService: AgenciasService,
    private usuarioService: UsuarioService,
    private reportSrv: ReportService,
    private alertSrv:AlertService,
    private authSrv:AuthService
  ) {}

  ngOnInit(): void {
    console.log({roles:this.rolesUsuarioLogeado,vista: this.rolesPaginaPermitidos})

    let permiteDescargarReporte =  this.rolesUsuarioLogeado.some(val=> this.rolesPaginaPermitidos.includes(val))

    console.log("Permite", permiteDescargarReporte)

    this.agencias$ = this.obtenerAgencias$();
    this.dtOptions = {
      pagingType: 'full_numbers',
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
    },
      pageLength: 10,
      processing: true,
      order: [[ 8, 'asc' ]],
      // serverSide: true,
      responsive: true,
      ajax: ({}, callback: any) => {
        this.reportSrv
          .obtenerPlazoFijoPorAsesor$(this.paramsToAPI)
          .pipe(
            map((response) => {
              return { state: DataState.LOADED, data: response.data };
            }),
            startWith({ state: DataState.LOADING, data: [] }),
            catchError((error) => {
              if (!this.isFirstCallAjax){ //Hago esta condicion para que no aparezca el error apenas se carga la página

                this.alertSrv.showAlertError(error.message)
              }
              return of({ state: DataState.ERROR, error })})
          )
          .subscribe(async (resp: AppStateEntity<RPlazoFijo[]>) => {
            this.reportState$ = resp;
            callback({
              recordsTotal: resp.data?.length,
              recordsFiltered: resp.data?.length,
              data: resp.data,
            });
          });


      },
      columns: [
        {
          title: 'Cliente',
          data: 'cliente',
        },
        {
          title: 'Nombre',
          data: 'persona',
        },
        {
          title: 'Dirección',
          data: 'direccion',
          width:'40%'
        },
        {
          title: 'Coordenadas',
          data: 'coordenadas',
          render: function (data: any, type: any, row: any, meta: any) {
            data =
              '<a class="underline" target="_blank" href="https://maps.google.com/?q=' +
              data +
              '">' +
              data +
              '</a>';
            return data;
          },
        },
        {
          title: 'Teléfono',
          data: 'telefonos',
        },

        {
          title: 'Monto',
          data: 'monto',
        },
        {
          title: 'Plazo',
          data: 'plazo',
        },
        {
          title: 'Tasa',
          data: 'tasa',
        },
        {
          title: 'Fecha Vencimiento',
          data: 'fechavencimiento',
        },
        {
          title: 'Vence en(Días)',
          data: 'diasfaltantes',
        },
        {
          title: 'Asesor',
          data: 'nombre',
        },
        {
          title: 'Agencia',
          data: 'agencia',
        },
      ],
      dom: 'Bfrtip',
      buttons: [
       permiteDescargarReporte
        ?
        ['copy', 'csv',  'excel', 'pdf', 'print']:[]
    ]
    };
  }

  async reload() {
    let dt = await this.dtElement?.dtInstance;
    dt?.ajax.reload();

this.dtOptions ={
ajax: ({}, callback: any) => {
  this.reportSrv
    .obtenerPlazoFijoPorAsesor$(this.paramsToAPI)
    .pipe(
      map((response) => {
        return { state: DataState.LOADED, data: response.data };
      }),
      startWith({ state: DataState.LOADING, data: [] }),
      catchError((error) => of({ state: DataState.ERROR, error }))
    )
    .subscribe(async (resp: AppStateEntity<RPlazoFijo[]>) => {
      this.reportState$ = resp;
      callback({
        recordsTotal: resp.data?.length,
        recordsFiltered: resp.data?.length,
        data: resp.data,
      });
    });
  }
}





  }

  obtenerAgencias$(): Observable<AppStateEntity<IAgencia[]>> {
    return this.agenciaService.getAgenciesByUserLogged$().pipe(
      map((response) => {
        if (response.data && response.data.length > 1) {
          let consolidado = response.data.map((ag) => ag.id);
          response.data?.push({
            nombre: 'TODOS',
            id: consolidado.toString(),
          });
        }
        return { state: DataState.LOADED, data: response.data };
      }),
      startWith({ state: DataState.LOADING }),
      catchError((error) => {
        //
        return of({ state: DataState.ERROR, error });
      })
    );
  }

  async onSubmit() {
    this.isFirstCallAjax = false;
    //
    await this.reload();
  }

  obtenerUsuariosPorAgencia(event: any): void {
    let agencia = event.target.value;
    const rolesId = `${
      (Role.ASESOR_CAPTACIONES, Role.GESTOR_CREDITO, Role.ASESOR_NEGOCIOS)
    }`;
    // this.paramsToAPI.codigoAsesores = null;
    this.usuarios$ = this.usuarioService
      .getUsersByAgencies$({
        agencia,
        rolesId,
      })
      .pipe(
        map((response) => {

          response.data?.push({
            nombre: 'TODOS',
            usuario: null,
          });
          return { state: DataState.LOADED, data: response.data };
        }),
        catchError((err) => {
          return of({ state: DataState.ERROR, error: err });
        })
      );
  }

  // ngAfterViewInit(): void {
  //   this.dtTrigger.next(null);
  // }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  get isReadyAllParameters() {
    return (
      this.paramsToAPI.codigoAsesores != 0 &&
      this.paramsToAPI.codigoAgencias != 0
    );
  }
}
