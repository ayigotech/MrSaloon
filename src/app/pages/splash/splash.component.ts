import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
  imports: [IonContent],
})
export class SplashComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    // Auto navigate to PIN screen after 3 seconds
    setTimeout(() => {
      this.router.navigate(['/pin-login']);
    }, 3000);
  }
}