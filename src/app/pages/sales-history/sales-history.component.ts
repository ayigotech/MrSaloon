import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DailySummary, SalesHistoryFilter } from 'src/models';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-sales-history',
  templateUrl: './sales-history.component.html',
  styleUrls: ['./sales-history.component.scss'],
  imports: [CommonModule, FormsModule, IonContent,
    // IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
    IonIcon, IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent]
})



export class SalesHistoryComponent implements OnInit {
  currentFilter: SalesHistoryFilter = 'this-week';
  dailySummaries: DailySummary[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadSalesHistory();
  }


  isRefreshing: boolean = false;
  async refreshPage(event: any) {
    this.isRefreshing = true;
    try {
      await this.loadSalesHistory();
      // this.notificationService.success('Dashboard updated', 'Refresh Complete');
    } catch (error) {
      console.error('Error refreshing data:', error);
      // this.notificationService.error('Failed to refresh data', 'Error');
    } finally {
      event.target.complete();
      this.isRefreshing = false;
    }
  }


  async loadSalesHistory2() {
    try {
      this.isLoading = true;
      
      const dateRange = this.getDateRangeForFilter();
      const summaries = await this.storageService.getDailySummaries(
        dateRange.startDate,
        dateRange.endDate
      );

      this.dailySummaries = summaries.sort((a, b) => 
        new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
      );

    } catch (error) {
      console.error('Error loading sales history:', error);
      this.notificationService.error(
        'Failed to load sales history. Please try again.',
        'Data Load Error'
      );
      this.dailySummaries = [];
    } finally {
      this.isLoading = false;
    }
  }







async loadSalesHistory() {
  try {
    this.isLoading = true;
    
    const dateRange = this.getDateRangeForFilter();
    
    console.log('=== SALES HISTORY DEBUG ===');
    console.log('Current filter:', this.currentFilter);
    console.log('Date range:', dateRange);
    
    // Debug: Try to get ALL summaries first
    const db = await this.storageService['ensureDB']();
    const tx = db.transaction('summaries', 'readonly');
    const store = tx.objectStore('summaries');
    const allRequest = store.getAll();
    
    allRequest.onsuccess = () => {
      console.log('All summaries in database:', allRequest.result);
      console.log('Count:', allRequest.result.length);
    };
    
    // Now get filtered summaries
    const summaries = await this.storageService.getDailySummaries(
      dateRange.startDate,
      dateRange.endDate
    );

    console.log('Filtered summaries:', summaries);
    console.log('Filtered count:', summaries.length);

    this.dailySummaries = summaries.sort((a, b) => 
      new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
    );

    console.log('Sorted daily summaries:', this.dailySummaries);

  } catch (error) {
    console.error('Error loading sales history:', error);
    this.notificationService.error(
      'Failed to load sales history. Please try again.',
      'Data Load Error'
    );
    this.dailySummaries = [];
  } finally {
    this.isLoading = false;
  }
}













  private getDateRangeForFilter(): { startDate: string, endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0]; // Today
    
    let startDate: string;

    switch (this.currentFilter) {
      case 'this-week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate = startOfWeek.toISOString().split('T')[0];
        break;
      
      case 'this-month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfMonth.toISOString().split('T')[0];
        break;
      
      case 'all':
        // For "all time", set start date to a very old date
        startDate = '2020-01-01'; // Or use your app's launch date
        break;
      
      default:
        startDate = now.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }

  async onFilterChange(event: any) {
    this.currentFilter = event.detail.value;
    await this.loadSalesHistory();
  }

  getTotalStats() {
    return this.dailySummaries.reduce((acc, summary) => ({
      totalRevenue: acc.totalRevenue + summary.totalSales,
      totalExpenses: acc.totalExpenses + summary.totalExpenses,
      totalProfit: acc.totalProfit + summary.netProfit,
      totalTransactions: acc.totalTransactions + summary.transactionCount
    }), { 
      totalRevenue: 0, 
      totalExpenses: 0, 
      totalProfit: 0, 
      totalTransactions: 0 
    });
  }

  async exportData() {
    try {
      this.isLoading = true;
      
      const exportData = {
        filter: this.currentFilter,
        dailySummaries: this.dailySummaries,
        totalStats: this.getTotalStats(),
        exportDate: new Date().toISOString(),
        exportType: 'sales_history'
      };

      // Use StorageService's export functionality
      const jsonData = await this.storageService.exportData();
      
      // Create and download the file
      this.downloadJsonFile(jsonData, `sales-history-${new Date().toISOString().split('T')[0]}.json`);
      
      this.notificationService.success(
        'Sales history exported successfully!',
        'Export Complete'
      );

    } catch (error) {
      console.error('Error exporting data:', error);
      this.notificationService.error(
        'Failed to export sales history. Please try again.',
        'Export Error'
      );
    } finally {
      this.isLoading = false;
    }
  }

  private downloadJsonFile(data: string, filename: string) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  formatCurrency(amount: number): string {
    return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GH', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-GH', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-GH', { weekday: 'short' });
  }

  // Calculate growth percentage compared to previous period
  getGrowthPercentage(): number {
    if (this.dailySummaries.length < 2) return 0;

    const currentPeriodRevenue = this.getTotalStats().totalRevenue;
    
    // For a more accurate growth calculation, you might want to compare
    // with the previous period (last week/last month)
    // This is a simplified version
    const averageRevenue = currentPeriodRevenue / this.dailySummaries.length;
    
    // This would ideally compare with previous period data
    return 0; // Implement proper growth calculation based on your needs
  }

  // Get best performing day
  getBestPerformingDay(): DailySummary | null {
    if (this.dailySummaries.length === 0) return null;
    
    return this.dailySummaries.reduce((best, current) => 
      current.totalSales > best.totalSales ? current : best
    );
  }

  // Refresh data
  async refreshData(event: any) {
    try {
      await this.loadSalesHistory();
      event.target.complete();
      this.notificationService.info('Sales history updated', 'Refresh Complete');
    } catch (error) {
      console.error('Error refreshing data:', error);
      event.target.complete();
      this.notificationService.error('Failed to refresh data', 'Refresh Error');
    }
  }

  // Navigate to day details
  viewDayDetails(dateKey: string) {
    // You could implement a detailed view for a specific day
    console.log('View details for:', dateKey);
    // this.router.navigate(['/day-details', dateKey]);
  }
}