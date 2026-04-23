import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { loadRemoteModule } from '@angular-architects/module-federation';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  {
    path: 'admin',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4201/remoteEntry.js',
        exposedModule: './Module',
      })
        .then((m) => m.AdminModule)
        .catch(() => {
          console.error('Admin MF unavailable');
          return import('./home/home.component').then((m) => ({
            default: RouterModule.forChild([{ path: '**', component: m.HomeComponent }]),
          }));
        }),
  },
  {
    path: 'dash',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4202/remoteEntry.js',
        exposedModule: './Module',
      })
        .then((m) => m.DashModule)
        .catch(() => {
          console.error('Dash MF unavailable');
          return import('./home/home.component').then((m) => ({
            default: RouterModule.forChild([{ path: '**', component: m.HomeComponent }]),
          }));
        }),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
