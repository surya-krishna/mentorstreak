import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../api-service';
import { AdaptiveApiService } from '../adaptive-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-creator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './creator-dashboard.component.html',
  styleUrls: ['./creator-dashboard.component.scss']
})
export class CreatorDashboardComponent implements OnInit {
  courses: any[] = [];
  selectedCourse: any = null;
  loading = false;
  errorMessage: string | null = null;
  total = 0;
  skip = 0;
  limit = 12;

  lastFocusedEl: HTMLElement | null = null;

  // Adaptive analytics widget
  adaptiveWidgetLoading = false;
  adaptiveWidget: {
    totalAttempts: number;
    totalStudents: number;
    pendingReview: number;
    coursesWithData: number;
    attemptsThisWeek: number;
  } = { totalAttempts: 0, totalStudents: 0, pendingReview: 0, coursesWithData: 0, attemptsThisWeek: 0 };

  constructor(private router: Router, private api: ApiService, private adaptiveApi: AdaptiveApiService) {}

  ngOnInit() {
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
          for (const c of this.courses) { if (c && (c.thumbnail_url || c.thumbnail || c.thumbnailPath)) this.fetchCourseThumbnailPreview(c); }
        } else if (Array.isArray(res)) {
          this.courses = res;
          this.total = this.courses.length;
        } else {
          this.courses = [];
        }
        this.loadAdaptiveWidget();
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

  loadAdaptiveWidget() {
    const courseIds = this.courses.map((c: any) => c.id).filter(Boolean);
    if (!courseIds.length) return;
    this.adaptiveWidgetLoading = true;
    const requests = courseIds.map((id: string) =>
      this.adaptiveApi.getCourseAnalytics(id).pipe(catchError(() => of(null)))
    );
    forkJoin(requests).subscribe((results: any[]) => {
      this.adaptiveWidgetLoading = false;
      let totalAttempts = 0, totalStudents = 0, pendingReview = 0, coursesWithData = 0;
      for (const r of results) {
        if (!r) continue;
        totalAttempts += r.total_adaptive_attempts || 0;
        totalStudents += r.total_students || 0;
        pendingReview += r.pending_review || 0;
        if ((r.total_adaptive_attempts || 0) > 0) coursesWithData++;
      }
      this.adaptiveWidget = { totalAttempts, totalStudents, pendingReview, coursesWithData, attemptsThisWeek: 0 };
    });
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
