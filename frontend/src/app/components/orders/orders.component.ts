/**
 * @file orders.component.ts
 * @description Liste des commandes de l'utilisateur avec statuts
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersService } from '../../services/orders.service';
import { Order, OrderStatus } from '../../models';

@Component({
  selector: 'app-orders',
  template: `
    <div class="orders-container">
      <h1>Mes commandes</h1>

      <!-- Filtres par statut -->
      <div class="status-filters" role="tablist" aria-label="Filtrer par statut">
        <button
          *ngFor="let filter of statusFilters"
          mat-stroked-button
          [class.active]="selectedStatus === filter.value"
          (click)="filterByStatus(filter.value)"
          role="tab"
          [attr.aria-selected]="selectedStatus === filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-center" role="status">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && orders.length === 0" class="empty-state">
        <mat-icon>receipt_long</mat-icon>
        <h2>Aucune commande trouvée</h2>
        <a mat-raised-button color="primary" routerLink="/products">Commencer mes achats</a>
      </div>

      <!-- Orders list -->
      <div *ngIf="!loading && orders.length > 0" class="orders-list">
        <article
          *ngFor="let order of orders; trackBy: trackByOrderId"
          class="order-card mat-elevation-z2"
          (click)="viewOrder(order.orderId)"
          role="button"
          tabindex="0"
          (keyup.enter)="viewOrder(order.orderId)"
          [attr.aria-label]="'Commande du ' + (order.createdAt | date:'dd/MM/yyyy')"
        >
          <div class="order-header">
            <div class="order-id">
              <mat-icon>receipt</mat-icon>
              <span>Commande #{{ order.orderId.slice(0, 8).toUpperCase() }}</span>
            </div>
            <span class="status-chip" [class]="'status-' + order.status">
              {{ getStatusLabel(order.status) }}
            </span>
          </div>

          <div class="order-body">
            <div class="order-info">
              <span class="order-date">{{ order.createdAt | date:'dd/MM/yyyy à HH:mm' }}</span>
              <span class="order-total">{{ order.total | currency:order.currency }}</span>
            </div>
          </div>

          <div class="order-actions">
            <button mat-button color="primary" (click)="viewOrder(order.orderId); $event.stopPropagation()">
              Voir le détail
            </button>
            <button
              mat-button color="warn"
              *ngIf="order.status === 'pending'"
              (click)="cancelOrder(order.orderId); $event.stopPropagation()"
            >
              Annuler
            </button>
          </div>
        </article>
      </div>
    </div>
  `,
  styles: [`
    .orders-container { max-width: 900px; margin: 0 auto; padding: 16px; }
    .status-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .status-filters button.active { background: #e3f2fd; border-color: #1976d2; color: #1976d2; }
    .order-card { border-radius: 8px; padding: 16px; margin-bottom: 16px; cursor: pointer; transition: transform 0.1s; }
    .order-card:hover { transform: translateX(4px); }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-id { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .status-chip { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; }
    .status-pending { background: #fff3e0; color: #e65100; }
    .status-confirmed { background: #e3f2fd; color: #1565c0; }
    .status-shipped { background: #f3e5f5; color: #6a1b9a; }
    .status-delivered { background: #e8f5e9; color: #2e7d32; }
    .status-canceled { background: #ffebee; color: #c62828; }
    .order-info { display: flex; justify-content: space-between; align-items: center; }
    .order-date { color: #757575; font-size: 14px; }
    .order-total { font-size: 18px; font-weight: 700; color: #1976d2; }
    .order-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .empty-state { text-align: center; padding: 64px 16px; }
    .empty-state mat-icon { font-size: 64px; height: 64px; width: 64px; color: #bdbdbd; display: block; margin: 0 auto 16px; }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
  `],
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  selectedStatus: OrderStatus | '' = '';

  statusFilters = [
    { label: 'Toutes', value: '' as const },
    { label: 'En attente', value: 'pending' as OrderStatus },
    { label: 'Confirmées', value: 'confirmed' as OrderStatus },
    { label: 'Expédiées', value: 'shipped' as OrderStatus },
    { label: 'Livrées', value: 'delivered' as OrderStatus },
    { label: 'Annulées', value: 'canceled' as OrderStatus },
  ];

  constructor(private ordersService: OrdersService, private router: Router) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    const status = this.selectedStatus || undefined;
    this.ordersService.getOrders(status).subscribe({
      next: (res) => { this.orders = res.orders; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  filterByStatus(status: OrderStatus | ''): void {
    this.selectedStatus = status;
    this.loadOrders();
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/orders', orderId]);
  }

  cancelOrder(orderId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
    this.ordersService.cancelOrder(orderId).subscribe({
      next: () => this.loadOrders(),
    });
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      canceled: 'Annulée',
    };
    return labels[status] || status;
  }

  trackByOrderId(index: number, order: Order): string {
    return order.orderId;
  }
}
