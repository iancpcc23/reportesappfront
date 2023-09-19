import { AppStateEntity, DataState } from 'src/2.data/entities/app-state.entity';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable, Subject, catchError, map, of, startWith, tap } from 'rxjs';

import { AgenciasService } from 'src/app/services/agencias.service';
import {  ReportService } from 'src/app/services/report.service';
import { CuotasVencidas } from 'src/app/interfaces/cuotas-vencidas.interface';
import { DataTableDirective } from 'angular-datatables';
import { HelpersService } from 'src/app/utils/helpers.service';
import { HttpClient } from '@angular/common/http';
import { IAgencia } from 'src/app/interfaces/agencia.interface';
import { IUsuarioAgencia } from 'src/app/interfaces/usuario-agencia.interface';
import { ResponseEntity } from 'src/2.data/entities/response.entity';
import { Role } from 'src/app/interfaces/role.enum';
import { UsuarioService } from 'src/app/services/usuario.service';

@Component({
  selector: 'app-report-credits',
  templateUrl: './report-credits.component.html',
  styleUrls: ['./report-credits.component.css'],
})
export class ReportCreditsComponent implements OnInit {
  @ViewChild(DataTableDirective, { static: false })
  dtElement: DataTableDirective | undefined;

  // usuarios$: IUsuarioAgencia[] = [];
  readonly DataState = DataState;
  // consultaCuotasVencidas: CuotasVencidas[] = []
  paramsToAPI: any = { fecha: this.utils.obtenerFechaActual(), asesorId: 0, agencia: 0 }
  reportState$: AppStateEntity<CuotasVencidas[]> = {}
  isFirstCallAjax:boolean = true;
  // dtOptions: any = {};
  dtOptions: any = {};
  dtTrigger = new Subject<any>()


  usuarios$!: Observable<ResponseEntity<IUsuarioAgencia[]>>;
  agencias$!: Observable<AppStateEntity<IAgencia[]>>;


  constructor(
    private agenciaService: AgenciasService,
    private usuarioSerice: UsuarioService,
    private creditoService: ReportService,
    private utils: HelpersService,
  ) { }

  ngOnInit(): void {
    this.agencias$ = this.obtenerAgencias$();
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      // serverSide: true,
      data:[],
      responsive:true,
      ajax: ({ }, callback: any) => {
        this.creditoService.getCuotasVencidasByAsesor$(this.paramsToAPI).
          pipe(
            map( response => { return { state: DataState.LOADED, data: response.data }}),
            startWith({ state: DataState.LOADING, data: [] }),
            catchError((error) => {
              return of({ state: DataState.ERROR, error, data:[] });
            })
          ).subscribe(async(resp: AppStateEntity<CuotasVencidas[]>) => {
            this.reportState$ = resp;
              callback({
                recordsTotal: resp.data?.length,
                recordsFiltered: resp.data?.length,
                data: resp.data
              })

          });

        // })
      },
      columns: [
        {
          title: 'Cliente',
          data: 'nombre'
        },
        {
          title: 'Dirección',
          data: 'direccion'
        },
        {
          title: 'Coordenadas',
          data: 'coordenadas'
        },
        {
          title: 'Teléfono',
          data: 'telefono'
        },
        {
          title: 'Saldo',
          data: 'saldo'
        },
        {
          title: 'SaldoVencido',
          data: 'saldosvencido'
        },
        {
          title: 'Diasmoraactual',
          data: 'diasmoraactual'
        },
        {
          title: 'Garantes',
          data: 'garantes'
        },

      ],
      dom: 'Bfrtip',
      buttons: [
        'copy',
        'print',
        'excel',
        'pdf'
      ],

    }

  }


  async reload() {
      let dt  = await this.dtElement?.dtInstance
      dt?.ajax.reload()
  }


  obtenerAgencias$(): Observable<AppStateEntity<IAgencia[]>> {
    return this.agenciaService.getAgenciesByUserLogged$().pipe(
      map((response) => {
        return { state: DataState.LOADED, data: response.data };
      }),
      startWith({ state: DataState.LOADING}),
      catchError((error) => {
        // console.log(Error,error)
        return of({ state: DataState.ERROR, error});
      })
    );
  }


  async onSubmit() {
    this.isFirstCallAjax = false;
    await this.reload();


  }

  obtenerUsuariosPorAgencia(agencia: number): void {
    const rolesId = `${Role.ASESOR_CAPTACIONES, Role.GESTOR_CREDITO}`;
    this.usuarios$ = this.usuarioSerice.getUsersByAgencies$({ agencia, rolesId })
  }


  // ngAfterViewInit(): void {
  //   this.dtTrigger.next(null);
  // }


  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  get isReadyAllParameters (){
    return this.paramsToAPI.asesorId != 0 && this.paramsToAPI.agencia !=0
  }


}
