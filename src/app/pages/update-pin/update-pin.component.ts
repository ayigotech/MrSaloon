import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/services/storage';
import { NotificationService } from 'src/app/services/notification';
import { PinSettings } from 'src/models';

@Component({
  selector: 'app-update-pin',
  templateUrl: './update-pin.component.html',
  styleUrls: ['./update-pin.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class UpdatePinComponent implements OnInit {
  currentPin: string = '';
  newPin: string = '';
  confirmPin: string = '';
  
  currentStep: 'current' | 'new' | 'confirm' = 'current';
  showError: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;
  hasExistingPin: boolean = false;
  defaultPin: string = '4321';

  constructor(
    private router: Router,
    private storageService: StorageService,
    private alertCtrl: AlertController,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.checkExistingPin();
  }

  // Check if user has an existing PIN
  async checkExistingPin() {
    try {
      const pinSettings = await this.storageService.getPinSettings();
      this.hasExistingPin = !!pinSettings && pinSettings.isEnabled;
      
      // If no PIN exists, skip current PIN verification
      if (!this.hasExistingPin) {
        this.currentStep = 'new';
        this.notificationService.info(
          'Setting up PIN for the first time. Default PIN is 4321.',
          'PIN Setup'
        );
      }
    } catch (error) {
      console.error('Error checking existing PIN:', error);
      this.hasExistingPin = false;
      this.currentStep = 'new';
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/tabs/settings']);
  }

  // PIN input handling
  addDigit(digit: number) {
    if (this.currentStep === 'current' && this.currentPin.length < 4) {
      this.currentPin += digit.toString();
    } else if (this.currentStep === 'new' && this.newPin.length < 4) {
      this.newPin += digit.toString();
    } else if (this.currentStep === 'confirm' && this.confirmPin.length < 4) {
      this.confirmPin += digit.toString();
    }

    this.showError = false;

    // Auto-advance when PIN is complete
    if (this.currentPin.length === 4 && this.currentStep === 'current') {
      setTimeout(() => this.verifyCurrentPin(), 300);
    } else if (this.newPin.length === 4 && this.currentStep === 'new') {
      setTimeout(() => this.validateNewPin(), 300);
    } else if (this.confirmPin.length === 4 && this.currentStep === 'confirm') {
      setTimeout(() => this.confirmNewPin(), 300);
    }
  }

  removeDigit() {
    if (this.currentStep === 'current' && this.currentPin.length > 0) {
      this.currentPin = this.currentPin.slice(0, -1);
    } else if (this.currentStep === 'new' && this.newPin.length > 0) {
      this.newPin = this.newPin.slice(0, -1);
    } else if (this.currentStep === 'confirm' && this.confirmPin.length > 0) {
      this.confirmPin = this.confirmPin.slice(0, -1);
    }
    this.showError = false;
  }

  // PIN verification and update logic
  async verifyCurrentPin() {
    this.isLoading = true;
    
    try {
      const pinSettings = await this.storageService.getPinSettings();
      const savedPin = pinSettings?.pin || this.defaultPin;
      
      if (this.currentPin === savedPin) {
        this.currentStep = 'new';
        this.showError = false;
        this.notificationService.success('PIN verified successfully', 'Verification Complete');
      } else {
        this.showError = true;
        this.errorMessage = 'Incorrect current PIN';
        this.currentPin = '';
        this.notificationService.error('Incorrect PIN. Please try again.', 'Verification Failed');
      }
    } catch (error) {
      this.showError = true;
      this.errorMessage = 'Error verifying PIN';
      this.currentPin = '';
      this.notificationService.error('Error verifying PIN. Please try again.', 'Verification Error');
    } finally {
      this.isLoading = false;
    }
  }

  validateNewPin() {
    // Basic validation
    if (!this.newPin || this.newPin.length !== 4 || !/^\d+$/.test(this.newPin)) {
      this.showError = true;
      this.errorMessage = 'PIN must be 4 digits';
      this.newPin = '';
      return;
    }

    // Check for weak PIN patterns
    if (this.isWeakPin(this.newPin)) {
      this.showWeakPinAlert();
      return;
    }

    // Check if new PIN is same as current/default PIN
    const currentPinToCheck = this.hasExistingPin ? this.currentPin : this.defaultPin;
    if (this.newPin === currentPinToCheck) {
      this.showError = true;
      this.errorMessage = 'New PIN cannot be same as current PIN';
      this.newPin = '';
      return;
    }

    this.currentStep = 'confirm';
    this.showError = false;
  }

  async confirmNewPin() {
    if (this.newPin !== this.confirmPin) {
      this.showError = true;
      this.errorMessage = 'PINs do not match';
      this.confirmPin = '';
      this.notificationService.warning('PINs do not match. Please try again.', 'Confirmation Failed');
      return;
    }

    await this.updatePin();
  }

  async updatePin() {
    this.isLoading = true;

    try {
      const existingSettings = await this.storageService.getPinSettings();
      
      const updatedSettings: PinSettings = {
        pin: this.newPin,
        isEnabled: true,
        createdAt: existingSettings?.createdAt || new Date(),
        lastModified: new Date(),
        failedAttempts: 0, // Reset failed attempts on PIN change
        isLocked: false,   // Unlock if previously locked
        lastAttempt: new Date()
      };

      await this.storageService.savePinSettings(updatedSettings);
      
      this.notificationService.success('PIN updated successfully!', 'Security Updated');
      
      // Navigate back after a short delay
      setTimeout(() => {
        this.router.navigate(['/tabs/settings']);
      }, 1000);
      
    } catch (error) {
      console.error('Error updating PIN:', error);
      this.showError = true;
      this.errorMessage = 'Failed to update PIN';
      this.notificationService.error('Failed to update PIN. Please try again.', 'Update Error');
    } finally {
      this.isLoading = false;
    }
  }

  // UI helpers
  getCurrentDisplayPin(): string {
    switch (this.currentStep) {
      case 'current': return this.currentPin;
      case 'new': return this.newPin;
      case 'confirm': return this.confirmPin;
      default: return '';
    }
  }

  getPinDots(): boolean[] {
    const pin = this.getCurrentDisplayPin();
    return Array(4).fill(false).map((_, i) => i < pin.length);
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 'current': return 'Enter Current PIN';
      case 'new': return 'Enter New PIN';
      case 'confirm': return 'Confirm New PIN';
      default: return 'Update PIN';
    }
  }

  getStepDescription(): string {
    switch (this.currentStep) {
      case 'current': return 'Verify your identity first';
      case 'new': return 'Choose a secure 4-digit PIN';
      case 'confirm': return 'Re-enter your new PIN';
      default: return '';
    }
  }

  // PIN strength validation
  private isWeakPin(pin: string): boolean {
    // Check for sequential numbers (1234, 4321, etc.)
    const sequentialUp = '0123456789';
    const sequentialDown = '9876543210';
    
    if (sequentialUp.includes(pin) || sequentialDown.includes(pin)) {
      return true;
    }

    // Check for repeated numbers (1111, 2222, etc.)
    if (/^(\d)\1{3}$/.test(pin)) {
      return true;
    }

    // Check for common patterns (1212, 1234, etc.)
    const commonPins = ['1234', '1111', '0000', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    if (commonPins.includes(pin)) {
      return true;
    }

    return false;
  }

  // Alerts
  async showWeakPinAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Weak PIN Detected',
      message: 'This PIN pattern is easy to guess and provides weak security. For better protection, choose a random 4-digit combination.',
      buttons: [
        {
          text: 'Try Again',
          role: 'cancel',
          handler: () => {
            this.newPin = '';
          }
        },
        {
          text: 'Use Anyway',
          handler: () => {
            this.currentStep = 'confirm';
            this.showError = false;
            this.notificationService.warning('Using weak PIN. Consider changing it for better security.', 'Security Warning');
          }
        }
      ]
    });
    
    await alert.present();
  }

  // Reset all fields
  resetAll() {
    this.currentPin = '';
    this.newPin = '';
    this.confirmPin = '';
    this.currentStep = 'current';
    this.showError = false;
    this.errorMessage = '';
  }

  // Check if we can proceed to next step
  canProceed(): boolean {
    const currentPin = this.getCurrentDisplayPin();
    return currentPin.length === 4;
  }

  // Manual step progression
  nextStep() {
    switch (this.currentStep) {
      case 'current':
        if (this.currentPin.length === 4) {
          this.verifyCurrentPin();
        }
        break;
      case 'new':
        if (this.newPin.length === 4) {
          this.validateNewPin();
        }
        break;
      case 'confirm':
        if (this.confirmPin.length === 4) {
          this.confirmNewPin();
        }
        break;
    }
  }
}