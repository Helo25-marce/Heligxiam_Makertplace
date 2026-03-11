/**
 * @file home.component.ts
 * @description Page d'accueil - hero section, catégories, produits vedettes
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductsService } from '../../services/products.service';
import { Product, Category } from '../../models';

@Component({
  selector: 'app-home',
  template: `
    <!-- Hero Section -->
    <section class="hero" role="banner">
      <div class="hero-content">
        <h1 class="hero-title">Bienvenue sur MarketPlace</h1>
        <p class="hero-subtitle">Des milliers de produits, des prix imbattables</p>
        <div class="hero-search">
          <input
            type="search"
            class="hero-search-input"
            placeholder="Que recherchez-vous ?"
            [(ngModel)]="searchQuery"
            (keyup.enter)="search()"
            aria-label="Rechercher des produits"
          />
          <button class="hero-search-btn" (click)="search()" aria-label="Rechercher">
            Rechercher
          </button>
        </div>
      </div>
    </section>

    <!-- Categories Section -->
    <section class="categories-section" aria-labelledby="categories-title">
      <div class="section-container">
        <h2 id="categories-title">Nos catégories</h2>
        <div class="categories-grid">
          <button
            *ngFor="let cat of categories"
            class="category-card mat-elevation-z1"
            (click)="browseCategory(cat.categoryId)"
            [attr.aria-label]="'Parcourir la catégorie ' + cat.name"
          >
            <mat-icon class="category-icon">category</mat-icon>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="featured-section" aria-labelledby="featured-title">
      <div class="section-container">
        <h2 id="featured-title">Produits populaires</h2>

        <div *ngIf="loading" class="loading-center">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loading" class="featured-grid">
          <article
            *ngFor="let product of featuredProducts; trackBy: trackByProductId"
            class="featured-card mat-elevation-z2"
            (click)="viewProduct(product.productId)"
            role="button"
            tabindex="0"
            (keyup.enter)="viewProduct(product.productId)"
            [attr.aria-label]="product.name + ' - ' + (product.price | currency:product.currency)"
          >
            <div class="featured-image-wrap">
              <img
                [src]="product.images?.[0] || 'assets/no-image.png'"
                [alt]="product.name"
                loading="lazy"
                class="featured-image"
              />
              <span class="featured-badge" *ngIf="product.avgRating && product.avgRating >= 4">
                ⭐ Populaire
              </span>
            </div>
            <div class="featured-info">
              <h3>{{ product.name }}</h3>
              <p class="featured-price">{{ product.price | currency:product.currency }}</p>
            </div>
          </article>
        </div>

        <div class="see-more">
          <a mat-raised-button color="primary" routerLink="/products">
            Voir tous les produits
          </a>
        </div>
      </div>
    </section>

    <!-- Value propositions -->
    <section class="value-props" aria-label="Nos avantages">
      <div class="section-container">
        <div class="value-grid">
          <div class="value-item">
            <mat-icon>local_shipping</mat-icon>
            <h3>Livraison rapide</h3>
            <p>Livraison gratuite dès 30€</p>
          </div>
          <div class="value-item">
            <mat-icon>security</mat-icon>
            <h3>Paiement sécurisé</h3>
            <p>Transactions cryptées SSL</p>
          </div>
          <div class="value-item">
            <mat-icon>support_agent</mat-icon>
            <h3>Support 24/7</h3>
            <p>Nous sommes là pour vous</p>
          </div>
          <div class="value-item">
            <mat-icon>replay</mat-icon>
            <h3>Retours gratuits</h3>
            <p>30 jours pour changer d'avis</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Hero */
    .hero { background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; padding: 80px 16px; text-align: center; }
    .hero-title { font-size: clamp(1.8rem, 5vw, 3rem); margin: 0 0 16px; }
    .hero-subtitle { font-size: 1.1rem; opacity: 0.9; margin: 0 0 32px; }
    .hero-search { display: flex; max-width: 600px; margin: 0 auto; border-radius: 50px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
    .hero-search-input { flex: 1; padding: 16px 24px; border: none; font-size: 16px; outline: none; }
    .hero-search-btn { padding: 16px 32px; background: #ff6f00; color: white; border: none; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.2s; }
    .hero-search-btn:hover { background: #e65100; }
    /* Sections */
    .section-container { max-width: 1400px; margin: 0 auto; padding: 48px 16px; }
    .categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; margin-top: 24px; }
    .category-card { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; border-radius: 8px; border: 2px solid transparent; background: white; cursor: pointer; transition: all 0.2s; }
    .category-card:hover { border-color: #1976d2; color: #1976d2; transform: translateY(-2px); }
    .category-icon { font-size: 36px; height: 36px; width: 36px; margin-bottom: 8px; }
    .featured-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin: 24px 0; }
    .featured-card { border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; background: white; }
    .featured-card:hover { transform: translateY(-4px); }
    .featured-image-wrap { position: relative; height: 200px; }
    .featured-image { width: 100%; height: 100%; object-fit: cover; }
    .featured-badge { position: absolute; top: 8px; right: 8px; background: #ff6f00; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .featured-info { padding: 12px; }
    .featured-info h3 { margin: 0 0 4px; font-size: 13px; }
    .featured-price { margin: 0; font-weight: 700; color: #1976d2; }
    .see-more { text-align: center; margin-top: 32px; }
    /* Value props */
    .value-props { background: #f5f5f5; }
    .value-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 32px; }
    .value-item { text-align: center; }
    .value-item mat-icon { font-size: 48px; height: 48px; width: 48px; color: #1976d2; }
    .value-item h3 { margin: 8px 0 4px; }
    .value-item p { margin: 0; color: #666; }
    .loading-center { display: flex; justify-content: center; padding: 32px; }
  `],
})
export class HomeComponent implements OnInit {
  featuredProducts: Product[] = [];
  categories: Category[] = [];
  loading = true;
  searchQuery = '';

  constructor(
    private productsService: ProductsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.productsService.getCategories().subscribe(res => {
      this.categories = res.categories.slice(0, 8);
    });

    this.productsService.getProducts({ limit: 8, sort: 'newest' }).subscribe({
      next: (res) => {
        this.featuredProducts = res.products;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  search(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { queryParams: { q: this.searchQuery } });
    }
  }

  browseCategory(categoryId: string): void {
    this.router.navigate(['/products'], { queryParams: { categoryId } });
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/products', productId]);
  }

  trackByProductId(index: number, product: Product): string {
    return product.productId;
  }
}
