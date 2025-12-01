import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardMetrics, ServiceDistribution, PerformanceTrend, Transaction, DailySummary, TransactionType } from 'src/models';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent } from "@ionic/angular/standalone";
import { IonicModule } from "@ionic/angular";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, IonContent, IonIcon, IonRefresherContent, IonRefresher]
})


export class DashboardComponent implements OnInit {
  isLoading = true;
  
  dashboardData: DashboardMetrics = {
    weeklyGrowth: 0,
    revenueConsistency: 0,
    bestPerformingDay: 'N/A',
    averageServiceValue: 0,
    serviceDistribution: [],
    peakHours: [],
    dailyTransactionAverage: 0,
    expenseRatio: 0,
    profitMargin: 0,
    monthlyGrowth: 0
  };

  performanceTrend: PerformanceTrend = {
    currentWeekRevenue: 0,
    previousWeekRevenue: 0,
    growthPercentage: 0,
    consistencyScore: 0
  };

  constructor(
    private router: Router,
    private storageService: StorageService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.calculateDashboardMetrics();
  }


   isRefreshing: boolean = false;
  async refreshPage(event: any) {
    this.isRefreshing = true;
    try {
      await this.calculateDashboardMetrics();
      // this.notificationService.success('Dashboard updated', 'Refresh Complete');
    } catch (error) {
      console.error('Error refreshing data:', error);
      // this.notificationService.error('Failed to refresh data', 'Error');
    } finally {
      event.target.complete();
      this.isRefreshing = false;
    }
  }



  async calculateDashboardMetrics() {
  try {
    this.isLoading = true;

    // Get data for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log('=== DASHBOARD CALCULATION START ===');
    console.log('Date range:', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });

    // DEBUG: Try different methods
    console.log('Trying getTransactionsByDateRange...');
    const rangeTransactions = await this.storageService.getTransactionsByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    console.log('Range transactions:', rangeTransactions.length);

    console.log('Trying getTransactions (no filter)...');
    const allTransactions = await this.storageService.getTransactions();
    console.log('All transactions:', allTransactions.length);

    // Filter manually to see if transactions are in range
    const filteredTransactions = allTransactions.filter(t => {
      const txDate = new Date(t.datetime);
      return txDate >= startDate && txDate <= endDate;
    });
    console.log('Manually filtered in range:', filteredTransactions.length);

    // Now get all data
    const [transactions, summaries, services] = await Promise.all([
      this.storageService.getTransactionsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
      this.storageService.getDailySummaries(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
      this.storageService.getServices()
    ]);

    console.log('Final loaded data:', {
      transactions: transactions.length,
      summaries: summaries.length,
      services: services.length
    });

    // If no transactions from range, use manually filtered
    const transactionsToUse = transactions.length > 0 ? transactions : filteredTransactions;
    console.log('Using transactions:', transactionsToUse.length);

    // Calculate all metrics
    this.calculatePerformanceTrend(summaries);
    this.calculateServiceDistribution(transactionsToUse, services);  // ← Use corrected transactions
    this.calculateAdditionalMetrics(transactionsToUse, summaries);

    console.log('=== DASHBOARD CALCULATION COMPLETE ===');

    this.notificationService.success('Dashboard updated with latest data', 'Analytics Ready');

  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    this.notificationService.error(
      'Failed to load dashboard data. Please try again.',
      'Analytics Error'
    );
  } finally {
    this.isLoading = false;
  }
}




  private calculatePerformanceTrend(summaries: DailySummary[]) {
    if (summaries.length === 0) return;

    // Group by week
    const weeklyData = this.groupSummariesByWeek(summaries);
    const weeks = Object.keys(weeklyData).sort();
    
    if (weeks.length >= 2) {
      const currentWeek = weeklyData[weeks[weeks.length - 1]];
      const previousWeek = weeklyData[weeks[weeks.length - 2]];
      
      this.performanceTrend.currentWeekRevenue = currentWeek.totalSales;
      this.performanceTrend.previousWeekRevenue = previousWeek.totalSales;
      this.performanceTrend.growthPercentage = previousWeek.totalSales > 0 
        ? ((currentWeek.totalSales - previousWeek.totalSales) / previousWeek.totalSales) * 100
        : 0;

      this.dashboardData.weeklyGrowth = this.performanceTrend.growthPercentage;
    }

    // Calculate consistency score (percentage of days with sales)
    const daysWithSales = summaries.filter(s => s.totalSales > 0).length;
    this.performanceTrend.consistencyScore = (daysWithSales / summaries.length) * 100;
    this.dashboardData.revenueConsistency = this.performanceTrend.consistencyScore;
  }

  private groupSummariesByWeek(summaries: DailySummary[]): { [key: string]: any } {
    const weeklyData: { [key: string]: any } = {};
    
    summaries.forEach(summary => {
      const week = this.getWeekNumber(summary.date);
      if (!weeklyData[week]) {
        weeklyData[week] = { totalSales: 0, totalExpenses: 0, transactionCount: 0 };
      }
      weeklyData[week].totalSales += summary.totalSales;
      weeklyData[week].totalExpenses += summary.totalExpenses;
      weeklyData[week].transactionCount += summary.transactionCount;
    });
    
    return weeklyData;
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  }

 
  private calculateServiceDistribution(transactions: Transaction[], services: any[]) {

    console.log('=== DEBUGGING SERVICE DISTRIBUTION ===');
  
  // 1. Log all transactions
  console.log('All transactions:', transactions);
  console.log('Transaction count:', transactions.length);


  // 2. Filter sales
  const sales = transactions.filter(t => {
    console.log(`Checking transaction ${t.id}:`, {
      type: t.type,
      isSale: t.type === 'sale',
      isTransactionTypeSALE: t.type === TransactionType.SALE,
      TransactionType_SALE_value: TransactionType.SALE
    });
    return t.type === 'sale';
  });


  console.log('Filtered sales:', sales);
  console.log('Sales count:', sales.length);
  
  // 3. Check what TransactionType.SALE actually is
  console.log('TransactionType.SALE:', TransactionType.SALE);
  console.log('typeof TransactionType.SALE:', typeof TransactionType.SALE);
  
  // 4. Alternative filter
  const sales2 = transactions.filter(t => t.type === 'sale');
  console.log('Alternative filter sales:', sales2);

  // Normalize: lowercase and trim to avoid mismatch
  const normalize = (value: string) => (value || '').trim().toLowerCase();

  const serviceStats: { [key: string]: { label: string, revenue: number, count: number } } = {};

  // Initialize with all active services
  services.filter(s => s.isActive).forEach(service => {
    const key = normalize(service.name);
    serviceStats[key] = { label: service.name, revenue: 0, count: 0 };
  });

  // Add "Other" category
  serviceStats['other'] = { label: 'Other', revenue: 0, count: 0 };

  console.log('Initialized serviceStats:', serviceStats);

  // Aggregate sales data
  sales.forEach(sale => {
    const key = sale.service ? normalize(sale.service) : 'other';

    if (!serviceStats[key]) {
      // Unrecognized service → count as "Other"
      serviceStats['other'].revenue += sale.amount;
      serviceStats['other'].count++;
      return;
    }

    serviceStats[key].revenue += sale.amount;
    serviceStats[key].count++;
  });

  console.log('After processing sales:', serviceStats);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);

  // Convert to ServiceDistribution array
  this.dashboardData.serviceDistribution = Object.values(serviceStats)
    .filter(stats => stats.count > 0)
    .map(stats => ({
      service: stats.label,
      percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      averageRevenue: stats.count > 0 ? stats.revenue : 0, //i switch to use total revene
      transactionCount: stats.count
    }))
    .sort((a, b) => b.percentage - a.percentage);

  console.log('Final distribution:', this.dashboardData.serviceDistribution);

  // Average service value
  this.dashboardData.averageServiceValue =
    sales.length > 0 ? totalRevenue / sales.length : 0;
}



  private calculateAdditionalMetrics(transactions: Transaction[], summaries: DailySummary[]) {
    if (summaries.length === 0) return;

    // Best performing day
    const dayPerformance = this.calculateDayPerformance(summaries);
    this.dashboardData.bestPerformingDay = dayPerformance.bestDay;

    // Peak hours
    this.dashboardData.peakHours = this.calculatePeakHours(transactions);

    // Daily transaction average
    this.dashboardData.dailyTransactionAverage = summaries.reduce((sum, s) => sum + s.transactionCount, 0) / summaries.length;

    // Expense ratio and profit margin
    const totalRevenue = summaries.reduce((sum, s) => sum + s.totalSales, 0);
    const totalExpenses = summaries.reduce((sum, s) => sum + s.totalExpenses, 0);
    
    this.dashboardData.expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    this.dashboardData.profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    // Monthly growth (simplified - compare first and last week)
    this.calculateMonthlyGrowth(summaries);
  }

  private calculateDayPerformance(summaries: DailySummary[]): { bestDay: string, performance: { [key: string]: number } } {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const performance: { [key: string]: number } = {};
    
    days.forEach(day => performance[day] = 0);
    
    summaries.forEach(summary => {
      const dayName = days[summary.date.getDay()];
      performance[dayName] += summary.totalSales;
    });

    const bestDay = Object.entries(performance).reduce((best, [day, revenue]) => 
      revenue > performance[best] ? day : best, days[0]
    );

    return { bestDay, performance };
  }

  private calculatePeakHours(transactions: Transaction[]): string[] {
    const hourCounts: { [key: string]: number } = {};
    
    transactions.forEach(transaction => {
      const hour = new Date(transaction.datetime).getHours();
      const hourRange = this.getHourRange(hour);
      hourCounts[hourRange] = (hourCounts[hourRange] || 0) + 1;
    });

    // Get top 2 peak hours
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([hourRange]) => hourRange);
  }

  private getHourRange(hour: number): string {
    if (hour < 9) return '6-9AM';
    if (hour < 11) return '9-11AM';
    if (hour < 14) return '11AM-2PM';
    if (hour < 16) return '2-4PM';
    if (hour < 18) return '4-6PM';
    return '6PM+';
  }

  private calculateMonthlyGrowth(summaries: DailySummary[]) {
    if (summaries.length < 7) return; // Need at least a week of data
    
    const sortedSummaries = summaries.sort((a, b) => 
      new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime()
    );
    
    const firstWeek = sortedSummaries.slice(0, 7);
    const lastWeek = sortedSummaries.slice(-7);
    
    const firstWeekRevenue = firstWeek.reduce((sum, s) => sum + s.totalSales, 0);
    const lastWeekRevenue = lastWeek.reduce((sum, s) => sum + s.totalSales, 0);
    
    this.dashboardData.monthlyGrowth = firstWeekRevenue > 0 
      ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) * 100 
      : 0;
  }

  async refreshData() {
    await this.calculateDashboardMetrics();
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  formatCurrency(amount: number): string {
    return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getGrowthIcon(growth: number): string {
    return growth > 0 ? 'trending-up' : growth < 0 ? 'trending-down' : 'remove';
  }

  getGrowthColor(growth: number): string {
    return growth > 0 ? 'success' : growth < 0 ? 'danger' : 'medium';
  }

  getConsistencyLevel(score: number): string {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  }

  getConsistencyColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }
}