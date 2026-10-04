import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
{
    path: 'registro',
    loadChildren: () => import('./pages/registro/registro.module').then(m => m.RegistroPageModule)
  },
  {
    path: 'recuperar-clave',
    loadChildren: () => import('./pages/recuperar-clave/recuperar-clave.module').then( m => m.RecuperarClavePageModule)
  },
  {
    path: 'verificar',
    loadChildren: () => import('./pages/verificar/verificar.module').then( m => m.VerificarPageModule)
  },
  {
    path: 'catalogo-propiedades',
    loadChildren: () => import('./pages/catalogo-propiedades/catalogo-propiedades.module').then( m => m.CatalogoPropiedadesPageModule)
  },
  {
    path: 'detalle-propiedad',
    loadChildren: () => import('./pages/detalle-propiedad/detalle-propiedad.module').then( m => m.DetallePropiedadPageModule)
  },
  {
    path: 'mapa-propiedades',
    loadChildren: () => import('./pages/mapa-propiedades/mapa-propiedades.module').then( m => m.MapaPropiedadesPageModule)
  },
 
  {
    path: 'propiedades-guardadas',
    loadChildren: () => import('./pages/propiedades-guardadas/propiedades-guardadas.module').then( m => m.PropiedadesGuardadasPageModule)
  },
  {
    path: 'alertas',
    loadChildren: () => import('./pages/alertas/alertas.module').then( m => m.AlertasPageModule)
  },
  {
    path: 'perfil-configuracion',
    loadChildren: () => import('./pages/perfil-configuracion/perfil-configuracion.module').then( m => m.PerfilConfiguracionPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'nosotros',
    loadChildren: () => import('./pages/nosotros/nosotros.module').then( m => m.NosotrosPageModule)
  },
  {
    path: 'contacto',
    loadChildren: () => import('./pages/contacto/contacto.module').then( m => m.ContactoPageModule)
  },
  {
  path: 'detalle-propiedad/:id', // <-- Debe tener /:id
  loadChildren: () => import('./pages/detalle-propiedad/detalle-propiedad.module').then(m => m.DetallePropiedadPageModule)
  },
  {
    path: 'cambiar-contrasena',
    loadChildren: () => import('./pages/cambiar-contrasena/cambiar-contrasena.module').then( m => m.CambiarContrasenaPageModule)
  },
  {
    path: 'admin-home',
    loadChildren: () => import('./admin/admin-home/admin-home.module').then( m => m.AdminHomePageModule)
  },
  {
    path: 'publicaciones',
    loadChildren: () => import('./admin/publicaciones/publicaciones.module').then( m => m.PublicacionesPageModule)
  },
  {
    path: 'publicacion-detalle',
    loadChildren: () => import('./admin/publicacion-detalle/publicacion-detalle.module').then( m => m.PublicacionDetallePageModule)
  },
  {
    path: 'publicacion-detalle/:id', 
    loadChildren: () => import('./admin/publicacion-detalle/publicacion-detalle.module').then(m => m.PublicacionDetallePageModule)
  },
  {
    path: 'anuncios',
    loadChildren: () => import('./admin/anuncios/anuncios.module').then( m => m.AnunciosPageModule)
  },
  {
    path: 'opiniones',
    loadChildren: () => import('./admin/opiniones/opiniones.module').then( m => m.OpinionesPageModule)
  },
  {
    path: 'editar-publicacion',
    loadChildren: () => import('./admin/editar-publicacion/editar-publicacion.module').then( m => m.EditarPublicacionPageModule)
  },
  {
  path: 'editar-publicacion/:id',
  loadChildren: () => import('./admin/editar-publicacion/editar-publicacion.module').then(m => m.EditarPublicacionPageModule)
  },
  {
    path: 'nuevo-anuncio',
    loadChildren: () => import('./admin/nuevo-anuncio/nuevo-anuncio.module').then( m => m.NuevoAnuncioPageModule)
  },
  {
    path: 'anuncio-destinatario',
    loadChildren: () => import('./admin/anuncio-destinatario/anuncio-destinatario.module').then( m => m.AnuncioDestinatarioPageModule)
  },  {
    path: 'responder-opinion',
    loadChildren: () => import('./admin/responder-opinion/responder-opinion.module').then( m => m.ResponderOpinionPageModule)
  },







];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
