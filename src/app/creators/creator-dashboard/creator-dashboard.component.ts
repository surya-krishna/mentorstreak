import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../api-service';

@Component({
  selector: 'app-creator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './creator-dashboard.component.html',
  styleUrls: ['./creator-dashboard.component.scss']
})
export class CreatorDashboardComponent {
  courses: any[] = [];
  selectedCourse: any = null;
  loading = false;
  errorMessage: string | null = null;
  total = 0;
  skip = 0;
  limit = 12;

  lastFocusedEl: HTMLElement | null = null;

  constructor(private router: Router, private api: ApiService) {
    this.loadCourses();
  }

  loadCourses() {
    this.loading = true;
    this.errorMessage = null;
    const qs = `?skip=${this.skip}&limit=${this.limit}`;
    this.api.get('/creator/v2/courses' + qs).subscribe({ next: (res: any) => {
        this.loading = false;
        if (res && Array.isArray(res.items)) {
          this.courses = res.items;
          this.total = res.total || 0;
          this.skip = res.skip || 0;
          this.limit = res.limit || this.limit;
          // fetch thumbnails for any course that has a thumbnail path
          for (const c of this.courses) { if (c && (c.thumbnail_url || c.thumbnail || c.thumbnailPath)) this.fetchCourseThumbnailPreview(c); }
        } else if (Array.isArray(res)) {
          this.courses = res;
          this.total = this.courses.length;
        } else {
          this.courses = [];
        }
      }, error: (err: any) => {
        console.error('Failed to load courses', err);
        this.loading = false;
        this.errorMessage = 'Failed to load courses';
        // fallback sample
        this.courses = [ ];
      } });
  }

  async fetchCourseThumbnailPreview(course: any) {
    try {
      const path = course.thumbnail_url || course.thumbnail || course.thumbnailPath;
      if (!path) return;
      const endpoint = (this.api as any).baseUrl + '/creator/v2/courses/'+course.id+'/thumbnail?filePath=' + encodeURIComponent(path);
      const token = (this.api as any).auth?.getToken?.() || null;
      const headers: any = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const resp = await fetch(endpoint, { method: 'GET', headers });
      if (!resp.ok) return;
      const blob = await resp.blob();
      try { if ((course as any)._thumbPreview && (course as any)._thumbPreview.startsWith('blob:')) URL.revokeObjectURL((course as any)._thumbPreview); } catch (e) {}
      (course as any)._thumbPreview = URL.createObjectURL(blob);
    } catch (e) {
      console.error('fetchCourseThumbnailPreview failed', e);
    }
  }

  nextPage() {
    if (this.skip + this.limit >= this.total) return;
    this.skip += this.limit;
    this.loadCourses();
  }

  prevPage() {
    this.skip = Math.max(0, this.skip - this.limit);
    this.loadCourses();
  }

  setPageSize(n: number) {
    this.limit = n;
    this.skip = 0;
    this.loadCourses();
  }

  get displayEnd() {
    return Math.min(this.skip + this.limit, this.total || this.courses.length);
  }

  openMetrics(c: any) { 
    this.lastFocusedEl = document.activeElement as HTMLElement;
    this.selectedCourse = c; 
    setTimeout(()=>{
      const closeBtn = document.getElementById('metrics-close') as HTMLElement | null;
      closeBtn?.focus();
      const escHandler = (ev: KeyboardEvent) => { if (ev.key === 'Escape') this.closeMetrics(); };
      document.addEventListener('keydown', escHandler, { once: true });
    }, 50);
  }
  closeMetrics() { this.selectedCourse = null; if (this.lastFocusedEl) this.lastFocusedEl.focus(); }
  viewCourse(c: any) { this.router.navigate(['/creator/courses', c.id]); }
  gotoEdit(c: any) { this.router.navigate(['/creator/courses', c.id]); }
}
