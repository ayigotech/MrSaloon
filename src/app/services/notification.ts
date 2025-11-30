
import { Injectable } from '@angular/core';
import * as iziToast from 'izitoast'; // Import at top level

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  constructor() {
    // Optional: Configure global iziToast settings
    iziToast.settings({
      timeout: 5000,
      resetOnHover: true,
      icon: 'material-icons',
      transitionIn: 'flipInX',
      transitionOut: 'flipOutX',
      position: 'topRight'
    });
  }

  success(message: string, title: string = 'Success') {
    iziToast.success({
      title,
      message,
      backgroundColor: '#28a755',
      theme: 'dark'
    });
  }

  error(message: string, title: string = 'Error') {
    // console.log('🔔 NotificationService.error called:', { title, message }); // Add this

     // Handle undefined or null messages
      const safeMessage = message || 'An error occurred';
      const safeTitle = title || 'Error';

    iziToast.error({
      title,
      message,
      backgroundColor: '#dc3545',
      theme: 'dark'
    });
  }

  warning(message: string, title: string = 'Warning') {
    iziToast.warning({
      title,
      message,
      backgroundColor: '#ffc107',
      theme: 'dark',
      timeout: 5000
    });
  }

  info(message: string, title: string = 'Info') {
    iziToast.info({
      title,
      message,
      backgroundColor: '#17a2b8',
      theme: 'dark'
    });
  }
}
