import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardMetrics, ServiceDistribution, PerformanceTrend, Transaction, DailySummary, TransactionType } from 'src/models';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from "@ionic/angular/standalone";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, IonContent, IonIcon,
    //  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton
    ]
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

  async calculateDashboardMetrics() {
    try {
      this.isLoading = true;

      // Get data for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

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

      // Calculate all metrics
      this.calculatePerformanceTrend(summaries);
      this.calculateServiceDistribution(transactions, services);
      this.calculateAdditionalMetrics(transactions, summaries);

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
  const sales = transactions.filter(t => t.type === TransactionType.SALE);
  const serviceStats: { [key: string]: { revenue: number, count: number } } = {};
  
  // Initialize with all active services
  services.filter(s => s.isActive).forEach(service => {
    serviceStats[service.name] = { revenue: 0, count: 0 };
  });

  // Add "Other" category for sales without service or with unknown services
  serviceStats['Other'] = { revenue: 0, count: 0 };

  // Aggregate sales data
  sales.forEach(sale => {
    const serviceName = sale.service || 'Other';
    
    if (!serviceStats[serviceName]) {
      serviceStats[serviceName] = { revenue: 0, count: 0 };
    }
    
    serviceStats[serviceName].revenue += sale.amount;
    serviceStats[serviceName].count++;
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
  
  // Convert to ServiceDistribution array
  this.dashboardData.serviceDistribution = Object.entries(serviceStats)
    .filter(([_, stats]) => stats.count > 0)
    .map(([service, stats]) => ({
      service,
      percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      averageRevenue: stats.count > 0 ? stats.revenue / stats.count : 0,
      transactionCount: stats.count
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Calculate average service value
  this.dashboardData.averageServiceValue = sales.length > 0 
    ? totalRevenue / sales.length 
    : 0;
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