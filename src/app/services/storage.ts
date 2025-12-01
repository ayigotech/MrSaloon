import { Injectable } from '@angular/core';
import { 
  Transaction, Sale, Expense, DailySummary, 
  UserPreferences, AppSettings, PinSettings, Service,
  TransactionType 
} from 'src/models';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'mySaloonDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  // ==================== DATABASE INITIALIZATION ====================
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // PIN Management
        if (!db.objectStoreNames.contains('pinSettings')) {
          db.createObjectStore('pinSettings', { keyPath: 'id' });
        }

        // Services Store
        if (!db.objectStoreNames.contains('services')) {
          const servicesStore = db.createObjectStore('services', { keyPath: 'id' });
          servicesStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Transactions Store (Sales + Expenses)
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionsStore.createIndex('datetime', 'datetime', { unique: false });
          transactionsStore.createIndex('type', 'type', { unique: false });
          transactionsStore.createIndex('dateKey', 'dateKey', { unique: false });
        }

        // Daily Summaries Store
        if (!db.objectStoreNames.contains('summaries')) {
          db.createObjectStore('summaries', { keyPath: 'dateKey' });
        }

        // User Preferences Store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }

        // App Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return await this.initDB();
  }

  // ==================== SERVICES MANAGEMENT ====================
  async saveService(service: Service): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      
      // Ensure dates are properly handled
      const serviceToSave = {
        ...service,
        createdAt: service.createdAt instanceof Date ? service.createdAt : new Date(service.createdAt),
        updatedAt: new Date()
      };
      
      store.put(serviceToSave);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getServices(): Promise<Service[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readonly');
      const store = tx.objectStore('services');
      const request = store.getAll();

      request.onsuccess = () => {
        const services = request.result.map(service => ({
          ...service,
          createdAt: new Date(service.createdAt),
          updatedAt: new Date(service.updatedAt)
        }));
        // Sort by name
        services.sort((a, b) => a.name.localeCompare(b.name));
        resolve(services);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveServices(): Promise<Service[]> {
    const services = await this.getServices();
    return services.filter(service => service.isActive);
  }

  async deleteService(serviceId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const request = store.delete(serviceId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== PIN MANAGEMENT ====================
  async savePinSettings(pinSettings: PinSettings): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pinSettings', 'readwrite');
      const store = tx.objectStore('pinSettings');
      store.put({ ...pinSettings, id: 'pinSettings' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPinSettings(): Promise<PinSettings | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pinSettings', 'readonly');
      const store = tx.objectStore('pinSettings');
      const request = store.get('pinSettings');

      request.onsuccess = () => {
        if (request.result) {
          const result = request.result;
          resolve({
            ...result,
            createdAt: new Date(result.createdAt),
            lastModified: new Date(result.lastModified),
            lastAttempt: result.lastAttempt ? new Date(result.lastAttempt) : undefined,
            lockUntil: result.lockUntil ? new Date(result.lockUntil) : undefined
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== TRANSACTIONS ====================
  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = this.generateId();
    const dateKey = new Date(tx.datetime).toISOString().split('T')[0];
    
    let stored: Transaction & { dateKey: string };

    if (tx.type === 'sale') {
      stored = {
        ...(tx as Sale),
        id,
        datetime: new Date(tx.datetime),
        dateKey,
        type: TransactionType.SALE
      };
    } else {
      stored = {
        ...(tx as Expense),
        id,
        datetime: new Date(tx.datetime),
        dateKey,
        type: TransactionType.EXPENSE,
        paymentMethod: (tx as Expense).paymentMethod
      };
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['transactions', 'summaries'], 'readwrite');
      const store = transaction.objectStore('transactions');

      const request = store.add(stored);

      // Update daily summary within same transaction
      this._updateSummaryInTx(
        transaction,
        stored.dateKey,
        stored.type as TransactionType,
        stored.amount
      );

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }


  async getTransactions2(date?: string): Promise<Transaction[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('transactions').objectStore('transactions');
      const index = store.index('datetime');
      const request = index.getAll();

      request.onsuccess = () => {
        let result = request.result as Transaction[];
        if (date) {
          result = result.filter(t => {
            const tDate = new Date(t.datetime).toISOString().split('T')[0];
            return tDate === date;
          });
        }
        // Sort newest first
        result.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('transactions').objectStore('transactions');
      const index = store.index('datetime');
      const range = IDBKeyRange.bound(new Date(startDate), new Date(endDate));
      const request = index.getAll(range);

      request.onsuccess = () => {
        const result = request.result as Transaction[];
        // Sort newest first
        result.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }





  async getTransactions(date?: string): Promise<Transaction[]> {
  const db = await this.ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readonly');
    const store = transaction.objectStore('transactions');
    
    console.log('=== DEBUG getTransactions ===');
    console.log('Date filter:', date);
    
    // Try BOTH methods to see what works
    
    // Method 1: Use getAll() on store (not index)
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      console.log('Method 1 (getAll) - Found:', getAllRequest.result.length, 'transactions');
      
      if (getAllRequest.result.length > 0) {
        console.log('Sample from getAll:', getAllRequest.result[0]);
      }
      
      let result = getAllRequest.result as Transaction[];
      
      // Filter by date if provided
      if (date) {
        result = result.filter(t => {
          const tDate = new Date(t.datetime).toISOString().split('T')[0];
          return tDate === date;
        });
      }
      
      // Sort newest first
      result.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
      
      console.log('Method 1 final result:', result.length);
      resolve(result);
    };
    
    getAllRequest.onerror = () => {
      console.error('Method 1 error:', getAllRequest.error);
      
      // Fallback to Method 2
      const index = store.index('datetime');
      console.log('Using datetime index:', index);
      
      const indexRequest = index.getAll();
      
      indexRequest.onsuccess = () => {
        console.log('Method 2 (index) - Found:', indexRequest.result.length, 'transactions');
        resolve(indexRequest.result as Transaction[]);
      };
      
      indexRequest.onerror = () => reject(indexRequest.error);
    };
  });
}




  async getTodayTransactions(): Promise<Transaction[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getTransactions(today);
  }

  // ==================== DAILY SUMMARIES ====================
  async getDailySummary(dateKey: string): Promise<DailySummary> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('summaries').objectStore('summaries');
      const request = store.get(dateKey);

      request.onsuccess = () => {
        resolve(
          request.result || this.createEmptySummary(dateKey)
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDailySummaries(startDate: string, endDate: string): Promise<DailySummary[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('summaries').objectStore('summaries');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = store.getAll(range);

      request.onsuccess = () => {
        const summaries = request.result.map(summary => ({
          ...summary,
          date: new Date(summary.date)
        }));
        // Sort by date descending
        summaries.sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());
        resolve(summaries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private _updateSummaryInTx(
    tx: IDBTransaction,
    dateKey: string,
    type: TransactionType,
    amount: number
  ) {
    const store = tx.objectStore('summaries');
    const req = store.get(dateKey);

    req.onsuccess = () => {
      const summary: DailySummary = req.result || this.createEmptySummary(dateKey);
      if (type === TransactionType.SALE) {
        summary.totalSales += amount;
      } else {
        summary.totalExpenses += amount;
      }

      summary.netProfit = summary.totalSales - summary.totalExpenses;
      summary.transactionCount += 1;

      store.put(summary);
    };
  }

  private createEmptySummary(dateKey: string): DailySummary {
    return {
      date: new Date(dateKey),
      dateKey,
      totalSales: 0,
      totalExpenses: 0,
      netProfit: 0,
      transactionCount: 0
    };
  }

  // ==================== USER PREFERENCES & SETTINGS ====================
  async getUserPreferences(): Promise<UserPreferences> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('preferences').objectStore('preferences');
      const request = store.get('default');

      request.onsuccess = () => {
        resolve(
          request.result || this.getDefaultPreferences()
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('preferences', 'readwrite').objectStore('preferences');
      const req = store.put({ ...prefs, id: 'default' });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAppSettings(): Promise<AppSettings> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('settings').objectStore('settings');
      const request = store.get('appSettings');

      request.onsuccess = () => {
        resolve(
          request.result || this.getDefaultAppSettings()
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('settings', 'readwrite').objectStore('settings');
      const req = store.put({ ...settings, id: 'appSettings' });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      currency: 'GHS',
      businessName: 'My Saloon',
      businessType: 'Barber Shop',
      defaultCategories: ['Haircut', 'Beard Trim', 'Hair Color', 'Styling'],
      notificationEnabled: true
    };
  }

  private getDefaultAppSettings(): AppSettings {
    return {
      version: '1.0.0',
      firstLaunch: true,
      onboardingCompleted: false,
      dataExportFormat: 'json'
    };
  }

  // ==================== BACKUP & RESTORE ====================
  async exportData(): Promise<string> {
    const db = await this.ensureDB();
    const [services, transactions, summaries, prefs, settings] = await Promise.all([
      this._getAll('services'),
      this._getAll('transactions'),
      this._getAll('summaries'),
      this._getAll('preferences'),
      this._getAll('settings')
    ]);

    const backup = {
      services,
      transactions,
      summaries,
      preferences: prefs,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0',
      app: 'SaloonLite'
    };

    return JSON.stringify(backup, null, 2);
  }

  async importData(jsonData: string): Promise<boolean> {
    const db = await this.ensureDB();
    const data = JSON.parse(jsonData);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([
        'services', 'transactions', 'summaries', 'preferences', 'settings'
      ], 'readwrite');

      // Clear existing data
      ['services', 'transactions', 'summaries', 'preferences', 'settings'].forEach(storeName => {
        tx.objectStore(storeName).clear();
      });

      // Import new data
      data.services?.forEach((s: Service) => tx.objectStore('services').add(s));
      data.transactions?.forEach((t: Transaction) => tx.objectStore('transactions').add(t));
      data.summaries?.forEach((s: DailySummary) => tx.objectStore('summaries').add(s));
      data.preferences?.forEach((p: UserPreferences & { id: string }) => tx.objectStore('preferences').add(p));
      data.settings?.forEach((s: AppSettings & { id: string }) => tx.objectStore('settings').add(s));

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  private async _getAll(storeName: string): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction(storeName).objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== UTILITY ====================
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // ==================== CLEANUP ====================
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([
        'services', 'transactions', 'summaries', 'preferences', 'settings'
      ], 'readwrite');

      const stores = [
        'services', 'transactions', 'summaries', 'preferences', 'settings'
      ];

      stores.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}