import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { sinSesion, soloRoles } from './core/guardias';
import { ROL_ADMIN, ROL_ANALISTA, ROL_INVERSIONISTA } from './core/modelos';

// Paso A1: cada pantalla dice quién la puede abrir. Las del analista quedan bajo "analista/"
// (así las llaman sus pestañas y ya no chocan con "usuarios" del administrador).
const inversionista = [soloRoles(ROL_INVERSIONISTA, ROL_ADMIN)];
const administrador = [soloRoles(ROL_ADMIN)];
const analista = [soloRoles(ROL_ANALISTA)];

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Sin sesión
  {
    path: 'login',
    canActivate: [sinSesion],
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'registro',
    canActivate: [sinSesion],
    loadChildren: () => import('./pages/registro/registro.module').then((m) => m.RegistroPageModule),
  },
  {
    path: 'recuperar-clave',
    canActivate: [sinSesion],
    loadChildren: () => import('./pages/recuperar-clave/recuperar-clave.module').then((m) => m.RecuperarClavePageModule),
  },
  {
    path: 'verificar',
    canActivate: [sinSesion],
    loadChildren: () => import('./pages/verificar/verificar.module').then((m) => m.VerificarPageModule),
  },
  {
    path: 'nosotros',
    loadChildren: () => import('./pages/nosotros/nosotros.module').then((m) => m.NosotrosPageModule),
  },

  // Inversionista (el administrador también puede verlas).
  // Paso A2: como en la web, se parte en el catálogo (ya no hay pantalla de Inicio)
  { path: 'home', redirectTo: 'catalogo-propiedades', pathMatch: 'full' },
  {
    path: 'catalogo-propiedades',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/catalogo-propiedades/catalogo-propiedades.module').then((m) => m.CatalogoPropiedadesPageModule),
  },
  {
    path: 'detalle-propiedad',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/detalle-propiedad/detalle-propiedad.module').then((m) => m.DetallePropiedadPageModule),
  },
  {
    path: 'detalle-propiedad/:id',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/detalle-propiedad/detalle-propiedad.module').then((m) => m.DetallePropiedadPageModule),
  },
  {
    path: 'mapa-propiedades',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/mapa-propiedades/mapa-propiedades.module').then((m) => m.MapaPropiedadesPageModule),
  },
  {
    path: 'propiedades-guardadas',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/propiedades-guardadas/propiedades-guardadas.module').then((m) => m.PropiedadesGuardadasPageModule),
  },
  {
    path: 'alertas',
    canActivate: inversionista,
    loadChildren: () => import('./pages/alertas/alertas.module').then((m) => m.AlertasPageModule),
  },
  {
    path: 'perfil-configuracion',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/perfil-configuracion/perfil-configuracion.module').then((m) => m.PerfilConfiguracionPageModule),
  },
  {
    path: 'cambiar-contrasena',
    canActivate: inversionista,
    loadChildren: () =>
      import('./pages/cambiar-contrasena/cambiar-contrasena.module').then((m) => m.CambiarContrasenaPageModule),
  },
  {
    path: 'contacto',
    canActivate: inversionista,
    loadChildren: () => import('./pages/contacto/contacto.module').then((m) => m.ContactoPageModule),
  },

  // Administrador
  {
    path: 'admin-home',
    canActivate: administrador,
    loadChildren: () => import('./admin/admin-home/admin-home.module').then((m) => m.AdminHomePageModule),
  },
  {
    path: 'publicaciones',
    canActivate: administrador,
    loadChildren: () => import('./admin/publicaciones/publicaciones.module').then((m) => m.PublicacionesPageModule),
  },
  {
    path: 'publicacion-detalle',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/publicacion-detalle/publicacion-detalle.module').then((m) => m.PublicacionDetallePageModule),
  },
  {
    path: 'publicacion-detalle/:id',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/publicacion-detalle/publicacion-detalle.module').then((m) => m.PublicacionDetallePageModule),
  },
  {
    path: 'editar-publicacion',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/editar-publicacion/editar-publicacion.module').then((m) => m.EditarPublicacionPageModule),
  },
  {
    path: 'editar-publicacion/:id',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/editar-publicacion/editar-publicacion.module').then((m) => m.EditarPublicacionPageModule),
  },
  {
    path: 'anuncios',
    canActivate: administrador,
    loadChildren: () => import('./admin/anuncios/anuncios.module').then((m) => m.AnunciosPageModule),
  },
  {
    path: 'nuevo-anuncio',
    canActivate: administrador,
    loadChildren: () => import('./admin/nuevo-anuncio/nuevo-anuncio.module').then((m) => m.NuevoAnuncioPageModule),
  },
  {
    path: 'anuncio-destinatario',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/anuncio-destinatario/anuncio-destinatario.module').then((m) => m.AnuncioDestinatarioPageModule),
  },
  {
    path: 'opiniones',
    canActivate: administrador,
    loadChildren: () => import('./admin/opiniones/opiniones.module').then((m) => m.OpinionesPageModule),
  },
  {
    path: 'responder-opinion',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/responder-opinion/responder-opinion.module').then((m) => m.ResponderOpinionPageModule),
  },
  {
    path: 'responder-opinion/:id',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/responder-opinion/responder-opinion.module').then((m) => m.ResponderOpinionPageModule),
  },
  {
    path: 'usuarios',
    canActivate: administrador,
    loadChildren: () => import('./admin/usuarios/usuarios.module').then((m) => m.UsuariosPageModule),
  },
  {
    path: 'actividad-usuario',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/actividad-usuario/actividad-usuario.module').then((m) => m.ActividadUsuarioPageModule),
  },
  {
    path: 'actividad-usuario/:id',
    canActivate: administrador,
    loadChildren: () =>
      import('./admin/actividad-usuario/actividad-usuario.module').then((m) => m.ActividadUsuarioPageModule),
  },

  // Analista: sus cuatro pantallas
  {
    path: 'analista/resumen',
    canActivate: analista,
    loadChildren: () => import('./analista/resumen/resumen.module').then((m) => m.ResumenPageModule),
  },
  {
    path: 'analista/subastas',
    canActivate: analista,
    loadChildren: () => import('./analista/subasta/subasta.module').then((m) => m.SubastaPageModule),
  },
  {
    path: 'analista/usuarios',
    canActivate: analista,
    loadChildren: () => import('./analista/usuarios/usuarios.module').then((m) => m.UsuariosPageModule),
  },
  {
    path: 'analista/alcance',
    canActivate: analista,
    loadChildren: () => import('./analista/alcance/alcance.module').then((m) => m.AlcancePageModule),
  },

  // Cualquier otra dirección: al inicio
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
