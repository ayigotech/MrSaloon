
// models.ts

//services prices
export interface Service {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  currency: string;
  businessName?: string;
  businessType?: string;
  defaultCategories: string[];
  notificationEnabled: boolean;
}

export interface AppSettings {
  version: string;
  firstLaunch: boolean;
  onboardingCompleted: boolean;
  lastBackup?: Date;
  dataExportFormat: 'json' | 'csv';
}


export interface Sale {
  id: string;
  amount: number;
  datetime: Date;
  customer?: string;
  category?:string;
  service?: string;
  notes?: string;
  type: 'sale';
}

export interface Expense {
  id: string;
  amount: number;
  datetime: Date;
  service?: string;
  category: string;
  description?: string;
  paymentMethod: 'cash' | 'mobile money' | 'bank transfer' | 'credit card' | 'other';
  type: 'expense';
}

export type Transaction = Sale | Expense;

export interface DailySummary {
  date: Date;
  dateKey: string;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
}

export interface TodayStat {
  type: 'revenue' | 'expenses' | 'profit' | 'customers';
  icon: string;
  amount: number;
  label: string;
  currency: 'GHS'|'';
}


// Enums for better type safety
export enum TransactionType {
  SALE = 'sale',
  EXPENSE = 'expense'
}

//sales data
export interface SaleData {
  amount: number | null;
  datetime: Date;
  customer: string;
  service: string;
  description?: string;
}


export enum PaymentMethod {
  CASH = 'cash',
  MOBILE_MONEY = 'mobile money',
  BANK_TRANSFER = 'bank transfer',
  CREDIT_CARD = 'credit card',
  OTHER = 'other'
}


export enum ExpenseCategory {
  SUPPLIES = 'Supplies',
  TRANSPORTATION = 'Transportation',
  UTILITIES = 'Utilities',
  RENT = 'Rent',
  STAFF = 'Staff',
  MARKETING = 'Marketing',
  MAINTENANCE = 'Maintenance',
  FOOD_DRINKS = 'Food & Drinks',
  OTHER = 'Other'
}



export interface ExpenseFormData {
  amount: number | null;
  datetime: Date;
  category: string;
  vendor: string;
  description: string;
  paymentMethod: PaymentMethod;
}


//sales history
export type SalesHistoryFilter = 'this-week' | 'this-month' | 'all';

export interface SalesHistoryState {
  filter: SalesHistoryFilter;
  dailySummaries: DailySummary[];
  isLoading: boolean;
}


// DashboardMetrics
export interface DashboardMetrics {
  weeklyGrowth: number;
  revenueConsistency: number;
  bestPerformingDay: string;
  averageServiceValue: number;
  serviceDistribution: ServiceDistribution[];
  peakHours: string[];
  dailyTransactionAverage: number;
  expenseRatio: number;
  profitMargin: number;
  monthlyGrowth: number;
}

export interface ServiceDistribution {
  service: string;
  percentage: number;
  averageRevenue: number;
  transactionCount: number;
}

export interface PerformanceTrend {
  currentWeekRevenue: number;
  previousWeekRevenue: number;
  growthPercentage: number;
  consistencyScore: number;
}


// Response types for any future API integration
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


// pin settings

export interface PinSettings {
  pin: string;
  isEnabled: boolean;
  createdAt: Date;
  lastModified: Date;
  failedAttempts: number;
  lastAttempt?: Date;
  isLocked: boolean;
  lockUntil?: Date;
   
}

export interface PinAuthState {
  isAuthenticated: boolean;
  authenticationTime: Date;
  sessionExpiry: Date;
  requiresReauth: boolean;
}

export interface PinSetupData {
  newPin: string;
  confirmPin: string;
  currentPin?: string; // For PIN changes
}

export interface PinValidationResult {
  isValid: boolean;
  isLocked: boolean;
  remainingAttempts: number;
  lockTimeRemaining?: number; // in minutes
}

// PIN security settings
export interface SecuritySettings {
  maxAttempts: number;
  lockoutDuration: number; // in minutes
  sessionTimeout: number; // in minutes
  requirePinOnAppStart: boolean;
  requirePinOnResume: boolean;
  allowBiometric: boolean;
}

// Default security settings
export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  maxAttempts: 5,
  lockoutDuration: 5, // 5 minutes
  sessionTimeout: 30, // 30 minutes
  requirePinOnAppStart: true,
  requirePinOnResume: false,
  allowBiometric: false
};

// PIN validation patterns
export const PIN_PATTERNS = {
  FOUR_DIGIT: /^\d{4}$/,
  SIX_DIGIT: /^\d{6}$/,
  CUSTOM: /^\d+$/ // Any length of digits
} as const;

// PIN-related events
export enum PinEvent {
  SETUP_COMPLETE = 'pin_setup_complete',
  VALIDATION_SUCCESS = 'pin_validation_success',
  VALIDATION_FAILED = 'pin_validation_failed',
  PIN_CHANGED = 'pin_changed',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked'
}

// PIN strength levels
export enum PinStrength {
  WEAK = 'weak',      // Repeated digits, sequential, etc.
  MEDIUM = 'medium',  // Some variation
  STRONG = 'strong'   // Random, no patterns
}

// Utility functions for PIN management
export class PinUtils {
  static validatePin(pin: string): boolean {
    return PIN_PATTERNS.FOUR_DIGIT.test(pin);
  }

  static isDefaultPin(pin: string): boolean {
    return pin === '4321' || pin === '0000' || pin === '1234';
  }

  static assessPinStrength(pin: string): PinStrength {
    // Check for repeated digits (1111, 2222, etc.)
    if (/^(\d)\1{3}$/.test(pin)) return PinStrength.WEAK;
    
    // Check for sequential digits (1234, 4321, etc.)
    const isSequential = 
      '0123456789'.includes(pin) || 
      '9876543210'.includes(pin) ||
      pin === '1357' || pin === '2468' || pin === '3579';
    
    if (isSequential) return PinStrength.WEAK;
    
    // Check for common patterns
    const commonPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (commonPins.includes(pin)) return PinStrength.WEAK;
    
    // Check if all digits are unique
    const uniqueDigits = new Set(pin.split(''));
    if (uniqueDigits.size === 4) return PinStrength.STRONG;
    
    return PinStrength.MEDIUM;
  }

  static generateRandomPin(): string {
    let pin = '';
    do {
      pin = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.isDefaultPin(pin) || this.assessPinStrength(pin) === PinStrength.WEAK);
    
    return pin;
  }

  static maskPin(pin: string): string {
    return '•'.repeat(pin.length);
  }

  static shouldRequireReauth(lastAuthTime: Date, sessionTimeout: number): boolean {
    const now = new Date();
    const timeDiff = (now.getTime() - lastAuthTime.getTime()) / (1000 * 60); // Convert to minutes
    return timeDiff >= sessionTimeout;
  }
}

// PIN storage keys for localStorage
export const PIN_STORAGE_KEYS = {
  USER_PIN: 'user_pin',
  PIN_SETTINGS: 'pin_settings',
  SECURITY_SETTINGS: 'security_settings',
  AUTH_STATE: 'pin_auth_state',
  FAILED_ATTEMPTS: 'pin_failed_attempts',
  LOCKOUT_TIME: 'pin_lockout_time'
} as const;