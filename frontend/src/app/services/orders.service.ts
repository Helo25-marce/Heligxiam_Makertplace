/**
 * @file orders.service.ts
 * @description Service pour les commandes et paiements
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, CreateOrderRequest, Payment, Address, OrderStatus } from '../models';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Créer une commande depuis le panier
   */
  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, request).pipe(
      catchError(err => throwError(() => err.error || { error: 'Failed to create order' }))
    );
  }

  /**
   * Récupérer toutes les commandes de l'utilisateur
   */
  getOrders(status?: OrderStatus): Observable<{ orders: Order[]; total: number }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    return this.http.get<{ orders: Order[]; total: number }>(`${this.apiUrl}/orders`, { params }).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Récupérer une commande par ID
   */
  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Annuler une commande
   */
  cancelOrder(orderId: string, reason?: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/cancel`, { reason }).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Initier un paiement
   */
  initiatePayment(orderId: string, provider: 'stripe' | 'paypal'): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/payments`, { orderId, provider }).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Récupérer les adresses
   */
  getAddresses(type?: 'billing' | 'shipping'): Observable<{ addresses: Address[] }> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);

    return this.http.get<{ addresses: Address[] }>(`${this.apiUrl}/addresses`, { params }).pipe(
      catchError(err => throwError(() => err.error))
    );
  }

  /**
   * Créer une adresse
   */
  createAddress(address: Partial<Address>): Observable<Address> {
    return this.http.post<Address>(`${this.apiUrl}/addresses`, address).pipe(
      catchError(err => throwError(() => err.error))
    );
  }
}
