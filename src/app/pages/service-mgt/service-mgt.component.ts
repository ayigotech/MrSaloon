import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Service } from 'src/models';
import { NotificationService } from 'src/app/services/notification';
import { StorageService } from 'src/app/services/storage';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonItem, IonLabel, IonInput, IonToggle, IonList, IonAlert, IonRefresher, IonRefresherContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-service-mgt',
  templateUrl: './service-mgt.component.html',
  styleUrls: ['./service-mgt.component.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonToggle, IonAlert, IonRefresher, IonRefresherContent]
})
export class ServiceMgtComponent implements OnInit {
  services: Service[] = [];
  newServiceName: string = '';
  newServicePrice: number | null = null;
  editingService: Service | null = null;
  showDeleteAlert = false;
  serviceToDelete: Service | null = null;
  isLoading = false;
  isSaving = false;

  // Default services for barber shop
  defaultServices: Service[] = [
    {
      id: this.generateId(),
      name: 'Children Haircut',
      price: 15,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: this.generateId(),
      name: 'Adult Haircut',
      price: 20,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: this.generateId(),
      name: 'Beard Trim',
      price: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: this.generateId(),
      name: 'Hair Coloring',
      price: 35,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  alertButtons = [
    { 
      text: 'Cancel', 
      role: 'cancel', 
      handler: () => this.cancelDelete() 
    },
    { 
      text: 'Delete', 
      role: 'destructive', 
      handler: () => this.confirmDeleteHandler() 
    }
  ];

  constructor(
    private router: Router,
    private storageService: StorageService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadServices();
  }


   isRefreshing: boolean = false;
  async refreshPage(event: any) {
    this.isRefreshing = true;
    try {
      await this.loadServices();
      // this.notificationService.success('Dashboard updated', 'Refresh Complete');
    } catch (error) {
      console.error('Error refreshing data:', error);
      // this.notificationService.error('Failed to refresh data', 'Error');
    } finally {
      event.target.complete();
      this.isRefreshing = false;
    }
  }



  async loadServices() {
    try {
      this.isLoading = true;
      const storedServices = await this.storageService.getServices();
      
      if (storedServices.length === 0) {
        // Initialize with default services if no services exist
        await this.initializeDefaultServices();
        this.services = [...this.defaultServices];
      } else {
        this.services = storedServices;
      }
      
      this.sortServices();
      
    } catch (error) {
      console.error('Error loading services:', error);
      this.notificationService.error(
        'Failed to load services. Please try again.',
        'Load Error'
      );
      // Fallback to default services
      this.services = [...this.defaultServices];
    } finally {
      this.isLoading = false;
    }
  }

  private async initializeDefaultServices() {
    try {
      for (const service of this.defaultServices) {
        await this.storageService.saveService(service);
      }
      this.notificationService.info('Default services initialized', 'Setup Complete');
    } catch (error) {
      console.error('Error initializing default services:', error);
      throw error;
    }
  }

  async addService() {
    if (!this.newServiceName?.trim() || this.newServicePrice === null || this.newServicePrice < 0) {
      this.notificationService.warning('Please enter a valid service name and price', 'Validation Error');
      return;
    }

    if (this.isSaving) return;

    try {
      this.isSaving = true;

      const service: Service = {
        id: this.generateId(),
        name: this.newServiceName.trim(),
        price: this.newServicePrice,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to storage
      await this.storageService.saveService(service);
      
      // Reload services to get the updated list
      await this.loadServices();
      
      this.resetNewService();
      
      this.notificationService.success(
        `Service "${service.name}" added successfully!`,
        'Service Added'
      );

    } catch (error) {
      console.error('Error adding service:', error);
      this.notificationService.error(
        'Failed to add service. Please try again.',
        'Save Error'
      );
    } finally {
      this.isSaving = false;
    }
  }

  startEdit(service: Service) {
    this.editingService = { ...service };
  }

  async saveEdit() {
    if (!this.editingService) return;

    if (!this.editingService.name?.trim() || this.editingService.price === null || this.editingService.price < 0) {
      this.notificationService.warning('Please enter a valid service name and price', 'Validation Error');
      return;
    }

    if (this.isSaving) return;

    try {
      this.isSaving = true;

      const updatedService: Service = {
        ...this.editingService,
        name: this.editingService.name.trim(),
        updatedAt: new Date()
      };

      // Save to storage
      await this.storageService.saveService(updatedService);
      
      // Reload services to get the updated list
      await this.loadServices();
      
      this.cancelEdit();
      
      this.notificationService.success(
        `Service "${updatedService.name}" updated successfully!`,
        'Service Updated'
      );

    } catch (error) {
      console.error('Error updating service:', error);
      this.notificationService.error(
        'Failed to update service. Please try again.',
        'Update Error'
      );
    } finally {
      this.isSaving = false;
    }
  }

  cancelEdit() {
    this.editingService = null;
  }

  async toggleService(service: Service) {
    try {
      const updatedService: Service = {
        ...service,
        isActive: !service.isActive,
        updatedAt: new Date()
      };

      await this.storageService.saveService(updatedService);
      
      // Update local state
      const index = this.services.findIndex(s => s.id === service.id);
      if (index !== -1) {
        this.services[index] = updatedService;
      }

      const status = updatedService.isActive ? 'enabled' : 'disabled';
      this.notificationService.info(
        `Service "${service.name}" ${status}`,
        'Service Updated'
      );

    } catch (error) {
      console.error('Error toggling service:', error);
      this.notificationService.error(
        'Failed to update service status. Please try again.',
        'Update Error'
      );
      // Revert local state on error
      service.isActive = !service.isActive;
    }
  }

  confirmDelete(service: Service) {
    this.serviceToDelete = service;
    this.showDeleteAlert = true;
  }

  async deleteService() {
    if (!this.serviceToDelete) return;

    try {
      await this.storageService.deleteService(this.serviceToDelete.id);
      
      // Remove from local array
      this.services = this.services.filter(s => s.id !== this.serviceToDelete!.id);
      
      this.notificationService.success(
        `Service "${this.serviceToDelete.name}" deleted successfully!`,
        'Service Deleted'
      );
      
      this.serviceToDelete = null;

    } catch (error) {
      console.error('Error deleting service:', error);
      this.notificationService.error(
        'Failed to delete service. Please try again.',
        'Delete Error'
      );
    }
  }

  resetNewService() {
    this.newServiceName = '';
    this.newServicePrice = null;
  }

  sortServices() {
    this.services.sort((a, b) => a.name.localeCompare(b.name));
  }

  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  getActiveServices(): Service[] {
    return this.services.filter(service => service.isActive);
  }

  getInactiveServices(): Service[] {
    return this.services.filter(service => !service.isActive);
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  formatCurrency(amount: number): string {
    return `GHS ${amount.toFixed(2)}`;
  }

  cancelDelete() {
    this.showDeleteAlert = false;
    this.serviceToDelete = null;
  }

  confirmDeleteHandler() {
    this.deleteService();
    this.showDeleteAlert = false;
  }

  // Quick price buttons for common amounts
  setQuickPrice(price: number) {
    this.newServicePrice = price;
  }

  // Validation for price input
  validatePrice(event: any) {
    const value = event.target.value;
    if (value < 0) {
      this.newServicePrice = 0;
    }
  }

  // Check if service name already exists
  isServiceNameDuplicate(name: string): boolean {
    const trimmedName = name.trim().toLowerCase();
    return this.services.some(service => 
      service.name.toLowerCase() === trimmedName && 
      service.id !== this.editingService?.id
    );
  }
}