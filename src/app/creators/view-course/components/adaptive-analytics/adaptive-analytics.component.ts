import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdaptiveApiService, AdaptiveAnalytics } from '../../../adaptive-api.service';
import { ToastService } from '../../../../toast.service';

interface ChapterRow {
  chapter_id: string;
  chapter_name: string;
  total_students: number;
  avg_ability: number | null;
  buckets: { beginner: number; developing: number; proficient: number; advanced: number };
  total_questions: number;
  reviewed_questions: number;
  pending_review: number;
}

@Component({
  selector: 'app-adaptive-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adaptive-analytics.component.html',
})
export class AdaptiveAnalyticsComponent implements OnInit, OnChanges {
  @Input() course: any;
  @Input() courseId!: string;
  @Output() back = new EventEmitter<void>();
  @Output() continue = new EventEmitter<void>();

  loading = false;
  analytics: AdaptiveAnalytics | null = null;

  // Drill-down
  selectedChapterId: string | null = null;
  chapterDetail: any = null;
  loadingDetail = false;

  constructor(
    private adaptiveApi: AdaptiveApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.courseId) this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courseId'] && this.courseId) this.load();
  }

  load(): void {
    this.loading = true;
    this.adaptiveApi.getCourseAnalytics(this.courseId).subscribe({
      next: (res) => {
        this.analytics = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.detail || 'Failed to load analytics');
      },
    });
  }

  get chapterRows(): ChapterRow[] {
    return (this.analytics?.chapters || []) as ChapterRow[];
  }

  abilityLabel(avg: number | null): string {
    if (avg === null || avg === undefined) return '—';
    if (avg < 2.0) return 'Beginner';
    if (avg < 3.0) return 'Developing';
    if (avg < 4.0) return 'Proficient';
    return 'Advanced';
  }

  abilityColor(avg: number | null): string {
    if (avg === null || avg === undefined) return 'bg-gray-100 text-gray-600';
    if (avg < 2.0) return 'bg-red-100 text-red-700';
    if (avg < 3.0) return 'bg-orange-100 text-orange-700';
    if (avg < 4.0) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  }

  cellShade(count: number, max: number): string {
    if (!max || count === 0) return 'bg-gray-50 text-gray-400';
    const ratio = count / max;
    if (ratio > 0.75) return 'bg-indigo-600 text-white';
    if (ratio > 0.5) return 'bg-indigo-400 text-white';
    if (ratio > 0.25) return 'bg-indigo-200 text-indigo-900';
    return 'bg-indigo-50 text-indigo-700';
  }

  maxBucket(row: ChapterRow): number {
    const b = row.buckets || { beginner: 0, developing: 0, proficient: 0, advanced: 0 };
    return Math.max(b.beginner, b.developing, b.proficient, b.advanced);
  }

  openChapter(chapterId: string): void {
    this.selectedChapterId = chapterId;
    this.chapterDetail = null;
    this.loadingDetail = true;
    this.adaptiveApi.getChapterAnalytics(this.courseId, chapterId).subscribe({
      next: (res) => {
        this.chapterDetail = res;
        this.loadingDetail = false;
      },
      error: (err) => {
        this.loadingDetail = false;
        this.toast.error(err?.error?.detail || 'Failed to load chapter details');
      },
    });
  }

  closeDetail(): void {
    this.selectedChapterId = null;
    this.chapterDetail = null;
  }

  distributionEntries(): { label: string; count: number; color: string }[] {
    const dist = this.analytics?.question_health?.distribution || {};
    return [
      { label: 'Too hard (p<0.2)', count: dist['too_hard'] || 0, color: 'bg-red-500' },
      { label: 'Hard (0.2-0.4)', count: dist['hard'] || 0, color: 'bg-orange-500' },
      { label: 'Medium (0.4-0.6)', count: dist['medium'] || 0, color: 'bg-yellow-500' },
      { label: 'Easy (0.6-0.8)', count: dist['easy'] || 0, color: 'bg-lime-500' },
      { label: 'Too easy (p>0.8)', count: dist['too_easy'] || 0, color: 'bg-red-400' },
      { label: 'Unused', count: dist['unused'] || 0, color: 'bg-gray-400' },
    ];
  }

  distributionTotal(): number {
    return this.distributionEntries().reduce((sum, e) => sum + e.count, 0);
  }

  barWidth(count: number): string {
    const total = this.distributionTotal();
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  formatAbility(avg: number | null | undefined): string {
    if (avg === null || avg === undefined) return '—';
    return avg.toFixed(2);
  }

  onBack(): void {
    this.back.emit();
  }

  onContinue(): void {
    this.continue.emit();
  }
}
