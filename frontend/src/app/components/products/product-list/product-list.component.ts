/**
 * @file product-list.component.ts
 * @description Liste des produits avec filtres, tri, pagination
 * Performance : OnPush change detection, lazy images, virtual scroll ready
 */
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap } from 'rxjs';
import { ProductsService } from '../../../services/products.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';
import { Product, ProductFilters, Category } from '../../../models';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="product-list-container">
      <!-- Filters sidebar -->
      <aside class="filters-panel" role="complementary" aria-label="Filtres">
        <h2>Filtres</h2>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Catégorie</mat-label>
          <mat-select (selectionChange)="onCategoryChange($event.value)">
            <mat-option value="">Toutes</mat-option>
            <mat-option *ngFor="let cat of categories" [value]="cat.categoryId">
              {{ cat.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="price-range">
          <h3>Prix</h3>
          <mat-slider min="0" max="5000">
            <input matSliderStartThumb [(ngModel)]="minPrice" (change)="onPriceChange()">
            <input matSliderEndThumb [(ngModel)]="maxPrice" (change)="onPriceChange()">
          </mat-slider>
          <div class="price-labels">
            <span>{{ minPrice | currency:'EUR' }}</span>
            <span>{{ maxPrice | currency:'EUR' }}</span>
          </div>
        </div>

        <mat-checkbox [(ngModel)]="availableOnly" (change)="onFilterChange()">
          En stock uniquement
        </mat-checkbox>
      </aside>

      <!-- Main content -->
      <main class="products-main">
        <!-- Toolbar -->
        <div class="products-toolbar">
          <span class="results-count">{{ totalProducts }} résultats</span>

          <mat-form-field appearance="outline" class="sort-select">
            <mat-label>Trier par</mat-label>
            <mat-select [(value)]="currentSort" (selectionChange)="onSortChange($event.value)">
              <mat-option value="newest">Les plus récents</mat-option>
              <mat-option value="price:asc">Prix croissant</mat-option>
              <mat-option value="price:desc">Prix décroissant</mat-option>
              <mat-option value="rating">Mieux notés</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Loading spinner -->
        <div *ngIf="loading" class="loading-container" role="status" aria-label="Chargement">
          <mat-spinner diameter="48"></mat-spinner>
        </div>

        <!-- Products grid -->
        <div class="products-grid" *ngIf="!loading" role="list">
          <article
            *ngFor="let product of products; trackBy: trackByProductId"
            class="product-card mat-elevation-z2"
            role="listitem"
          >
            <a [routerLink]="['/products', product.productId]" class="product-link">
              <!-- Product image with lazy loading -->
              <div class="product-image-container">
                <img
                  [src]="product.images?.[0] || 'assets/no-image.png'"
                  [alt]="product.name"
                  loading="lazy"
                  class="product-image"
                />
              </div>

              <div class="product-info">
                <h3 class="product-name">{{ product.name }}</h3>

                <!-- Rating stars -->
                <div class="product-rating" *ngIf="product.avgRating">
                  <mat-icon *ngFor="let star of getStars(product.avgRating || 0)" class="star-icon">
                    {{ star }}
                  </mat-icon>
                  <span class="rating-count">({{ product.reviewsCount }})</span>
                </div>

                <p class="product-price">{{ product.price | currency:product.currency }}</p>

                <!-- Stock indicator -->
                <span
                  class="stock-badge"
                  [class.in-stock]="product.stock > 0"
                  [class.out-of-stock]="product.stock === 0"
                >
                  {{ product.stock > 0 ? 'En stock' : 'Rupture de stock' }}
                </span>
              </div>
            </a>

            <!-- Add to cart button -->
            <div class="product-actions">
              <button
                mat-raised-button
                color="primary"
                (click)="addToCart($event, product)"
                [disabled]="product.stock === 0 || !authService.isLoggedIn"
                class="add-cart-btn"
                [attr.aria-label]="'Ajouter ' + product.name + ' au panier'"
              >
                <mat-icon>add_shopping_cart</mat-icon>
                {{ authService.isLoggedIn ? 'Ajouter' : 'Connectez-vous' }}
              </button>
            </div>
          </article>

          <!-- Empty state -->
          <div *ngIf="products.length === 0 && !loading" class="empty-state">
            <mat-icon class="empty-icon">search_off</mat-icon>
            <p>Aucun produit trouvé</p>
            <button mat-button (click)="resetFilters()">Réinitialiser les filtres</button>
          </div>
        </div>

        <!-- Pagination -->
        <mat-paginator
          *ngIf="totalProducts > 0"
          [length]="totalProducts"
          [pageSize]="pageSize"
          [pageSizeOptions]="[12, 24, 48]"
          (page)="onPageChange($event)"
          aria-label="Pagination des produits"
        ></mat-paginator>
      </main>
    </div>
  `,
  styles: [`
    .product-list-container { display: flex; gap: 24px; max-width: 1400px; margin: 0 auto; padding: 16px; }
    .filters-panel { width: 250px; flex-shrink: 0; }
    @media (max-width: 768px) { .filters-panel { display: none; } }
    .products-main { flex: 1; }
    .products-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .product-card { border-radius: 8px; overflow: hidden; transition: transform 0.2s; }
    .product-card:hover { transform: translateY(-4px); }
    .product-link { text-decoration: none; color: inherit; display: block; }
    .product-image-container { height: 200px; overflow: hidden; background: #f5f5f5; }
    .product-image { width: 100%; height: 100%; object-fit: cover; }
    .product-info { padding: 12px; }
    .product-name { margin: 0 0 8px; font-size: 14px; font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .product-price { font-size: 18px; font-weight: 700; color: #1976d2; margin: 4px 0; }
    .stock-badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; }
    .in-stock { background: #e8f5e9; color: #2e7d32; }
    .out-of-stock { background: #ffebee; color: #c62828; }
    .product-actions { padding: 8px 12px 12px; }
    .add-cart-btn { width: 100%; }
    .star-icon { font-size: 16px; height: 16px; width: 16px; color: #ffc107; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 48px; grid-column: 1/-1; }
    .empty-icon { font-size: 64px; height: 64px; width: 64px; color: #bdbdbd; }
  `],
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  categories: Category[] = [];
  totalProducts = 0;
  loading = false;
  currentPage = 0;
  pageSize = 12;
  currentSort: ProductFilters['sort'] = 'newest';
  minPrice = 0;
  maxPrice = 5000;
  availableOnly = false;
  currentCategoryId?: string;

  private destroy$ = new Subject<void>();
  private searchQuery = '';

  constructor(
    public authService: AuthService,
    private productsService: ProductsService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Charger catégories
    this.productsService.getCategories().pipe(
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.categories = res.categories;
      this.cdr.markForCheck();
    });

    // Écouter les query params (search)
    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
    ).subscribe(params => {
      this.searchQuery = params['q'] || '';
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.loading = true;
    const filters: ProductFilters = {
      page: this.currentPage,
      limit: this.pageSize,
      sort: this.currentSort,
    };

    if (this.searchQuery) filters.q = this.searchQuery;
    if (this.currentCategoryId) filters.categoryId = this.currentCategoryId;
    if (this.minPrice > 0) filters.minPrice = this.minPrice;
    if (this.maxPrice < 5000) filters.maxPrice = this.maxPrice;
    if (this.availableOnly) filters.available = true;

    this.productsService.getProducts(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.products = res.products;
        this.totalProducts = res.total;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  addToCart(event: Event, product: Product): void {
    event.preventDefault();
    event.stopPropagation();

    this.cartService.addItem(product.productId, 1).subscribe({
      next: () => {
        this.snackBar.open(`"${product.name}" ajouté au panier`, 'Voir le panier', {
          duration: 3000,
        }).onAction().subscribe(() => this.router.navigate(['/cart']));
      },
      error: () => {
        this.snackBar.open('Erreur lors de l\'ajout au panier', '', { duration: 3000 });
      },
    });
  }

  onCategoryChange(categoryId: string): void {
    this.currentCategoryId = categoryId || undefined;
    this.currentPage = 0;
    this.loadProducts();
  }

  onSortChange(sort: ProductFilters['sort']): void {
    this.currentSort = sort;
    this.loadProducts();
  }

  onPriceChange(): void {
    this.currentPage = 0;
    this.loadProducts();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadProducts();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProducts();
    window.scrollTo(0, 0);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.currentCategoryId = undefined;
    this.minPrice = 0;
    this.maxPrice = 5000;
    this.availableOnly = false;
    this.currentPage = 0;
    this.router.navigate(['/products']);
  }

  trackByProductId(index: number, product: Product): string {
    return product.productId;
  }

  getStars(rating: number): string[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? 'star' : i - 0.5 <= rating ? 'star_half' : 'star_border');
    }
    return stars;
  }
}
