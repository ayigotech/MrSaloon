// settings.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class SettingsComponent {

  settingsActions = [
    {
      title: 'Update PIN',
      description: 'Change your security PIN',
      icon: 'key',
      route: '/update-pin',
      color: 'primary'
    },
    {
      title: 'Backup Data',
      description: 'Export your sales and expense data',
      icon: 'cloud-upload',
      route: '/backup-data',
      color: 'success'
    }
  ];

  constructor(private router: Router) {}

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}