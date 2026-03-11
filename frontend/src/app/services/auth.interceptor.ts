/**
 * @file auth.interceptor.ts
 * @description HTTP Interceptor - Injecte automatiquement le JWT dans toutes les requêtes
 * Sécurité : Évite la répétition manuelle de l'en-tête Authorization
 */
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.token;

    // Ajouter le token si disponible
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Token expiré : redirection vers login
        if (error.status === 401) {
          this.router.navigate(['/auth/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
