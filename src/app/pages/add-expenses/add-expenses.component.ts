import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { TransactionType, Expense } from 'src/models';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add-expenses',
  templateUrl: './add-expenses.component.html',
  styleUrls: ['./add-expenses.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
  ],
  providers: [ModalController]
})
export class AddExpensesComponent implements OnInit {
  expenseData = {
    amount: null as number | null,
    datetime: new Date(),
    category: '',
    vendor: '',
    description: '',
    paymentMethod: 'cash' as 'cash' | 'mobile money' | 'bank transfer' | 'credit card' | 'other'
  };

  quickAmounts = [5, 10, 20, 50, 100, 200, 500];
  showAmountError = false;
  showCategoryModal = false;
  isSaving = false;
  isLoading = false;

  categories = [
    'Supplies',
    'Transportation',
    'Utilities',
    'Rent',
    'Staff',
    'Marketing',
    'Maintenance',
    'Food & Drinks',
    'Other'
  ];

  paymentMethods: ('cash' | 'mobile money' | 'bank transfer' | 'credit card' | 'other')[] = [
    'cash',
    'mobile money',
    'bank transfer',
    'credit card',
    'other'
  ];

  recentExpenses: any[] = [];

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private notificationService: NotificationService,
    private storageService: StorageService
  ) {}

  async ngOnInit() {
    await this.loadRecentExpenses();
  }

  // Load recent expenses from storage
  private async loadRecentExpenses() {
    try {
      this.isLoading = true;
      const transactions = await this.storageService.getTransactions();
      
      // Filter expenses only and take last 5
      this.recentExpenses = transactions
        .filter(tx => tx.type === TransactionType.EXPENSE)
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
        .slice(0, 5)
        .map(tx => ({
          amount: tx.amount,
          vendor: (tx as any).vendor || '',
          category: (tx as any).category || '',
          datetime: new Date(tx.datetime),
          paymentMethod: (tx as any).paymentMethod || 'cash',
          description: (tx as any).description || '',
          id: tx.id
        }));
    } catch (error) {
      console.error('Error loading recent expenses:', error);
      this.notificationService.error(
        'Failed to load recent expenses',
        'Data Load Error'
      );
      this.recentExpenses = [];
    } finally {
      this.isLoading = false;
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  // Validation
  validateAmount() {
    this.showAmountError = !this.expenseData.amount || this.expenseData.amount <= 0;
    return !this.showAmountError;
  }

  validateForm(): boolean {
    const isAmountValid = this.validateAmount();
    const isCategoryValid = !!this.expenseData.category.trim();
    
    if (!isAmountValid) {
      this.notificationService.warning('Please enter a valid amount', 'Validation Error');
      return false;
    }
    
    if (!isCategoryValid) {
      this.notificationService.warning('Please select a category', 'Validation Error');
      return false;
    }
    
    return true;
  }

  canSave(): boolean {
    return !!(this.expenseData.amount && 
              this.expenseData.amount > 0 && 
              this.expenseData.category.trim() && 
              !this.isSaving);
  }

  // Quick Actions
  setQuickAmount(amount: number) {
    this.expenseData.amount = amount;
    this.validateAmount();
    
    // Auto-focus on vendor field after selecting amount
    setTimeout(() => {
      const vendorInput = document.querySelector('ion-input[placeholder="Vendor/Supplier"]') as any;
      if (vendorInput) {
        vendorInput.setFocus();
      }
    }, 100);
  }

  onDateChange(event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      this.expenseData.datetime = event.value;
    }
  }

  showCategoryPicker() {
    this.showCategoryModal = true;
  }

  selectCategory(category: string) {
    this.expenseData.category = category;
    this.showCategoryModal = false;
    
    // Auto-focus on vendor field after selecting category
    setTimeout(() => {
      const vendorInput = document.querySelector('ion-input[placeholder="Vendor/Supplier"]') as any;
      if (vendorInput) {
        vendorInput.setFocus();
      }
    }, 100);
  }

  // Save Operations
  async saveExpense() {
    if (!this.validateForm() || this.isSaving) {
      return;
    }

    this.isSaving = true;

    try {
      // Prepare expense data for storage - paymentMethod is now type-safe
      const expenseTransaction: Omit<Expense, 'id'> = {
        amount: this.expenseData.amount!,
        datetime: this.expenseData.datetime,
        category: this.expenseData.category.trim(),
        service: this.expenseData.vendor.trim(),
        description: this.expenseData.description.trim(),
        paymentMethod: this.expenseData.paymentMethod, // This is now type-safe
        type: TransactionType.EXPENSE
      };

      // Save to storage
      const transactionId = await this.storageService.addTransaction(expenseTransaction);
      
      // Show success notification
      this.notificationService.success(
        `Expense of ${this.formatCurrency(this.expenseData.amount!)} recorded successfully!`,
        'Expense Saved'
      );

      // Reset form for next entry but keep category for similar expenses
      this.resetForm(true);
      
      // Reload recent expenses to include the new one
      await this.loadRecentExpenses();

      // Haptic feedback for mobile
      this.vibrate();

    } catch (error) {
      console.error('Error saving expense:', error);
      this.notificationService.error(
        'Failed to save expense. Please try again.',
        'Save Error'
      );
    } finally {
      this.isSaving = false;
    }
  }

  quickSave() {
    if (this.canSave()) {
      this.saveExpense();
    }
  }

  resetForm(keepCategory: boolean = false) {
    const currentCategory = keepCategory ? this.expenseData.category : '';
    
    this.expenseData = {
      amount: null,
      datetime: new Date(),
      category: currentCategory,
      vendor: '',
      description: '',
      paymentMethod: 'cash'
    };
    this.showAmountError = false;
  }

  // Recent Expenses
  fillFromRecent(recent: any) {
    this.expenseData.amount = recent.amount;
    this.expenseData.vendor = recent.vendor;
    this.expenseData.category = recent.category;
    this.expenseData.paymentMethod = recent.paymentMethod;
    this.expenseData.description = recent.description;
    this.expenseData.datetime = new Date();
    
    this.validateAmount();
    
    this.notificationService.info('Fields filled from recent expense', 'Quick Fill');
  }

  async deleteRecentExpense(recent: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    try {
      // Note: This would require a deleteTransaction method in StorageService
      // For now, just show a notification
      this.notificationService.warning(
        'Delete functionality requires additional implementation',
        'Feature Note'
      );
      
      // If you implement delete in StorageService:
      // await this.storageService.deleteTransaction(recent.id);
      // await this.loadRecentExpenses();
      
    } catch (error) {
      console.error('Error deleting recent expense:', error);
      this.notificationService.error('Failed to delete expense', 'Delete Error');
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, show actual date
    return date.toLocaleDateString('en-GH', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getPaymentMethodIcon(method: string): string {
    const icons: { [key: string]: string } = {
      'cash': 'cash',
      'mobile money': 'phone-portrait',
      'bank transfer': 'card',
      'credit card': 'card',
      'other': 'ellipsis-horizontal'
    };
    return icons[method] || 'ellipsis-horizontal';
  }

  getPaymentMethodDisplay(method: string): string {
    const displays: { [key: string]: string } = {
      'cash': 'Cash',
      'mobile money': 'Mobile Money',
      'bank transfer': 'Bank Transfer',
      'credit card': 'Credit Card',
      'other': 'Other'
    };
    return displays[method] || method;
  }

  formatCurrency(amount: number): string {
    return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private vibrate() {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      (navigator as any).vibrate(50);
    }
  }

  // Auto-complete suggestions based on recent expenses
  getVendorSuggestions(): string[] {
    const vendors = this.recentExpenses
      .map(expense => expense.vendor)
      .filter(vendor => vendor.trim() !== '')
      .filter((vendor, index, array) => array.indexOf(vendor) === index); // Remove duplicates
    
    return vendors.slice(0, 5); // Return top 5 unique vendors
  }

  // Quick category selection
  selectQuickCategory(category: string) {
    this.expenseData.category = category;
    this.showCategoryModal = false;
  }

  // Check if expense is a duplicate of recent ones
  isDuplicateExpense(): boolean {
    if (!this.expenseData.amount || !this.expenseData.category) {
      return false;
    }

    return this.recentExpenses.some(expense => 
      expense.amount === this.expenseData.amount &&
      expense.category === this.expenseData.category &&
      expense.vendor === this.expenseData.vendor
    );
  }

  // Type-safe payment method setter
  setPaymentMethod(method: 'cash' | 'mobile money' | 'bank transfer' | 'credit card' | 'other') {
    this.expenseData.paymentMethod = method;
  }
}