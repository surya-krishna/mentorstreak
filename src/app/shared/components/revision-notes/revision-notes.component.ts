import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdaptiveApiService, ChapterNotes, RevisionNotesResponse } from '../../../creators/adaptive-api.service';
import { renderLatexBlock } from '../../utils/latex.util';

interface ChapterViewModel {
  id: string;
  name: string;
  points: SafeHtml[];
  expanded: boolean;
}

@Component({
  selector: 'app-revision-notes',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './revision-notes.component.html',
  styles: [`
    .notes-chapter .katex { font-size: 1.05em; }
    .notes-chapter .katex-display { margin: 8px 0; text-align: center; overflow-x: auto; }
    .notes-chapter h1, .notes-chapter h2, .notes-chapter h3 { font-weight: 600; margin: 8px 0 4px; }
    .notes-chapter ul { list-style: disc; padding-left: 1.25rem; }
    .notes-chapter li { margin: 4px 0; }
    .notes-chapter p { margin: 4px 0; }
    .notes-chapter strong { font-weight: 600; }
    .notes-chapter code { background: #f3f4f6; padding: 0 3px; border-radius: 3px; font-size: 0.9em; }
  `]
})
export class RevisionNotesComponent implements OnInit {
  @Input({ required: true }) courseId!: string;

  loading = false;
  regenerating = false;
  error: string | null = null;
  updatedAt: string | null = null;
  questionCount = 0;
  chapters: ChapterViewModel[] = [];
  legacyHtml: SafeHtml | null = null;

  constructor(
    private adaptiveApi: AdaptiveApiService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    this.loading = true;
    this.error = null;
    this.adaptiveApi.getRevisionNotes(this.courseId).subscribe({
      next: (res) => this.applyResponse(res),
      error: () => {
        this.error = 'Failed to load revision notes.';
        this.loading = false;
      },
    });
  }

  regenerate() {
    this.regenerating = true;
    this.adaptiveApi.generateRevisionNotes(this.courseId).subscribe({
      next: (res) => {
        this.regenerating = false;
        this.applyResponse(res);
      },
      error: () => {
        this.regenerating = false;
        this.error = 'Failed to regenerate notes. Please try again.';
      },
    });
  }

  toggleChapter(chapter: ChapterViewModel) {
    chapter.expanded = !chapter.expanded;
  }

  private applyResponse(res: RevisionNotesResponse) {
    this.loading = false;
    this.updatedAt = res.updated_at;
    this.questionCount = res.question_count;
    this.legacyHtml = null;
    this.chapters = [];

    if (res.legacy && res.legacy_notes) {
      this.legacyHtml = this.sanitizer.bypassSecurityTrustHtml(renderLatexBlock(res.legacy_notes));
      return;
    }

    if (!res.chapters) return;

    this.chapters = Object.entries(res.chapters).map(([id, data]: [string, ChapterNotes], i) => ({
      id,
      name: data.name,
      points: data.points.map(pt => this.sanitizer.bypassSecurityTrustHtml(renderLatexBlock(pt))),
      expanded: i === 0,
    }));
  }
}
