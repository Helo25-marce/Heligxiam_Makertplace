/**
 * @file product-detail.component.ts
 * @description Vue détaillée d'un produit avec galerie, attributs, ajout panier
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService } from '../../../services/products.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';
import { Product } from '../../../models';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-product-detail',
  template: `
    <div class="product-detail-container" *ngIf="product; else loadingTpl">
      <!-- Breadcrumb -->
      <nav aria-label="Fil d'Ariane" class="breadcrumb">
        <a routerLink="/">Accueil</a> /
        <a routerLink="/products">Produits</a> /
        <span>{{ product.name }}</span>
      </nav>

      <div class="product-layout">
        <!-- Image Gallery -->
        <section class="product-gallery" aria-label="Images du produit">
          <div class="main-image-container">
            <img
              [src]="selectedImage || 'assets/no-image.png'"
              [alt]="product.name"
              class="main-image"
            />
          </div>
          <div class="thumbnail-row" *ngIf="product.images && product.images.length > 1">
            <button
              *ngFor="let img of product.images; let i = index"
              class="thumbnail-btn"
              [class.active]="selectedImage === img"
              (click)="selectedImage = img"
              [attr.aria-label]="'Image ' + (i + 1)"
            >
              <img [src]="img" [alt]="'Vue ' + (i + 1)" class="thumbnail" loading="lazy" />
            </button>
          </div>
        </section>

        <!-- Product Info -->
        <section class="product-info" aria-label="Informations produit">
          <h1 class="product-title">{{ product.name }}</h1>

          <!-- Rating -->
          <div class="rating-row" *ngIf="product.avgRating">
            <mat-icon *ngFor="let s of getStars(product.avgRating)" class="star">{{ s }}</mat-icon>
            <span class="rating-text">{{ product.avgRating | number:'1.1-1' }}/5 ({{ product.reviewsCount }} avis)</span>
          </div>

          <!-- Price -->
          <div class="price-section">
            <span class="price">
              {{ product.price | currency:product.currency }}
            </span>
            <span
              class="stock-status"
              [class.in-stock]="product.stock > 0"
              [class.out-stock]="product.stock === 0"
            >
              <mat-icon>{{ product.stock > 0 ? 'check_circle' : 'cancel' }}</mat-icon>
              {{ product.stock > 0 ? 'En stock (' + product.stock + ' disponibles)' : 'Rupture de stock' }}
            </span>
          </div>

          <!-- Description -->
          <div class="description" *ngIf="product.description">
            <h2>Description</h2>
            <p>{{ product.description }}</p>
          </div>

          <!-- Dynamic Attributes -->
          <div class="attributes" *ngIf="productAttributes.length > 0">
            <h2>Caractéristiques</h2>
            <table class="attributes-table" role="table" aria-label="Caractéristiques du produit">
              <tbody>
                <tr *ngFor="let attr of productAttributes">
                  <th scope="row">{{ attr.key }}</th>
                  <td>{{ attr.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Quantity + Add to cart -->
          <div class="cart-section">
            <div class="quantity-selector" aria-label="Quantité">
              <button mat-icon-button (click)="decreaseQuantity()" [disabled]="quantity <= 1" aria-label="Diminuer">
                <mat-icon>remove</mat-icon>
              </button>
              <input
                type="number"
                [(ngModel)]="quantity"
                min="1"
                [max]="product.stock"
                class="quantity-input"
                aria-label="Quantité"
              />
              <button mat-icon-button(click)="increaseQuantity()" [disabled]="quantity >= product.stock" aria-label="Augmenter">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <button
              mat-raised-button
              color="primary"
              class="add-to-cart-btn"
              (click)="addToCart()"
              [disabled]="product.stock === 0 || !authService.isLoggedIn || addingToCart"
            >
              <mat-spinner diameter="20" *ngIf="addingToCart"></mat-spinner>
              <mat-icon *ngIf="!addingToCart">add_shopping_cart</mat-icon>
              {{ authService.isLoggedIn ? 'Ajouter au panier' : 'Connectez-vous pour acheter' }}
            </button>
          </div>

          <!-- Seller info -->
          <div class="seller-info" *ngIf="product.sellerId">
            <mat-icon>store</mat-icon>
            <span>Vendu par <strong>{{ product.sellerId }}</strong></span>
          </div>
        </section>
      </div>
    </div>

    <!-- Loading -->
    <ng-template #loadingTpl>
      <div class="loading-center" role="status" aria-label="Chargement">
        <mat-spinner diameter="48" *ngIf="!notFound"></mat-spinner>
        <div *ngIf="notFound" class="not-found">
          <mat-icon>search_off</mat-icon>
          <h2>Produit introuvable</h2>
          <a mat-button routerLink="/products">Retour aux produits</a>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .product-detail-container { max-width: 1200px; margin: 0 auto; padding: 16px; }
    .breadcrumb { margin-bottom: 24px; color: #666; font-size: 14px; }
    .breadcrumb a { color: #1976d2; text-decoration: none; }
    .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    @media (max-width: 768px) { .product-layout { grid-template-columns: 1fr; } }
    .main-image-container { border-radius: 8px; overflow: hidden; background: #f5f5f5; height: 400px; }
    .main-image { width: 100%; height: 100%; object-fit: contain; }
    .thumbnail-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .thumbnail-btn { border: 2px solid transparent; border-radius: 4px; overflow: hidden; padding: 0; cursor: pointer; background: none; }
    .thumbnail-btn.active { border-color: #1976d2; }
    .thumbnail { width: 60px; height: 60px; object-fit: cover; display: block; }
    .product-title { font-size: clamp(1.4rem, 3vw, 2rem); margin: 0 0 12px; }
    .rating-row { display: flex; align-items: center; gap: 4px; margin-bottom: 16px; }
    .star { font-size: 20px; height: 20px; width: 20px; color: #ffc107; }
    .rating-text { color: #666; font-size: 14px; }
    .price-section { margin: 16px 0; }
    .price { font-size: 2rem; font-weight: 700; color: #1565c0; display: block; }
    .stock-status { display: flex; align-items: center; gap: 4px; font-size: 14px; margin-top: 8px; }
    .in-stock { color: #2e7d32; }
    .out-stock { color: #c62828; }
    .description, .attributes { margin: 24px 0; }
    .description h2, .attributes h2 { font-size: 1.1rem; margin-bottom: 8px; }
    .attributes-table { width: 100%; border-collapse: collapse; }
    .attributes-table tr { border-bottom: 1px solid #eee; }
    .attributes-table th { text-align: left; padding: 8px; color: #666; width: 40%; font-weight: normal; }
    .attributes-table td { padding: 8px; font-weight: 500; }
    .cart-section { display: flex; align-items: center; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
    .quantity-selector { display: flex; align-items: center; gap: 8px; border: 1px solid #ddd; border-radius: 4px; padding: 4px; }
    .quantity-input { width: 48px; text-align: center; border: none; outline: none; font-size: 16px; }
    .add-to-cart-btn { height: 48px; font-size: 16px; display: flex; align-items: center; gap: 8px; }
    .seller-info { display: flex; align-items: center; gap: 8px; color: #666; font-size: 14px; }
    .loading-center { display: flex; justify-content: center; align-items: center; min-height: 300px; }
    .not-found { text-align: center; }
    .not-found mat-icon { font-size: 64px; height: 64px; width: 64px; color: #bdbdbd; }
  `],
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  selectedImage = '';
  quantity = 1;
  addingToCart = false;
  notFound = false;
  productAttributes: { key: string; value: string }[] = [];

  constructor(
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService,
    private cartService: CartService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('productId');
    if (!productId) { this.router.navigate(['/products']); return; }

    this.productsService.getProduct(productId).subscribe({
      next: (p) => {
        this.product = p;
        this.selectedImage = p.images?.[0] || '';
        // Transform attributes map to displayable array
        if (p.attributes) {
          this.productAttributes = Object.entries(p.attributes).map(([key, value]) => ({
            key: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(value),
          }));
        }
      },
      error: () => { this.notFound = true; },
    });
  }

  addToCart(): void {
    if (!this.product) return;
    this.addingToCart = true;

    this.cartService.addItem(this.product.productId, this.quantity).subscribe({
      next: () => {
        this.addingToCart = false;
        this.snackBar.open(`"${this.product!.name}" ajouté au panier`, 'Voir le panier', { duration: 3000 })
          .onAction().subscribe(() => this.router.navigate(['/cart']));
      },
      error: () => {
        this.addingToCart = false;
        this.snackBar.open('Erreur lors de l\'ajout', '', { duration: 3000 });
      },
    });
  }

  getStars(rating: number): string[] {
    return [1, 2, 3, 4, 5].map(i =>
      i <= rating ? 'star' : i - 0.5 <= rating ? 'star_half' : 'star_border'
    );
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  increaseQuantity(): void {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }
}
