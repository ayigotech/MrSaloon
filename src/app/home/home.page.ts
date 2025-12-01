import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TodayStat, Transaction, DailySummary, TransactionType } from 'src/models';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class HomePage implements OnInit {
  currentDate: Date = new Date();
  isLoading: boolean = true;
  
  todayStats: TodayStat[] = [
    {
      type: 'revenue',
      icon: 'cash',
      amount: 0,
      label: 'Revenue',
      currency: 'GHS'
    },
    {
      type: 'expenses',
      icon: 'card',
      amount: 0,
      label: 'Expenses',
      currency: 'GHS'
    },
    {
      type: 'profit',
      icon: 'trending-up',
      amount: 0,
      label: 'Profit',
      currency: 'GHS'
    },
    {
      type: 'customers',
      icon: 'people',
      amount: 0,
      label: 'Transactions',
      currency: ''
    }
  ];

  todayTransactions: Transaction[] = [];
  isRefreshing: boolean = false;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private notificationService: NotificationService
  ) { }

  formatDateTime(): string {
    const now = new Date();
    const date = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const time = now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' });

    return `${date} ${time}`;
  }

  async ngOnInit() {
    await this.loadTodayData();
  }


  async refreshPage(event: any) {
    this.isRefreshing = true;
    try {
      await this.loadTodayData();
      // this.notificationService.success('Dashboard updated', 'Refresh Complete');
    } catch (error) {
      console.error('Error refreshing data:', error);
      // this.notificationService.error('Failed to refresh data', 'Error');
    } finally {
      event.target.complete();
      this.isRefreshing = false;
    }
  }


  async loadTodayData() {
    try {
      this.isLoading = true;
      
      // Get today's date key for filtering
      const todayKey = new Date().toISOString().split('T')[0];
      
      // Load today's transactions and summary in parallel
      const [transactions, dailySummary] = await Promise.all([
        this.storageService.getTodayTransactions(),
        this.storageService.getDailySummary(todayKey)
      ]);

      console.log(transactions)

      // Update transactions
      this.todayTransactions = transactions;

      // Update today's stats from the daily summary
      this.updateTodayStats(dailySummary, transactions.length);

      this.notificationService.success('Data loaded successfully', 'Dashboard Updated');

    } catch (error) {
      console.error('Error loading today data:', error);
      this.notificationService.error(
        'Failed to load dashboard data. Please try again.',
        'Data Load Error'
      );
    } finally {
      this.isLoading = false;
    }
  }

  private updateTodayStats(summary: DailySummary, transactionCount: number) {
    this.todayStats = this.todayStats.map(stat => {
      switch (stat.type) {
        case 'revenue':
          return { ...stat, amount: summary.totalSales };
        case 'expenses':
          return { ...stat, amount: summary.totalExpenses };
        case 'profit':
          return { ...stat, amount: summary.netProfit };
        case 'customers':
          return { ...stat, amount: transactionCount };
        default:
          return stat;
      }
    });
  }

  async refreshData(event: any) {
    try {
      await this.loadTodayData();
      event.target.complete();
      this.notificationService.info('Data refreshed', 'Dashboard');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.notificationService.error('Failed to refresh data', 'Refresh Error');
      event.target.complete();
    }
  }

  // Quick Actions
  addSale() {
    this.router.navigate(['/tabs/sales']);
  }

  addExpense() {
    this.router.navigate(['/tabs/expenses']);
  }

  goToWelcome() {
    this.router.navigate(['/welcome']);
  }

  // Helper method to format transaction display
  getTransactionDisplay(transaction: Transaction): string {
    if (transaction.type === TransactionType.SALE) {
      return `${transaction.customer} - ${transaction.service}`;
    } else {
      return `${transaction.category} - ${transaction.description}`;
    }
  }

  // Helper method to get transaction icon
  getTransactionIcon(transaction: Transaction): string {
    return transaction.type === TransactionType.SALE ? 'cash' : 'card';
  }

  // Helper method to get transaction color class
  getTransactionColor(transaction: Transaction): string {
    return transaction.type === TransactionType.SALE ? 'success' : 'warning';
  }
}