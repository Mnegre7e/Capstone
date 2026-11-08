import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { fechaConAnio } from '../../core/opiniones';
import { normalizar } from '../../core/remates';
import { SesionService } from '../../core/sesion.service';

// Paso A9: las personas registradas, igual que AdminUsuariosPage de la web (antes eran de ejemplo).
// GET /admin/usuarios: tipo de cuenta, plan Premium, dos pasos y actividad de cada una; y suspender o reactivar
// cuentas (el cambio se ve también en la web: una cuenta suspendida no puede entrar en ninguna de las dos).

interface UsuarioAdmin {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_name: string | null;
  is_active: boolean;
  deleted_at: string | null; // cuándo la eliminó su dueño (null = no la eliminó)
  two_fa_enabled: boolean;
  created_at: string | null;
  vistas: number;
  guardados: number;
  opiniones: number;
  ultima_actividad: string | null;
  premium_until: string | null; // hasta cuándo tiene (o tuvo) Premium; null = nunca lo ha pagado
  pagos: number; // pagos del plan aprobados
}

type Orden = 'recientes' | 'actividad' | 'vistas' | 'nombre';
type Estado = 'activa' | 'suspendida' | 'eliminada';
type Accion = 'suspender' | 'reactivar';
type PlanPersona = 'vigente' | 'vencido' | 'nunca';

interface EstadoCuenta {
  id: string;
  is_active: boolean;
  deleted_at: string | null;
}

const ROLES: { valor: string; nombre: string; plural: string }[] = [
  { valor: 'inversionista', nombre: 'Inversionista', plural: 'Inversionistas' },
  { valor: 'analista', nombre: 'Analista', plural: 'Analistas' },
  { valor: 'administrador', nombre: 'Administrador', plural: 'Administradores' },
];

const PLANES: { valor: PlanPersona; nombre: string }[] = [
  { valor: 'vigente', nombre: 'Premium vigente' },
  { valor: 'vencido', nombre: 'Premium vencido' },
  { valor: 'nunca', nombre: 'Nunca ha pagado' },
];

const POR_TANDA = 20; // cuántas personas se muestran de una vez

function estadoDe(u: UsuarioAdmin): Estado {
  if (u.is_active) return 'activa';
  return u.deleted_at ? 'eliminada' : 'suspendida';
}

function planDe(premiumUntil: string | null): PlanPersona {
  if (!premiumUntil) return 'nunca';
  return new Date(premiumUntil).getTime() > Date.now() ? 'vigente' : 'vencido';
}

function tiempo(fechaIso: string | null): number {
  return fechaIso ? new Date(fechaIso).getTime() : 0;
}

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false,
})
export class UsuariosPage {
  private api = inject(ApiService);
  private sesion = inject(SesionService);
  private ruta = inject(ActivatedRoute);

  readonly ROLES = ROLES;
  readonly PLANES = PLANES;

  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly busqueda = signal('');
  readonly rol = signal(''); // vacío = todos
  readonly orden = signal<Orden>('recientes');
  readonly estado = signal<'' | Estado>(''); // vacío = todas
  readonly plan = signal<'' | PlanPersona>('');
  readonly tanda = signal(POR_TANDA);

  readonly confirmando = signal<{ id: string; accion: Accion } | null>(null);
  readonly trabajando = signal(false);
  readonly resultado = signal<{ id: string; tipo: 'ok' | 'error'; texto: string } | null>(null);

  private filtrados = computed(() => {
    const texto = normalizar(this.busqueda().trim());
    return this.usuarios()
      .filter(
        (u) =>
          (this.rol() === '' || u.role_name === this.rol()) &&
          (this.estado() === '' || estadoDe(u) === this.estado()) &&
          (this.plan() === '' || planDe(u.premium_until) === this.plan()) &&
          (texto === '' || normalizar(u.full_name).includes(texto) || normalizar(u.email).includes(texto)),
      )
      .sort((a, b) => {
        if (this.orden() === 'actividad') return tiempo(b.ultima_actividad) - tiempo(a.ultima_actividad);
        if (this.orden() === 'vistas') return b.vistas - a.vistas;
        if (this.orden() === 'nombre') return a.full_name.localeCompare(b.full_name, 'es');
        return tiempo(b.created_at) - tiempo(a.created_at); // más recientes primero
      });
  });
  readonly cantidadFiltrados = computed(() => this.filtrados().length);

  // Cada persona con lo que se muestra de ella
  readonly visibles = computed(() =>
    this.filtrados()
      .slice(0, this.tanda())
      .map((u) => {
        const estado = estadoDe(u);
        const plan = planDe(u.premium_until);
        const fechas = [
          u.created_at ? `Se registró el ${fechaConAnio(u.created_at)}` : 'Sin fecha de registro',
          u.ultima_actividad ? `Última actividad: ${fechaConAnio(u.ultima_actividad)}` : 'Sin actividad todavía',
          u.deleted_at ? `Eliminó su cuenta el ${fechaConAnio(u.deleted_at)}` : '',
          u.pagos > 0 ? `${u.pagos === 1 ? '1 pago' : `${u.pagos} pagos`} del plan Premium` : '',
        ]
          .filter((texto) => texto !== '')
          .join(' · ');
        return {
          u,
          estado,
          tipo: ROLES.find((r) => r.valor === u.role_name)?.nombre ?? 'Sin tipo',
          premium:
            plan === 'vigente' && u.premium_until
              ? { clase: 'is-premium', texto: `Premium hasta el ${fechaConAnio(u.premium_until)}` }
              : plan === 'vencido' && u.premium_until
                ? { clase: 'is-premium-vencido', texto: `Premium venció el ${fechaConAnio(u.premium_until)}` }
                : null,
          // No se puede suspender a un administrador ni a uno mismo
          puedeSuspender:
            estado === 'activa' && u.role_name !== 'administrador' && u.id !== this.sesion.usuario()?.id,
          fechas,
        };
      }),
  );

  readonly textoCuenta = computed(() =>
    this.cantidadFiltrados() === this.usuarios().length
      ? `Mostrando ${this.visibles().length} de ${this.usuarios().length}`
      : `${this.cantidadFiltrados()} de ${this.usuarios().length} coinciden con los filtros`,
  );

  async ionViewWillEnter() {
    // El Panel puede pedir ver solo a quienes tienen Premium (?plan=vigente)
    const plan = this.ruta.snapshot.queryParamMap.get('plan');
    if (PLANES.some((p) => p.valor === plan)) {
      this.plan.set(plan as PlanPersona);
    }
    try {
      this.usuarios.set(await this.api.get<UsuarioAdmin[]>('/admin/usuarios'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  // Al cambiar un filtro se vuelve a la primera tanda
  buscar(valor: string) {
    this.busqueda.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirRol(valor: string) {
    this.rol.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirEstado(valor: '' | Estado) {
    this.estado.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirPlan(valor: '' | PlanPersona) {
    this.plan.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirOrden(valor: Orden) {
    this.orden.set(valor);
    this.tanda.set(POR_TANDA);
  }

  mostrarMas() {
    this.tanda.set(this.tanda() + POR_TANDA);
  }

  pedirConfirmacion(id: string, accion: Accion) {
    this.resultado.set(null);
    this.confirmando.set({ id, accion });
  }

  textoConfirmacion(u: UsuarioAdmin, accion: Accion): string {
    if (accion === 'suspender') {
      return `¿Suspender la cuenta de ${u.full_name}? No podrá entrar ni recibirá anuncios ni avisos. Sus datos se conservan.`;
    }
    return estadoDe(u) === 'eliminada'
      ? `¿Reactivar la cuenta de ${u.full_name}? Hazlo solo si la persona lo pidió por correo.`
      : `¿Reactivar la cuenta de ${u.full_name}? Podrá volver a entrar.`;
  }

  async hacer(u: UsuarioAdmin, accion: Accion) {
    this.trabajando.set(true);
    this.resultado.set(null);
    try {
      const nuevo = await this.api.post<EstadoCuenta>(`/admin/usuarios/${u.id}/${accion}`);
      this.usuarios.update((todos) =>
        todos.map((x) => (x.id === u.id ? { ...x, is_active: nuevo.is_active, deleted_at: nuevo.deleted_at } : x)),
      );
      this.resultado.set({
        id: u.id,
        tipo: 'ok',
        texto: accion === 'suspender' ? 'Cuenta suspendida.' : 'Cuenta reactivada: ya puede volver a entrar.',
      });
    } catch (error) {
      this.resultado.set({ id: u.id, tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.confirmando.set(null);
      this.trabajando.set(false);
    }
  }
}
