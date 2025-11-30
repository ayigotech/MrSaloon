// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadComponent: () => import('./pages/splash/splash.component').then(m => m.SplashComponent)
  },
  {
    path: 'pin-login',
    loadComponent: () => import('./pages/pin-login/pin-login.component').then(m => m.PinLoginComponent)
  },
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent)
  },
    {
        path: 'onboarding',
        loadComponent: () => import('./pages/onboarding/onboarding.component').then(m => m.OnboardingComponent)
      },
      {
        path: 'update-pin',
        loadComponent: () => import('./pages/update-pin/update-pin.component').then(m => m.UpdatePinComponent)
      },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.component').then(m => m.TabsComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then(m => m.HomePage)
      },
      {
        path: 'sales',
        loadComponent: () => import('./pages/add-sales/add-sales.component').then(m => m.AddSalesComponent)
      },
      {
        path: 'expenses',
        loadComponent: () => import('./pages/add-expenses/add-expenses.component').then(m => m.AddExpensesComponent)
      },
        {
        path: 'transaction',
        loadComponent: () => import('./pages/sales-history/sales-history.component').then(m => m.SalesHistoryComponent)
      },
      {
        path: 'services-mgt',
        loadComponent: () => import('./pages/service-mgt/service-mgt.component').then(m => m.ServiceMgtComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // {
      //   path: 'monthly',
      //   loadComponent: () => import('./pages/monthly-report/monthly-report.component').then(m => m.MonthlyReportComponent)
      // },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'splash'
  },
  

];