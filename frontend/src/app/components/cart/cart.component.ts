/**
 * @file cart.component.ts
 * @description Composant panier - vue et gestion des items
 */
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { Cart, CartItem } from '../../models';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cart-container" *ngIf="cart$ | async as cart">
      <h1>Mon Panier</h1>

      <!-- Cart empty -->
      <div *ngIf="cart.items.length === 0" class="empty-cart" role="status">
        <mat-icon class="empty-icon">shopping_cart</mat-icon>
        <h2>Votre panier est vide</h2>
        <p>Découvrez nos produits et commencez vos achats</p>
        <a mat-raised-button color="primary" routerLink="/products">
          Voir les produits
        </a>
      </div>

      <!-- Cart with items -->
      <div *ngIf="cart.items.length > 0" class="cart-layout">
        <!-- Items list -->
        <section class="cart-items" aria-label="Articles dans le panier">
          <article
            *ngFor="let item of cart.items; trackBy: trackByProductId"
            class="cart-item mat-elevation-z1"
          >
            <img
              [src]="item.imageUrl || 'assets/no-image.png'"
              [alt]="item.name"
              class="item-image"
              loading="lazy"
            />

            <div class="item-details">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-price">{{ item.price | currency:item.currency }}</p>
            </div>

            <div class="item-quantity">
              <button
                mat-icon-button
                (click)="updateQuantity(item, item.quantity - 1)"
                [disabled]="item.quantity <= 1"
                aria-label="Diminuer la quantité"
              >
                <mat-icon>remove</mat-icon>
              </button>
              <span class="quantity-value">
                {{ item.quantity }}
              </span>
              <button
                mat-icon-button
                (click)="updateQuantity(item, item.quantity + 1)"
                [disabled]="item.quantity >= 99"
                aria-label="Augmenter la quantité"
              >
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <p class="item-total">{{ item.total | currency:item.currency }}</p>

            <button
              mat-icon-button
              color="warn"
              (click)="removeItem(item.productId)"
            >
              <mat-icon>delete_outline</mat-icon>
            </button>
          </article>
        </section>

        <!-- Order summary -->
        <aside class="cart-summary mat-elevation-z2" aria-label="Récapitulatif de commande">
          <h2>Récapitulatif</h2>

          <div class="summary-row">
            <span>Articles ({{ cart.totalItems }})</span>
            <span>{{ cart.totalAmount | currency:cart.currency }}</span>
          </div>
          <div class="summary-row">
            <span>Livraison</span>
            <span class="free-shipping">Gratuite</span>
          </div>
          <mat-divider></mat-divider>
          <div class="summary-row total-row">
            <strong>Total</strong>
            <strong>{{ cart.totalAmount | currency:cart.currency }}</strong>
          </div>

          <button
            mat-raised-button
            color="primary"
            class="checkout-btn"
            (click)="goToCheckout()"
            [disabled]="cart.items.length === 0"
          >
            Passer la commande
          </button>

          <button
            mat-button
            color="warn"
            class="clear-btn"
            (click)="clearCart()"
          >
            Vider le panier
          </button>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .cart-container { max-width: 1200px; margin: 0 auto; padding: 16px; }
    .empty-cart { text-align: center; padding: 64px 16px; }
    .empty-icon { font-size: 80px; height: 80px; width: 80px; color: #bdbdbd; }
    .cart-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
    @media (max-width: 768px) { .cart-layout { grid-template-columns: 1fr; } }
    .cart-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
    .item-image { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
    .item-details { flex: 1; }
    .item-name { margin: 0 0 4px; font-size: 14px; font-weight: 500; }
    .item-price { margin: 0; color: #666; font-size: 13px; }
    .item-quantity { display: flex; align-items: center; gap: 8px; }
    .quantity-value { min-width: 24px; text-align: center; font-weight: 600; }
    .item-total { font-size: 16px; font-weight: 700; color: #1976d2; min-width: 80px; text-align: right; }
    .cart-summary { padding: 24px; border-radius: 8px; height: fit-content; position: sticky; top: 80px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row { font-size: 18px; padding: 12px 0; }
    .free-shipping { color: #2e7d32; font-weight: 500; }
    .checkout-btn { width: 100%; margin-top: 16px; padding: 12px; font-size: 16px; }
    .clear-btn { width: 100%; margin-top: 8px; }
  `],
})
export class CartComponent implements OnInit {
  cart$: Observable<Cart>;

  constructor(
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.cart$ = this.cartService.cart$;
  }

  ngOnInit(): void {
    this.cartService.loadCart().subscribe();
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    if (newQuantity < 0) return;
    this.cartService.updateQuantity(item.productId, newQuantity).subscribe({
      error: () => this.snackBar.open('Erreur lors de la mise à jour', '', { duration: 2000 }),
    });
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId).subscribe({
      next: () => this.snackBar.open('Article supprimé du panier', '', { duration: 2000 }),
      error: () => this.snackBar.open('Erreur lors de la suppression', '', { duration: 2000 }),
    });
  }

  clearCart(): void {
    this.cartService.clearCart().subscribe({
      next: () => this.snackBar.open('Panier vidé', '', { duration: 2000 }),
    });
  }

  goToCheckout(): void {
    this.router.navigate(['/orders/new']);
  }

  trackByProductId(index: number, item: CartItem): string {
    return item.productId;
  }
}
