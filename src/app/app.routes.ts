import { Routes } from '@angular/router';
import { Header } from './header/header';
import { ProductList } from './product-list/product-list';
import { ProductDetail } from './product-detail/product-detail';
import { Cart } from './cart/cart';
import { UserProfile } from './user-profile/user-profile';

export const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: 'products', component: ProductList },
  { path: 'products/:id', component: ProductDetail },
  { path: 'cart', component: Cart },
  { path: 'profile', component: UserProfile },
  { path: '**', redirectTo: '/products' }
];
