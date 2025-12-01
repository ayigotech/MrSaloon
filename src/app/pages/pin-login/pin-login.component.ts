import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from "@ionic/angular/standalone";
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { PinSettings } from 'src/models';

@Component({
  selector: 'app-pin-login',
  templateUrl: './pin-login.component.html',
  styleUrls: ['./pin-login.component.scss'],
  imports: [IonContent, IonIcon],
})
export class PinLoginComponent implements OnInit {
  enteredPin: string = '';
  maxLength: number = 4;
  showError: boolean = false;
  errorMessage: string = '';
  isVerifying: boolean = false;
  defaultPin: string = '4321';
  storedPinSettings: PinSettings | null = null;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadPinSettings();
  }

  async loadPinSettings() {
    try {
      this.storedPinSettings = await this.storageService.getPinSettings();
    } catch (error) {
      console.error('Error loading PIN settings:', error);
      this.notificationService.error('Failed to load security settings', 'Login Error');
    }
  }

  addDigit(digit: string) {
    if (this.enteredPin.length < this.maxLength && !this.isVerifying) {
      this.enteredPin += digit;
      this.showError = false;
      
      // Auto-verify when PIN is complete
      if (this.enteredPin.length === this.maxLength) {
        this.verifyPin();
      }
    }
  }

  removeDigit() {
    if (this.enteredPin.length > 0 && !this.isVerifying) {
      this.enteredPin = this.enteredPin.slice(0, -1);
      this.showError = false;
    }
  }

  async verifyPin() {
    if (this.enteredPin.length !== this.maxLength || this.isVerifying) {
      return;
    }

    this.isVerifying = true;

    try {
      // Check if account is locked
      if (this.isAccountLocked()) {
        this.handleLockedAccount();
        return;
      }

      const isValid = await this.validatePin(this.enteredPin);

      if (isValid) {
        await this.handleSuccessfulLogin();
      } else {
        await this.handleFailedAttempt();
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      this.showError = true;
      this.errorMessage = 'Authentication error. Please try again.';
      this.clearPin();
    } finally {
      this.isVerifying = false;
    }
  }

  private async validatePin(enteredPin: string): Promise<boolean> {
    // If no PIN settings exist, use default PIN
    if (!this.storedPinSettings) {
      return enteredPin === this.defaultPin;
    }

    // Compare with stored PIN
    return enteredPin === this.storedPinSettings.pin;
  }

  private isAccountLocked(): boolean {
    if (!this.storedPinSettings?.lockUntil) {
      return false;
    }

    return new Date() < new Date(this.storedPinSettings.lockUntil);
  }


private async handleSuccessfulLogin() {
  // Reset failed attempts and locked status
  if (this.storedPinSettings) {
    const updatedSettings: PinSettings = {
      ...this.storedPinSettings,
      failedAttempts: 0,
      lastAttempt: new Date(),
      lockUntil: undefined,
      isLocked: false
    };
    
    await this.storageService.savePinSettings(updatedSettings);
    this.storedPinSettings = updatedSettings;
  }
  
  // Set authentication state
  const authState = {
    isAuthenticated: true,
    authenticatedAt: new Date(),
    sessionExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  };
  localStorage.setItem('authState', JSON.stringify(authState));
  
  this.notificationService.success('Login successful!', 'Welcome Back');
  
  setTimeout(() => {
    this.router.navigate(['/welcome']);
  }, 500);
}



private async handleFailedAttempt() {
  const failedAttempts = (this.storedPinSettings?.failedAttempts || 0) + 1;
  const maxAttempts = 3;
  const lockoutDuration = 5; // minutes

  const isLocked = failedAttempts >= maxAttempts;

  // Update PIN settings with new failed attempt
  const updatedSettings: PinSettings = {
    pin: this.storedPinSettings?.pin || this.defaultPin,
    isEnabled: true,
    createdAt: this.storedPinSettings?.createdAt || new Date(),
    lastModified: new Date(),
    failedAttempts: failedAttempts,
    lastAttempt: new Date(),
    lockUntil: isLocked ? new Date(Date.now() + lockoutDuration * 60 * 1000) : undefined,
    isLocked: isLocked // Add this required property
  };

  await this.storageService.savePinSettings(updatedSettings);
  this.storedPinSettings = updatedSettings;

  const remainingAttempts = maxAttempts - failedAttempts;

  if (isLocked) {
    this.showError = true;
    this.errorMessage = `Too many failed attempts. Account locked for ${lockoutDuration} minutes.`;
  } else {
    this.showError = true;
    this.errorMessage = `Incorrect PIN. ${remainingAttempts} attempt(s) remaining.`;
  }
  
  this.clearPin();
}

private async resetFailedAttempts() {
  if (this.storedPinSettings) {
    const updatedSettings: PinSettings = {
      ...this.storedPinSettings,
      failedAttempts: 0,
      lastAttempt: new Date(),
      lockUntil: undefined,
      isLocked: false // Reset locked status
    };
    
    await this.storageService.savePinSettings(updatedSettings);
    this.storedPinSettings = updatedSettings;
  }
}


  private handleLockedAccount() {
    if (!this.storedPinSettings?.lockUntil) return;

    const lockUntil = new Date(this.storedPinSettings.lockUntil);
    const minutesLeft = Math.ceil((lockUntil.getTime() - new Date().getTime()) / (1000 * 60));
    
    this.showError = true;
    this.errorMessage = `Account locked. Try again in ${minutesLeft} minute(s).`;
    this.clearPin();
  }

  private clearPin() {
    this.enteredPin = '';
  }

  getPinDots(): boolean[] {
    return Array(this.maxLength).fill(false).map((_, i) => i < this.enteredPin.length);
  }

  goToSplash() {
    this.router.navigate(['/splash']);
  }

  async forgotPin(event: Event) {
    event.preventDefault();
    
    // If no custom PIN is set (using default), show the default PIN
    if (!this.storedPinSettings || this.storedPinSettings.pin === this.defaultPin) {
      this.notificationService.info(
        `Default PIN is: ${this.defaultPin}`,
        'Default PIN'
      );
    } else {
      // For custom PINs, provide recovery option
      this.notificationService.warning(
        'Please use the "Reset PIN" option in settings or contact administrator.',
        'PIN Recovery'
      );
    }
  }

  // Development helper - skip authentication
  async skipAuth() {
    await this.handleSuccessfulLogin();
  }
}