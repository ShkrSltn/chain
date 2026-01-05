import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/chain-list/chain-list.component').then(m => m.ChainListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./components/chain-create/chain-create.component').then(m => m.ChainCreateComponent)
  },
  {
    path: 'chain/:id',
    loadComponent: () => import('./components/chain-detail/chain-detail.component').then(m => m.ChainDetailComponent)
  }
];
