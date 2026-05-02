import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { AdaptiveApiService, QuestionBankItem, QuestionStats, CsvImportResult, PendingReviewResponse, MockTestPatternSection, MockTestPattern } from '../../../adaptive-api.service';
import { ToastService } from '../../../../toast.service';
import { ModalService } from '../../../../modal.service';
import { LatexTextComponent } from '../../../../shared/components/latex-text/latex-text.component';

type TabKey = 'browse' | 'ai' | 'csv' | 'config';

interface ChapterOption {
  id: string;
  name: string;
  book_id: string;
  book_name: string;
}

@Component({
  selector: 'app-question-bank-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LatexTextComponent],
  templateUrl: './question-bank-manager.component.html',
})
export class QuestionBankManagerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() course: any;
  @Input() courseId!: string;
  @Output() back = new EventEmitter<void>();
  @Output() continue = new EventEmitter<void>();

  tab: TabKey = 'browse';
  loading = false;

  // Shared chapter list
  chapters: ChapterOption[] = [];

  // Browse tab
  filters = {
    chapter_id: '',
    book_id: '',
    difficulty: null as number | null,
    bloom_level: '',
    topic: '',
    page: 1,
    limit: 25,
  };
  questions: QuestionBankItem[] = [];
  totalQuestions = 0;
  stats: QuestionStats | null = null;
  editingQuestion: QuestionBankItem | null = null;
  addingQuestion = false;
  newQuestion: QuestionBankItem = this.blankQuestion();

  // AI tab
  aiRequest = {
    chapter_ids: [] as string[],
    questions_per_chapter: 20,
    distribution: { easy: 6, medium: 8, hard: 6 },
  };
  generating = false;
  genJobId: string | null = null;
  genProgress = 0;
  genBatches = { completed: 0, total: 0 };
  genCount = 0;
  genErrors: string[] = [];
  private pollSub?: Subscription;
  pending: PendingReviewResponse | null = null;
  selectedPending: Record<string, boolean> = {};

  // CSV tab
  csvFile: File | null = null;
  csvResult: CsvImportResult | null = null;
  csvUploading = false;

  // Config tab
  config: any = {
    default_question_count: 15,
    default_duration_min: 30,
    default_mock_question_count: 60,
    default_mock_duration_min: 120,
    difficulty_targets: { below: 0.2, at: 0.5, above: 0.3 },
    min_questions_per_chapter: 30,
  };

  // Mock test pattern state
  usePattern = false;
  pattern: MockTestPattern = {
    total_duration_min: 120,
    can_navigate_between_sections: true,
    sections: [],
  };
  readonly questionTypeOptions = ['MCQ', 'MSQ', 'True/False', 'Descriptive', 'Fill-in-the-Blanks', 'Matching', 'Sequence'];

  bloomLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  difficulties = [1, 2, 3, 4, 5];

  constructor(
    private adaptive: AdaptiveApiService,
    private toast: ToastService,
    private modal: ModalService
  ) {}

  ngOnInit(): void {
    this.rebuildChapterList();
    if (this.courseId) {
      this.loadQuestions();
      this.loadStats();
      this.loadConfig();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['course']) this.rebuildChapterList();
    if (changes['courseId'] && this.courseId) {
      this.loadQuestions();
      this.loadStats();
      this.loadConfig();
    }
  }

  private blankQuestion(): QuestionBankItem {
    return {
      type: 'MCQ',
      text: '',
      chapter_id: '',
      book_id: '',
      topic_tags: [],
      difficulty: 3,
      bloom_level: 'understand',
      estimated_time_seconds: 90,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      correctAnswer: '',
      explanation: '',
    };
  }

  private rebuildChapterList(): void {
    const list: ChapterOption[] = [];
    (this.course?.subjects || []).forEach((s: any) => {
      (s.chapters || []).forEach((c: any) => {
        if (c.id) list.push({ id: c.id, name: c.name || 'Untitled', book_id: s.id, book_name: s.name || 'Subject' });
      });
    });
    this.chapters = list;
  }

  selectTab(t: TabKey): void {
    this.tab = t;
    if (t === 'ai' && !this.pending) this.loadPendingReview();
    if (t === 'browse' && !this.questions.length) this.loadQuestions();
  }

  // ---------- Browse ----------
  loadQuestions(): void {
    if (!this.courseId) return;
    this.loading = true;
    this.adaptive.listQuestions(this.courseId, this.filters).subscribe({
      next: (res) => {
        this.questions = res.questions || [];
        this.totalQuestions = res.total || 0;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error('Failed to load questions: ' + (err?.message || ''));
      },
    });
  }

  loadStats(): void {
    if (!this.courseId) return;
    this.adaptive.getStats(this.courseId).subscribe({
      next: (res) => (this.stats = res),
      error: () => {},
    });
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadQuestions();
  }

  clearFilters(): void {
    this.filters = { chapter_id: '', book_id: '', difficulty: null, bloom_level: '', topic: '', page: 1, limit: 25 };
    this.loadQuestions();
  }

  nextPage(): void {
    if (this.filters.page * this.filters.limit < this.totalQuestions) {
      this.filters.page += 1;
      this.loadQuestions();
    }
  }

  prevPage(): void {
    if (this.filters.page > 1) {
      this.filters.page -= 1;
      this.loadQuestions();
    }
  }

  startEdit(q: QuestionBankItem): void {
    const copy = JSON.parse(JSON.stringify(q));
    if (!copy._id && copy.id) copy._id = copy.id;
    this.editingQuestion = copy;
  }

  cancelEdit(): void {
    this.editingQuestion = null;
  }

  saveEdit(): void {
    if (!this.editingQuestion) return;
    const id = this.qid(this.editingQuestion);
    if (!id) return;
    const { _id, id: _id2, ...patch } = this.editingQuestion as any;
    this.adaptive.updateQuestion(this.courseId, id, patch).subscribe({
      next: () => {
        this.toast.success('Question updated');
        this.editingQuestion = null;
        this.loadQuestions();
      },
      error: (err) => this.toast.error('Update failed: ' + (err?.message || '')),
    });
  }

  deleteQuestion(q: QuestionBankItem): void {
    const id = this.qid(q);
    if (!id) return;
    this.modal.confirm('Delete this question? (soft-delete; can be restored by support)').then((ok) => {
      if (!ok) return;
      this.adaptive.deleteQuestion(this.courseId, id).subscribe({
        next: () => {
          this.toast.success('Question deleted');
          this.loadQuestions();
        },
        error: (err) => this.toast.error('Delete failed: ' + (err?.message || '')),
      });
    });
  }

  startAdd(): void {
    this.addingQuestion = true;
    this.newQuestion = this.blankQuestion();
  }

  cancelAdd(): void {
    this.addingQuestion = false;
  }

  saveAdd(): void {
    if (!this.newQuestion.text || !this.newQuestion.chapter_id) {
      this.toast.error('Question text and chapter are required');
      return;
    }
    if (this.newQuestion.correctAnswer && this.newQuestion.options) {
      this.newQuestion.options.forEach((o) => (o.isCorrect = o.text === this.newQuestion.correctAnswer));
    }
    const chapter = this.chapters.find((c) => c.id === this.newQuestion.chapter_id);
    if (chapter) this.newQuestion.book_id = chapter.book_id;

    this.adaptive.addQuestion(this.courseId, this.newQuestion).subscribe({
      next: () => {
        this.toast.success('Question added');
        this.addingQuestion = false;
        this.loadQuestions();
        this.loadStats();
      },
      error: (err) => this.toast.error('Add failed: ' + (err?.message || '')),
    });
  }

  // ---------- AI generation & review ----------
  toggleAiChapter(id: string): void {
    const i = this.aiRequest.chapter_ids.indexOf(id);
    if (i >= 0) this.aiRequest.chapter_ids.splice(i, 1);
    else this.aiRequest.chapter_ids.push(id);
  }

  aiChapterSelected(id: string): boolean {
    return this.aiRequest.chapter_ids.includes(id);
  }

  generate(): void {
    if (!this.aiRequest.chapter_ids.length) {
      this.toast.error('Select at least one chapter');
      return;
    }
    this.generating = true;
    this.genProgress = 0;
    this.genErrors = [];
    this.genBatches = { completed: 0, total: 0 };
    this.adaptive
      .generateQuestions(this.courseId, {
        chapter_ids: this.aiRequest.chapter_ids,
        questions_per_chapter: this.aiRequest.questions_per_chapter,
        difficulty_distribution: this.aiRequest.distribution,
      })
      .subscribe({
        next: (res: any) => {
          this.genJobId = res.job_id;
          this.genBatches.total = res.total_batches ?? 0;
          this.startPolling();
        },
        error: (err) => {
          this.generating = false;
          this.toast.error('Failed to start generation: ' + (err?.message || ''));
        },
      });
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(2500)
      .pipe(
        switchMap(() => this.adaptive.getGenerationStatus(this.courseId, this.genJobId!)),
        takeWhile((s) => s.status === 'running', true)
      )
      .subscribe({
        next: (s) => {
          this.genProgress = s.progress_pct;
          this.genBatches = { completed: s.completed_batches, total: s.total_batches };
          this.genCount = s.generated_count;
          this.genErrors = s.errors;
          if (s.status !== 'running') {
            this.generating = false;
            this.pollSub?.unsubscribe();
            if (s.status === 'completed') {
              this.toast.success(`Generated ${s.generated_count} questions. Ready for review.`);
            } else {
              this.toast.error('Generation failed. See errors below.');
            }
            this.loadPendingReview();
            this.loadStats();
          }
        },
        error: () => {
          this.generating = false;
          this.toast.error('Lost connection while tracking generation progress.');
        },
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  loadPendingReview(): void {
    if (!this.courseId) return;
    this.adaptive.listPendingReview(this.courseId).subscribe({
      next: (res) => (this.pending = res),
      error: (err) => this.toast.error('Failed to load pending queue: ' + (err?.message || '')),
    });
  }

  reviewSingle(q: QuestionBankItem, action: 'approve' | 'reject'): void {
    const id = this.qid(q);
    if (!id) return;
    this.adaptive.reviewQuestion(this.courseId, id, action).subscribe({
      next: () => {
        this.toast.success(`Question ${action}d`);
        this.loadPendingReview();
        this.loadStats();
      },
      error: (err) => this.toast.error('Review failed: ' + (err?.message || '')),
    });
  }

  regenerate(q: QuestionBankItem): void {
    const id = this.qid(q);
    if (!id) return;
    this.adaptive.regenerateQuestion(this.courseId, id).subscribe({
      next: () => {
        this.toast.success('Question regenerated');
        this.loadPendingReview();
      },
      error: (err) => this.toast.error('Regenerate failed: ' + (err?.message || '')),
    });
  }

  bulkReviewChapter(chapterId: string, action: 'approve' | 'reject'): void {
    if (!this.pending) return;
    const group = this.pending.chapters.find((c) => c.chapter_id === chapterId);
    if (!group) return;
    const ids = group.questions.map((q) => this.qid(q)).filter(Boolean);
    if (!ids.length) return;
    const label = action === 'approve' ? 'Approve' : 'Reject';
    this.modal.confirm(`${label} all ${ids.length} pending questions in this chapter?`).then((ok) => {
      if (!ok) return;
      this.adaptive.bulkReviewQuestions(this.courseId, ids, action).subscribe({
        next: () => {
          this.toast.success(`${ids.length} questions ${action}d`);
          this.loadPendingReview();
          this.loadStats();
        },
        error: (err) => this.toast.error('Bulk action failed: ' + (err?.message || '')),
      });
    });
  }

  toggleSelected(q: QuestionBankItem): void {
    const id = this.qid(q);
    if (!id) return;
    this.selectedPending = { ...this.selectedPending, [id]: !this.selectedPending[id] };
  }

  get selectedCount(): number {
    return Object.values(this.selectedPending).filter(Boolean).length;
  }

  bulkReviewSelected(action: 'approve' | 'reject'): void {
    const ids = Object.keys(this.selectedPending).filter((k) => this.selectedPending[k]);
    if (!ids.length) return;
    this.modal.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} ${ids.length} selected questions?`).then((ok) => {
      if (!ok) return;
      this.adaptive.bulkReviewQuestions(this.courseId, ids, action).subscribe({
        next: () => {
          this.toast.success(`${ids.length} questions ${action}d`);
          this.selectedPending = {};
          this.loadPendingReview();
          this.loadStats();
        },
        error: (err) => this.toast.error('Bulk action failed: ' + (err?.message || '')),
      });
    });
  }

  // ---------- CSV ----------
  onCsvPicked(evt: Event): void {
    const files = (evt.target as HTMLInputElement).files;
    this.csvFile = files && files.length ? files[0] : null;
    this.csvResult = null;
  }

  csvDryRun(): void {
    if (!this.csvFile) return;
    this.csvUploading = true;
    this.adaptive.importCsv(this.courseId, this.csvFile, true).subscribe({
      next: (res) => {
        this.csvResult = res;
        this.csvUploading = false;
      },
      error: (err) => {
        this.csvUploading = false;
        this.toast.error('Validation failed: ' + (err?.message || ''));
      },
    });
  }

  csvImport(): void {
    if (!this.csvFile) return;
    this.csvUploading = true;
    this.adaptive.importCsv(this.courseId, this.csvFile, false).subscribe({
      next: (res) => {
        this.csvResult = res;
        this.csvUploading = false;
        this.toast.success(`Imported ${res.inserted_count} questions (${res.invalid_rows} skipped)`);
        this.loadQuestions();
        this.loadStats();
      },
      error: (err) => {
        this.csvUploading = false;
        this.toast.error('Import failed: ' + (err?.message || ''));
      },
    });
  }

  downloadCsvTemplate(): void {
    this.adaptive.getCsvTemplate(this.courseId).subscribe({
      next: (tpl) => {
        const headers = [...tpl.required_columns, ...tpl.optional_columns];
        const example = headers.map((h) => `"${(tpl.example_row[h] || '').toString().replace(/"/g, '""')}"`).join(',');
        const csv = headers.join(',') + '\n' + example + '\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_bank_template.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Failed to fetch template'),
    });
  }

  downloadErrorReport(): void {
    if (!this.csvResult) return;
    const rows = this.csvResult.rows.filter((r) => !r.ok);
    const csv = 'row,errors\n' + rows.map((r) => `${r.row},"${r.errors.join(' | ')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Config ----------
  loadConfig(): void {
    if (!this.courseId) return;
    this.adaptive.getAdaptiveConfig(this.courseId).subscribe({
      next: (res) => {
        this.config = res.adaptive_config;
        if (res.adaptive_config.mock_test_pattern) {
          this.usePattern = true;
          this.pattern = JSON.parse(JSON.stringify(res.adaptive_config.mock_test_pattern));
        } else {
          this.usePattern = false;
          this.pattern = { total_duration_min: 120, can_navigate_between_sections: true, sections: [] };
        }
      },
      error: () => {},
    });
  }

  saveConfig(): void {
    const patch: any = { ...this.config };
    if (this.usePattern) {
      if (!this.pattern.sections.length) {
        this.toast.error('Add at least one section to the mock test pattern');
        return;
      }
      for (const sec of this.pattern.sections) {
        if (!sec.name.trim()) { this.toast.error('Each section must have a name'); return; }
        if (!sec.chapter_ids.length) { this.toast.error(`Section "${sec.name}" needs at least one chapter`); return; }
        if (sec.question_count < 1) { this.toast.error(`Section "${sec.name}" must have at least 1 question`); return; }
      }
      patch.mock_test_pattern = this.pattern;
      patch.clear_mock_test_pattern = false;
    } else {
      patch.clear_mock_test_pattern = true;
    }
    this.adaptive.updateAdaptiveConfig(this.courseId, patch).subscribe({
      next: () => this.toast.success('Adaptive config saved'),
      error: (err) => this.toast.error('Save failed: ' + (err?.message || '')),
    });
  }

  // ---------- Pattern section helpers ----------
  addPatternSection(): void {
    this.pattern.sections.push({
      name: '',
      chapter_ids: [],
      question_count: 0,
      type_counts: { MCQ: 10, MSQ: 5, 'True/False': 5 },
      passage_config: null,
      marks_pos: 1,
      marks_neg: 0,
      time_limit_min: 0,
    });
  }

  removePatternSection(i: number): void {
    this.pattern.sections.splice(i, 1);
  }

  togglePatternChapter(sec: MockTestPatternSection, chapterId: string): void {
    const idx = sec.chapter_ids.indexOf(chapterId);
    if (idx >= 0) sec.chapter_ids.splice(idx, 1);
    else sec.chapter_ids.push(chapterId);
  }

  isPatternChapterSelected(sec: MockTestPatternSection, chapterId: string): boolean {
    return sec.chapter_ids.includes(chapterId);
  }

  readonly renderableTypes = ['MCQ', 'MSQ', 'True/False', 'Descriptive', 'Fill-in-the-Blanks'];
  readonly allQuestionTypes = ['MCQ', 'MSQ', 'True/False', 'Descriptive', 'Fill-in-the-Blanks', 'Matching', 'Sequence'];

  getTypeCount(sec: MockTestPatternSection, type: string): number {
    return (sec.type_counts ?? {})[type] ?? 0;
  }

  setTypeCount(sec: MockTestPatternSection, type: string, count: number): void {
    if (!sec.type_counts) sec.type_counts = {};
    const n = Number(count) || 0;
    if (n <= 0) delete sec.type_counts[type];
    else sec.type_counts[type] = n;
  }

  sectionTotal(sec: MockTestPatternSection): number {
    const typesTotal = Object.values(sec.type_counts ?? {}).reduce((a, b) => a + b, 0);
    const passageTotal = sec.passage_config ? sec.passage_config.questions_per_passage : 0;
    return typesTotal + passageTotal;
  }

  togglePassageConfig(sec: MockTestPatternSection): void {
    if (sec.passage_config) sec.passage_config = null;
    else sec.passage_config = { questions_per_passage: 4, passage_ids: null };
  }

  patternTotalQuestions(): number {
    return this.pattern.sections.reduce((s, sec) => s + this.sectionTotal(sec), 0);
  }

  qid(q: QuestionBankItem): string {
    return (q._id || q.id || '') as string;
  }

  // ---------- Helpers ----------
  pValueBadge(p: number | null | undefined): string {
    if (p == null) return 'bg-gray-200 text-gray-600';
    if (p > 0.9) return 'bg-blue-100 text-blue-700';
    if (p > 0.7) return 'bg-green-100 text-green-700';
    if (p > 0.4) return 'bg-emerald-100 text-emerald-700';
    if (p > 0.2) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  }

  chapterName(id?: string): string {
    return this.chapters.find((c) => c.id === id)?.name || '—';
  }

  trackByQid = (_: number, q: QuestionBankItem) => q._id || q.text;
}
