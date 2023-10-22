import {
  AppStateEntity,
  DataState,
} from 'src/2.data/entities/app-state.entity';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable, Subject, catchError, map, of, startWith, tap } from 'rxjs';

import { AgenciasService } from 'src/app/services/agencias.service';
import { AlertService } from 'src/app/utils/alert.service';
import { CuotasVencidas } from 'src/app/interfaces/IReportes/cuotas-vencidas.interface';
import { DataTableDirective } from 'angular-datatables';
import { HelpersService } from 'src/app/utils/helpers.service';
import { IAgencia } from 'src/app/interfaces/agencia.interface';
import { IUsuarioAgencia } from 'src/app/interfaces/usuario-agencia.interface';
import { ReportService } from 'src/app/services/report.service';
import { ResponseEntity } from 'src/2.data/entities/response.entity';
import { Role } from 'src/app/interfaces/role.enum';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-report-credits',
  templateUrl: './cuotas-vencidas.component.html',
  styleUrls: ['./cuotas-vencidas.component.css'],
})
export class CuotasVencidasComponent implements OnInit {
  @ViewChild(DataTableDirective, { static: false })
  dtElement: DataTableDirective | undefined;

  // usuarios$: IUsuarioAgencia[] = [];
  readonly DataState = DataState;
  // consultaCuotasVencidas: CuotasVencidas[] = []
  paramsToAPI: any = {
    fechaCorte: this.utils.obtenerFechaActual(),
    asesorId: '0',
    agencia: '0',
  };
  reportState$: AppStateEntity<CuotasVencidas[]> = {};
  isFirstCallAjax: boolean = true;
  dtOptions: any = {};
  dtTrigger = new Subject<any>();

  calculosCuotas = {
    cartera: 0,
    colocacion: 0,
    morosidad: 0,
    socios: 0,
    sociosNuevos: 0,
  };

  agenciaNombre = 'NINGUNA';

  usuarios$!: Observable<ResponseEntity<IUsuarioAgencia[]>>;
  agencias$!: Observable<AppStateEntity<IAgencia[]>>;

  constructor(
    private agenciaService: AgenciasService,
    private usuarioSerice: UsuarioService,
    private reportSrv: ReportService,
    private utils: HelpersService,
    private alertSrv: AlertService
  ) {}

  ngOnInit(): void {
    this.agencias$ = this.obtenerAgencias$();
    this.dtOptions = {
      pagingType: 'full_numbers',

      pageLength: 10,
      processing: true,
      bPaginate: false,
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
        searchPanes: {
          count: '{total} found',
          countFiltered: '{shown} / {total}',
        },
      },
      // serverSide: true,
      responsive: true,
      ajax: ({}, callback: any) => {
        this.reportSrv
          .getCuotasVencidasByAsesor$(this.paramsToAPI)
          .pipe(
            tap((response) => {
              if (response.data && response.data.length > 0) {
                let totalSaldo =
                  response.data
                    ?.map((r) => r.saldo)
                    .reduce((a, b) => a + b, 0) ?? 0;
                let totalCartera =
                  response.data
                    ?.map((r) => r.scartera)
                    .reduce((a, b) => a + b, 0) ?? 0;
                this.calculosCuotas = {
                  cartera: response.data[0].scartera ?? 0,
                  colocacion: response.data[0].ncol ?? 0,
                  morosidad: +(totalSaldo / totalCartera).toFixed(2),
                  socios: response.data[0].socios ?? 0,
                  sociosNuevos: response.data![0].sociosnuevos ?? 0,
                };
              }
            }),
            map((response) => {
              return { state: DataState.LOADED, data: response.data };
            }),
            startWith({ state: DataState.LOADING, data: [] }),
            catchError((error) => {
              if (!this.isFirstCallAjax) {
                //Hago esta condicion para que no aparezca el error apenas se carga la página

                this.alertSrv.showAlertError(error.message);
              }

              return of({ state: DataState.ERROR, error, data: [] });
            })
          )
          .subscribe(async (resp: AppStateEntity<CuotasVencidas[]>) => {
            this.reportState$ = resp;
            callback({
              recordsTotal: resp.data?.length,
              recordsFiltered: resp.data?.length,
              data: resp.data,
            });
          });

        // })
      },
      columns: [
        {
          title: 'NumCliente',
          data: 'numero',
        },
        {
          title: 'Cliente',
          data: 'nombre',
        },
        {
          title: 'Dirección',
          data: 'direccion1',
        },
        {
          title: 'Coordenadas',
          data: 'coordenadas',
          render: function (data: any, type: any, row: any, meta: any) {
            data =
              '<a target="_blank" href="https://maps.google.com/?q=' +
              data +
              '">' +
              data +
              '</a>';
            return data;
          },
        },

        {
          title: 'Teléfono',
          data: 'telefono',
        },
        {
          title: 'Saldo',
          data: 'saldo',
        },
        {
          title: 'SaldoVencido',
          data: 'saldosvencido',
          width: '5%',
        },
        {
          title: 'Diasmoraactual',
          data: 'diasmoraactual',
          width: '5%',
        },
        {
          title: 'Provisión',
          data: 'provision',
          width: '5%',
        },
        {
          title: '%Provision',
          data: 'porcentajeprovision',
          width: '5%',
        },
        {
          title: 'Garantes',
          data: 'garantes',
        },
      ],
      dom: 'Bfrtip',
      buttons: [
        { extend: 'copyHtml5', footer: true },
        { extend: 'excelHtml5', footer: true },
        { extend: 'csvHtml5', footer: true },
        { extend: 'pdfHtml5', footer: true },
      ],

      footerCallback: function (
        row: any,
        data: any,
        start: any,
        end: any,
        display: any
      ) {
        let api = this.api();

        // Total over all pages
        let totalSaldos = api
          .column(5)
          .data()
          .reduce((a: number, b: number) => a + b, 0);

        let totalSaldoVencido = api
          .column(6)
          .data()
          .reduce((a: number, b: number) => a + b, 0);

        let totalProvision = api
          .column(8)
          .data()
          .reduce((a: number, b: number) => a + b, 0);

        //Update footer
        api.column(5).footer().innerHTML = totalSaldos.toFixed(2);
        api.column(6).footer().innerHTML = totalSaldoVencido.toFixed(2);
        api.column(8).footer().innerHTML = totalProvision.toFixed(2);
      },
    };
  }

  async reload() {
    let dt = await this.dtElement?.dtInstance;

    dt?.ajax.reload();
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
    await this.reload();
  }

  obtenerUsuariosPorAgencia(event: any): void {
    let agencia = event.target.value;

    console.log(event.target.innerHTML);
    const rolesId = `${(Role.ASESOR_CAPTACIONES, Role.GESTOR_CREDITO)}`;
    this.usuarios$ = this.usuarioSerice
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
    return this.paramsToAPI.asesorId != 0 && this.paramsToAPI.agencia != 0;
  }
}
