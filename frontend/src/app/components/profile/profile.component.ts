/**
 * @file profile.component.ts
 * @description Page profil utilisateur - infos, adresses, modification
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { OrdersService } from '../../services/orders.service';
import { User, Address } from '../../models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  template: `
    <div class="profile-container">
      <h1>Mon profil</h1>

      <div class="profile-layout" *ngIf="user$ | async as user">
        <!-- User info -->
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>account_circle</mat-icon>
            <mat-card-title>{{ user.username }}</mat-card-title>
            <mat-card-subtitle>{{ user.email }} · <span class="role-badge">{{ user.role }}</span></mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="profileForm" (ngSubmit)="updateProfile(user.userId)">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nom d'utilisateur</mat-label>
                <input matInput formControlName="username" />
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>E-mail</mat-label>
                <input matInput formControlName="email" type="email" />
                <mat-icon matPrefix>email</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nouveau mot de passe (optionnel)</mat-label>
                <input matInput [type]="hidePass ? 'password' : 'text'" formControlName="password" />
                <mat-icon matPrefix>lock</mat-icon>
                <button mat-icon-button matSuffix type="button" (click)="hidePass = !hidePass">
                  <mat-icon>{{ hidePass ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid || saving">
                <mat-spinner diameter="18" *ngIf="saving"></mat-spinner>
                <span *ngIf="!saving">Sauvegarder</span>
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Addresses -->
        <mat-card class="addresses-card">
          <mat-card-header>
            <mat-card-title>Mes adresses</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="addresses.length === 0" class="no-addresses">
              Aucune adresse enregistrée.
            </div>
            <div *ngFor="let addr of addresses" class="address-item mat-elevation-z1">
              <div class="addr-type">
                <mat-icon>{{ addr.type === 'shipping' ? 'local_shipping' : 'receipt' }}</mat-icon>
                <span class="addr-badge">{{ addr.type === 'shipping' ? 'Livraison' : 'Facturation' }}</span>
                <span *ngIf="addr.isDefault" class="default-badge">Par défaut</span>
              </div>
              <p>{{ addr.line1 }}</p>
              <p *ngIf="addr.line2">{{ addr.line2 }}</p>
              <p>{{ addr.postalCode }} {{ addr.city }}, {{ addr.country }}</p>
            </div>

            <!-- Add address form -->
            <mat-expansion-panel class="add-addr-panel">
              <mat-expansion-panel-header>
                <mat-panel-title><mat-icon>add</mat-icon> Ajouter une adresse</mat-panel-title>
              </mat-expansion-panel-header>
              <form [formGroup]="addressForm" (ngSubmit)="addAddress()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Type</mat-label>
                  <mat-select formControlName="type">
                    <mat-option value="shipping">Livraison</mat-option>
                    <mat-option value="billing">Facturation</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Ligne 1</mat-label>
                  <input matInput formControlName="line1" placeholder="12 rue de la Paix" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Ligne 2 (optionnel)</mat-label>
                  <input matInput formControlName="line2" placeholder="Appartement 4B" />
                </mat-form-field>
                <div class="addr-row">
                  <mat-form-field appearance="outline" style="flex: 1">
                    <mat-label>Code postal</mat-label>
                    <input matInput formControlName="postalCode" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="flex: 2">
                    <mat-label>Ville</mat-label>
                    <input matInput formControlName="city" />
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Pays (code ISO)</mat-label>
                  <input matInput formControlName="country" maxlength="2" placeholder="FR" />
                </mat-form-field>
                <mat-checkbox formControlName="isDefault">Adresse par défaut</mat-checkbox>
                <br/><br/>
                <button mat-raised-button color="accent" type="submit" [disabled]="addressForm.invalid">
                  Ajouter l'adresse
                </button>
              </form>
            </mat-expansion-panel>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 1000px; margin: 0 auto; padding: 16px; }
    .profile-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 768px) { .profile-layout { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .role-badge { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .address-item { padding: 12px; border-radius: 6px; margin-bottom: 12px; }
    .addr-type { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .addr-badge { font-weight: 600; font-size: 13px; }
    .default-badge { background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .addr-row { display: flex; gap: 12px; }
    .add-addr-panel { margin-top: 16px; }
    .no-addresses { color: #757575; padding: 16px 0; }
  `],
})
export class ProfileComponent implements OnInit {
  user$ = this.authService.currentUser$;
  profileForm: FormGroup;
  addressForm: FormGroup;
  addresses: Address[] = [];
  saving = false;
  hidePass = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private ordersService: OrdersService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]],
    });

    this.addressForm = this.fb.group({
      type: ['shipping', Validators.required],
      line1: ['', Validators.required],
      line2: [''],
      postalCode: ['', Validators.required],
      city: ['', Validators.required],
      country: ['FR', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
      isDefault: [false],
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user) {
      this.profileForm.patchValue({ username: user.username, email: user.email });
    }
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.ordersService.getAddresses().subscribe({
      next: (res) => this.addresses = res.addresses,
    });
  }

  updateProfile(userId: string): void {
    if (this.profileForm.invalid) return;
    this.saving = true;

    const data: Record<string, string> = {};
    const { username, email, password } = this.profileForm.value;
    if (username) data['username'] = username;
    if (email) data['email'] = email;
    if (password) data['password'] = password;

    this.http.put(`${environment.apiUrl}/users/${userId}`, data).subscribe({
      next: () => {
        this.saving = false;
        this.authService.getMe().subscribe();
        this.snackBar.open('Profil mis à jour', '', { duration: 2000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Erreur lors de la mise à jour', '', { duration: 2000 });
      },
    });
  }

  addAddress(): void {
    if (this.addressForm.invalid) return;
    this.ordersService.createAddress(this.addressForm.value).subscribe({
      next: () => {
        this.snackBar.open('Adresse ajoutée', '', { duration: 2000 });
        this.addressForm.reset({ type: 'shipping', country: 'FR', isDefault: false });
        this.loadAddresses();
      },
      error: () => this.snackBar.open('Erreur lors de l\'ajout', '', { duration: 2000 }),
    });
  }
}
