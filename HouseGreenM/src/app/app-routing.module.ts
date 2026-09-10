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
    path: 'panel-principal',
    loadChildren: () => import('./pages/pages/panel-principal/panel-principal.module').then( m => m.PanelPrincipalPageModule)
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
    path: 'analisis-semaforo',
    loadChildren: () => import('./pages/analisis-semaforo/analisis-semaforo.module').then( m => m.AnalisisSemaforoPageModule)
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

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
