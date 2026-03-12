import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private container: HTMLElement | null = null;

  private ensureContainer() {
    if (this.container) return;
    const c = document.createElement('div');
    c.style.position = 'fixed';
    c.style.right = '16px';
    c.style.bottom = '16px';
    c.style.zIndex = '99999';
    c.style.display = 'flex';
    c.style.flexDirection = 'column';
    c.style.gap = '8px';
    this.container = c;
    document.body.appendChild(c);
  }

  show(message: string, duration = 3000) {
    try {
      this.ensureContainer();
      const el = document.createElement('div');
      el.textContent = message;
      el.style.background = 'rgba(0,0,0,0.8)';
      el.style.color = 'white';
      el.style.padding = '8px 12px';
      el.style.borderRadius = '6px';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      el.style.fontSize = '13px';
      this.container!.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 350);
      }, duration);
    } catch (e) {
      // fallback to alert
      try { console.warn('Toast show fallback to alert', e); alert(message); } catch (e2) { /* ignore */ }
    }
  }
  success(message: string) {
    this.show(message);
  }

  error(message: string) {
    this.show(message);
  }
}
