/**
 * @file products.service.ts
 * @description Service pour les appels API du catalogue produits
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product, ProductFilters, ProductsResponse, Category } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Rechercher des produits avec filtres et pagination
   */
  getProducts(filters: ProductFilters = {}): Observable<ProductsResponse> {
    let params = new HttpParams();

    if (filters.q) params = params.set('q', filters.q);
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters.minPrice !== undefined) params = params.set('minPrice', filters.minPrice);
    if (filters.maxPrice !== undefined) params = params.set('maxPrice', filters.maxPrice);
    if (filters.sellerId) params = params.set('sellerId', filters.sellerId);
    if (filters.available !== undefined) params = params.set('available', filters.available);
    if (filters.page !== undefined) params = params.set('page', filters.page);
    if (filters.limit !== undefined) params = params.set('limit', filters.limit);
    if (filters.sort) params = params.set('sort', filters.sort);

    return this.http.get<ProductsResponse>(`${this.apiUrl}/products`, { params }).pipe(
      catchError(err => throwError(() => err.error || { error: 'Failed to load products' }))
    );
  }

  /**
   * Récupérer un produit par ID
   */
  getProduct(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${productId}`).pipe(
      catchError(err => throwError(() => err.error || { error: 'Product not found' }))
    );
  }

  /**
   * Créer un produit (vendeur/admin)
   */
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, product).pipe(
      catchError(err => throwError(() => err.error || { error: 'Failed to create product' }))
    );
  }

  /**
   * Modifier un produit
   */
  updateProduct(productId: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${productId}`, data).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Supprimer un produit (soft delete)
   */
  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${productId}`).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Récupérer toutes les catégories
   */
  getCategories(): Observable<{ categories: Category[]; total: number }> {
    return this.http.get<{ categories: Category[]; total: number }>(`${this.apiUrl}/categories`).pipe(
      shareReplay(1) // Cache les catégories (données peu changeantes)
    );
  }
}
