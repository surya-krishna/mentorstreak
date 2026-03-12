import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-blog',
  standalone: true,
  templateUrl: './blog.component.html',
  styles: [`
    :host {
      --primary: #FFFFFF;
      --accent: #a21caf;
      --cyan: #06b6d4;
      --background: #18181b;
      --white: #fff;
      --shadow-glow: 0 0 16px 2px var(--primary);
      --shadow-3xl: 0 8px 32px 0 rgba(124,58,237,0.15), 0 1.5px 8px 0 rgba(0,0,0,0.10);
      --shadow-4xl: 0 16px 48px 0 rgba(124,58,237,0.25), 0 3px 16px 0 rgba(0,0,0,0.15);
    }
    .bg-primary { background: var(--primary); }
    .bg-accent { background: var(--accent); }
    .bg-cyan { background: var(--cyan); }
    .text-primary { color: var(--primary); }
    .text-accent { color: var(--accent); }
    .text-cyan { color: var(--cyan); }
    .drop-shadow-glow { text-shadow: 0 2px 16px var(--primary), 0 1.5px 8px rgba(0,0,0,0.10); }
    .shadow-glow { box-shadow: var(--shadow-glow); }
    .shadow-3xl { box-shadow: var(--shadow-3xl); }
    .shadow-4xl { box-shadow: var(--shadow-4xl); }
    .rounded-2xl { border-radius: 1.5rem; }
    .rounded-3xl { border-radius: 2rem; }
    .backdrop-blur-xs { backdrop-filter: blur(12px); }
    .backdrop-blur-xl { backdrop-filter: blur(32px); }
    .backdrop-blur-2xl { backdrop-filter: blur(48px); }
    .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.4,0,0.2,1) both; }
    .animate-fade-in-up { animation: fadeInUp 1.2s cubic-bezier(0.4,0,0.2,1) both; }
    .animate-fade-in-down { animation: fadeInDown 1.2s cubic-bezier(0.4,0,0.2,1) both; }
    .animate-float { animation: float 6s ease-in-out infinite alternate; }
    .animate-float-slow { animation: float 10s ease-in-out infinite alternate; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: none; } }
    @keyframes float { 0% { transform: translateY(0); } 100% { transform: translateY(-20px); } }
    .shadow-glow-orangeblue { box-shadow: 0 0 24px 0 #7c3aed33, 0 0 8px 0 #06b6d433; }
    @media (max-width: 768px) {
      h1 { font-size: 2.5rem !important; }
      h2 { font-size: 1.5rem !important; }
      .w-64, .h-64 { width: 10rem !important; height: 10rem !important; }
      .w-24, .h-24 { width: 5rem !important; height: 5rem !important; }
    }
  `]
})
export class BlogComponent {
  constructor(private router: Router) {}
  goToPost(id: number) {
    this.router.navigate(['/blog', id]);
  }
}
