import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
    selector: 'app-header',
  standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './header.component.html',
    styles: [``]
})
export class HeaderComponent {
  loggedIn = false;
  private subs: any[] = [];
  menuOpen = false;
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }

  private router = inject(Router);
  private auth = inject(AuthService);

  get isCreatorLoggedIn() {
  return this.loggedIn || !!this.auth.getToken();
  }

  get creatorName() {
  return this.auth.getCreator()?.name || null;
  }

  logout() {
    this.auth.clear();
    this.router.navigate(['/']);
  }

  ngOnInit() {
    // subscribe to login state so header updates immediately when token is saved/cleared
    const s = this.auth.loggedIn$.subscribe((v) => { this.loggedIn = !!v; });
    this.subs.push(s);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe && s.unsubscribe());
  }

  navigateToSection(section: string) {
    const isHome = this.router.url === '/' || this.router.url === '/#' || this.router.url === '/#/';
    if (isHome) {
      // If already on home, scroll to the section
      setTimeout(() => {
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    } else {
      // Navigate to home and then scroll
      this.router.navigate(['/'], { fragment: section }).then(() => {
        setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      });
    }
    this.closeMenu();
  }
}
