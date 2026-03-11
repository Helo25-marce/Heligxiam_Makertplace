/**
 * @file auth.service.ts
 * @description Authentication service - JWT management, login/register/logout
 * Sécurité : stockage token en memory + sessionStorage (pas localStorage pour XSS)
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment'; // Changed from '../environments/environment' to '../../environments/environment'
import { AuthResponse, User, LoginRequest, RegisterRequest } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // BehaviorSubject pour état de connexion réactif
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Restaurer session depuis sessionStorage (expire à fermeture onglet)
    this.restoreSession();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  get isVendeur(): boolean {
    return this.currentUser?.role === 'vendeur' || this.isAdmin;
  }

  /**
   * Connexion utilisateur
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(err => throwError(() => err.error || { error: 'Login failed' }))
    );
  }

  /**
   * Inscription utilisateur
   */
  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, data).pipe(
      catchError(err => throwError(() => err.error || { error: 'Registration failed' }))
    );
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(err => {
        if (err.status === 401) this.clearSession();
        return throwError(() => err);
      })
    );
  }

  /**
   * Déconnexion
   */
  logout(): void {
    // Invalider le token côté serveur
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(), // Déconnecter côté client même si erreur serveur
    });
  }

  /**
   * Gérer une réponse d'authentification réussie
   */
  private handleAuthSuccess(response: AuthResponse): void {
    this.tokenSubject.next(response.token);

    // Stocker en sessionStorage (sécurité : expire à fermeture onglet)
    sessionStorage.setItem('auth_token', response.token);
    sessionStorage.setItem('user_role', response.role);
    sessionStorage.setItem('user_id', response.userId);

    // Charger le profil complet
    this.getMe().subscribe();
  }

  /**
   * Restaurer session depuis sessionStorage
   */
  private restoreSession(): void {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      // Vérifier si le token n'est pas expiré (côté client)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          this.tokenSubject.next(token);
          this.getMe().subscribe({
            error: () => this.clearSession(),
          });
        } else {
          this.clearSession(); // Token expiré
        }
      } catch {
        this.clearSession(); // Token malformé
      }
    }
  }

  /**
   * Nettoyer la session
   */
  private clearSession(): void {
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    sessionStorage.clear();
    this.router.navigate(['/']);
  }
}
