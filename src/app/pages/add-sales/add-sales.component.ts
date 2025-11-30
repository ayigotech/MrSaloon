import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SaleData, Service, TransactionType } from 'src/models';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { IonButton, IonContent, IonTitle, IonButtons, IonModal, IonHeader, IonToolbar, IonIcon } from "@ionic/angular/standalone";
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input'

@Component({
  selector: 'app-add-sales',
  templateUrl: './add-sales.component.html',
  styleUrls: ['./add-sales.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonContent,
    IonTitle, IonButtons, IonModal, IonHeader, IonToolbar, IonIcon,
     MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
  ],
  providers: [ModalController]
})
export class AddSalesComponent {
  saleData: SaleData = {
    amount: null,
    datetime: new Date(),
    customer: '',
    service: ''
  };

  showServiceModal = false;
  isLoading = false;
  isSaving = false;

  quickAmounts: number[] = [10, 20, 30, 50, 100, 200];
  services: Service[] = [];
  serviceNames: string[] = [];

  constructor(
    private router: Router,
    private modalController: ModalController,
    private storageService: StorageService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadServices();
    await this.loadQuickAmounts();
  }

  async loadServices() {
    try {
      this.isLoading = true;
      this.services = await this.storageService.getActiveServices();
      this.serviceNames = this.services.map(service => service.name);
      
      // Add "Other" option for custom services
      if (!this.serviceNames.includes('Other')) {
        this.serviceNames.push('Other');
      }
    } catch (error) {
      console.error('Error loading services:', error);
      this.notificationService.error(
        'Failed to load services. Please try again.',
        'Services Error'
      );
      // Fallback to default services
      this.serviceNames = [
        'Haircut',
        'Beard Trim', 
        'Hair Color',
        'Shaving',
        'Styling',
        'Treatment',
        'Other'
      ];
    } finally {
      this.isLoading = false;
    }
  }

  async loadQuickAmounts() {
    try {
      // You could load quick amounts from user preferences or app settings
      const preferences = await this.storageService.getUserPreferences();
      // For now, using default quick amounts
      // In future, you could customize this based on user preferences
    } catch (error) {
      console.error('Error loading quick amounts:', error);
      // Continue with default quick amounts
    }
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  canSave(): boolean {
    return this.saleData.amount !== null && 
           this.saleData.amount > 0 && 
           this.saleData.service.trim() !== '' &&
           this.saleData.customer.trim() !== '';
  }

  async saveSale() {
    if (!this.canSave() || this.isSaving) return;
    
    try {
      this.isSaving = true;

      // Prepare the transaction data
      const transactionData = {
        type: TransactionType.SALE,
        amount: this.saleData.amount!,
        datetime: this.saleData.datetime,
        customer: this.saleData.customer.trim(),
        service: this.saleData.service.trim()
      };

      // Save to StorageService
      const transactionId = await this.storageService.addTransaction(transactionData);
      
      this.notificationService.success(
        `Sale of ${this.saleData.amount} GHS recorded successfully!`,
        'Sale Saved'
      );

      // Navigate back to home
      this.router.navigate(['/tabs/home']);

    } catch (error) {
      console.error('Error saving sale:', error);
      this.notificationService.error(
        'Failed to save sale. Please try again.',
        'Save Error'
      );
    } finally {
      this.isSaving = false;
    }
  }

  quickSave() {
    this.saveSale();
  }

  setQuickAmount(amount: number) {
    this.saleData.amount = amount;
    // Auto-focus on customer field after selecting amount for better UX
    setTimeout(() => {
      const customerInput = document.querySelector('ion-input[placeholder="Customer name"]') as any;
      if (customerInput) {
        customerInput.setFocus();
      }
    }, 100);
  }

  openServiceModal() {
    this.showServiceModal = true;
  }

  selectService(service: string) {
    this.saleData.service = service;
    this.showServiceModal = false;
    
    // Auto-focus on amount field if not set, or customer field if amount is set
    setTimeout(() => {
      if (!this.saleData.amount) {
        const amountInput = document.querySelector('ion-input[type="number"]') as any;
        if (amountInput) {
          amountInput.setFocus();
        }
      } else {
        const customerInput = document.querySelector('ion-input[placeholder="Customer name"]') as any;
        if (customerInput) {
          customerInput.setFocus();
        }
      }
    }, 100);
  }

  onDateChange(event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      this.saleData.datetime = event.value;
    }
  }

  onAmountInput(event: any) {
    const value = event.target.value;
    if (value !== '') {
      this.saleData.amount = parseFloat(value);
    } else {
      this.saleData.amount = null;
    }
  }

  // Helper method to format the service display
  getServiceDisplayName(serviceName: string): string {
    const service = this.services.find(s => s.name === serviceName);
    if (service && service.price) {
      return `${service.name} - ${service.price} GHS`;
    }
    return serviceName;
  }

  // Auto-complete suggestions for customer names
  // In a real app, you might want to load this from previous transactions
  getCustomerSuggestions(): string[] {
    // This would typically come from stored transactions
    return ['Regular Customer', 'Walk-in Client', 'John Doe', 'Jane Smith'];
  }

  // Validate amount to prevent negative values
  validateAmount() {
    if (this.saleData.amount && this.saleData.amount < 0) {
      this.saleData.amount = 0;
      this.notificationService.warning('Amount cannot be negative', 'Validation');
    }
  }
}