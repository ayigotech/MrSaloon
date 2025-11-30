import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from "@ionic/angular/standalone";

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
  imports: [IonContent, IonIcon],
})
export class WelcomeComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    // Initialize AOS animations if needed
  }

  continue() {
    // Navigate to home/dashboard
    this.router.navigate(['/onboarding']);
  }

  logout() {
    // Clear any session data and navigate to PIN login
    this.router.navigate(['/pin-login']);
  }
}