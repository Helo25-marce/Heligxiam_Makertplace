/**
 * @file cart.service.ts
 * @description Service panier avec état réactif (BehaviorSubject)
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cart, CartItem } from '../models';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly apiUrl = environment.apiUrl;

  // État réactif du panier
  private cartSubject = new BehaviorSubject<Cart>({
    items: [],
    totalItems: 0,
    totalAmount: 0,
    currency: 'EUR',
  });

  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {}

  get cartItemCount(): number {
    return this.cartSubject.value.totalItems;
  }

  get cartTotal(): number {
    return this.cartSubject.value.totalAmount;
  }

  /**
   * Charger le panier depuis le serveur
   */
  loadCart(): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiUrl}/cart`).pipe(
      tap(cart => this.cartSubject.next(cart)),
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Ajouter un article au panier
   */
  addItem(productId: string, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/cart/items`, { productId, quantity }).pipe(
      tap(cart => this.cartSubject.next(cart)),
      catchError(err => throwError(() => err.error || { error: 'Failed to add item' }))
    );
  }

  /**
   * Modifier la quantité d'un article
   */
  updateQuantity(productId: string, quantity: number): Observable<Cart | void> {
    if (quantity === 0) return this.removeItem(productId);

    return this.http.put<Cart>(`${this.apiUrl}/cart/items/${productId}`, { quantity }).pipe(
      tap(cart => this.cartSubject.next(cart)),
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Supprimer un article du panier
   */
  removeItem(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cart/items/${productId}`).pipe(
      tap(() => {
        const current = this.cartSubject.value;
        const updated: Cart = {
          ...current,
          items: current.items.filter(i => i.productId !== productId),
          totalItems: current.totalItems - 1,
        };
        updated.totalAmount = updated.items.reduce((s, i) => s + i.total, 0);
        this.cartSubject.next(updated);
      }),
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Vider le panier
   */
  clearCart(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cart`).pipe(
      tap(() => this.cartSubject.next({ items: [], totalItems: 0, totalAmount: 0, currency: 'EUR' })),
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Réinitialiser l'état local (après déconnexion)
   */
  resetCart(): void {
    this.cartSubject.next({ items: [], totalItems: 0, totalAmount: 0, currency: 'EUR' });
  }
}
