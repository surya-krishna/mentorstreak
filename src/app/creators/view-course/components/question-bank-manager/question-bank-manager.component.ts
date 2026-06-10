import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, of, Subscription } from 'rxjs';
import { map, switchMap, takeWhile } from 'rxjs/operators';
import { AdaptiveApiService, QuestionBankItem, QuestionStats, CsvImportResult, PendingReviewResponse, MockTestPatternSection, MockTestPattern, ExampleLibraryItem, PassageBankItem } from '../../../adaptive-api.service';
import { ApiService } from '../../../../api-service';
import { ToastService } from '../../../../toast.service';
import { ModalService } from '../../../../modal.service';
import { LatexTextComponent } from '../../../../shared/components/latex-text/latex-text.component';

type TabKey = 'browse' | 'ai' | 'csv' | 'raw' | 'config';

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
  // Link-passage UI state for the edit modal (questions without an existing passage_id)
  linkPassage = false;
  passageOptions: PassageBankItem[] = [];
  passageOptionsLoading = false;
  passageSearch = '';
  showPassageOptions = false;
  selectedPassage: PassageBankItem | null = null;
  newPassageImages: string[] = [];
  uploadingPassageImage = false;
  addingQuestion = false;
  newQuestion: QuestionBankItem = this.blankQuestion();

  // AI tab
  aiRequest = {
    chapter_ids: [] as string[],
    questions_per_chapter: 20,
    distribution: { easy: 6, medium: 8, hard: 6 },
    passage_groups: 0,
    questions_per_passage: 4,
    // Example-driven fields
    style_instruction: '',
    use_example_library: false,
    target_count: 30,
    outputs_per_example: 3,
    examples_per_batch: 3,
  };
  generating = false;
  genJobId: string | null = null;
  genProgress = 0;
  genBatches = { completed: 0, total: 0 };
  genCount = 0;
  genErrors: string[] = [];
  private pollSub?: Subscription;
  pending: PendingReviewResponse | null = null;
  passagePopup: { text: string; passageId?: string } | null = null;
  passageImageZoom: string | null = null;
  selectedPending: Record<string, boolean> = {};

  // Example library
  exampleLibrary: ExampleLibraryItem[] = [];
  exampleLibraryTotal = 0;
  exampleLibraryLoading = false;
  exampleContentType: 'passage' | 'question' = 'passage';
  newExampleText = '';
  addingExample = false;

  // Raw text import tab
  rawText = '';
  rawChapterId = '';
  rawMode: 'exact' | 'modify' = 'exact';
  rawParsing = false;
  rawWarnings: string[] = [];
  rawInsertedCount = 0;

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
    private api: ApiService,
    private toast: ToastService,
    private modal: ModalService
  ) {}

  getImageUrl(path: string | null | undefined): string {
    if (!path) return '';
    return `${this.api.getBaseUrl()}/master/v2/files?filePath=${encodeURIComponent(this.courseId + '/' + path)}`;
    
  }

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
    if (t === 'ai') {
      if (!this.pending) this.loadPendingReview();
      this.loadExampleLibrary();
    }
    if (t === 'raw') {
      this.loadPendingReview();
    }
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
    this.linkPassage = !!copy.passage_id;
    this.selectedPassage = null;
    this.passageSearch = '';
    this.showPassageOptions = false;
    this.passageOptions = [];
    this.newPassageImages = [];
  }

  cancelEdit(): void {
    this.editingQuestion = null;
    this.linkPassage = false;
    this.selectedPassage = null;
    this.passageSearch = '';
    this.showPassageOptions = false;
    this.passageOptions = [];
    this.newPassageImages = [];
  }

  // ---------- Passage images ----------
  uploadLinkedPassageImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.editingQuestion) return;
    this.uploadingPassageImage = true;
    this.adaptive.uploadQuestionImage(this.courseId, file).subscribe({
      next: (res) => {
        this.editingQuestion!.passage_images = [...(this.editingQuestion!.passage_images || []), res.path];
        this.uploadingPassageImage = false;
        this.toast.success('Image uploaded');
      },
      error: () => {
        this.uploadingPassageImage = false;
        this.toast.error('Image upload failed');
      },
    });
  }

  removeLinkedPassageImage(index: number): void {
    if (!this.editingQuestion?.passage_images) return;
    this.editingQuestion.passage_images = this.editingQuestion.passage_images.filter((_, i) => i !== index);
  }

  uploadNewPassageImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingPassageImage = true;
    this.adaptive.uploadQuestionImage(this.courseId, file).subscribe({
      next: (res) => {
        this.newPassageImages = [...this.newPassageImages, res.path];
        this.uploadingPassageImage = false;
        this.toast.success('Image uploaded');
      },
      error: () => {
        this.uploadingPassageImage = false;
        this.toast.error('Image upload failed');
      },
    });
  }

  removeNewPassageImage(index: number): void {
    this.newPassageImages = this.newPassageImages.filter((_, i) => i !== index);
  }

  // ---------- Link passage (edit modal) ----------
  onLinkPassageToggle(checked: boolean): void {
    this.linkPassage = checked;
    if (checked) this.loadPassageOptions();
  }

  loadPassageOptions(): void {
    const chapterId = this.editingQuestion?.chapter_id;
    if (!chapterId) return;
    this.passageOptionsLoading = true;
    this.adaptive.listPassages(this.courseId, chapterId, 1, 100).subscribe({
      next: (res) => {
        this.passageOptions = res.items || [];
        this.passageOptionsLoading = false;
      },
      error: () => { this.passageOptionsLoading = false; },
    });
  }

  get filteredPassageOptions(): PassageBankItem[] {
    const term = this.passageSearch.trim().toLowerCase();
    if (!term) return this.passageOptions;
    return this.passageOptions.filter((p) =>
      (p.title || '').toLowerCase().includes(term) || (p.text || '').toLowerCase().includes(term)
    );
  }

  passageLabel(p: PassageBankItem): string {
    const snippet = (p.text || '').slice(0, 80);
    return p.title ? `${p.title} — ${snippet}` : snippet;
  }

  selectPassageOption(p: PassageBankItem): void {
    this.selectedPassage = p;
    this.passageSearch = this.passageLabel(p);
    this.showPassageOptions = false;
  }

  onPassageSearchChange(value: string): void {
    this.passageSearch = value;
    this.selectedPassage = null;
    this.showPassageOptions = true;
  }

  private resolvePassageLink() {
    if (!this.linkPassage) return of(null as string | null);
    if (this.selectedPassage) return of(this.qid(this.selectedPassage as any) || null);
    const text = this.passageSearch.trim();
    if (!text) return of(null as string | null);
    // No existing passage matched — create a new one in the passage bank and link it
    return this.adaptive.createPassage(this.courseId, {
      text,
      chapter_id: this.editingQuestion!.chapter_id!,
      difficulty: this.editingQuestion!.difficulty ?? 3,
      images: this.newPassageImages,
    }).pipe(map((res) => res.id));
  }

  showPassage(q: QuestionBankItem): void {
    if (!q.passage_text) return;
    this.passagePopup = { text: q.passage_text, passageId: q.passage_id ?? undefined };
  }

  closePassage(): void {
    this.passagePopup = null;
  }

  openImageZoom(url: string): void { this.passageImageZoom = url; }
  closeImageZoom(): void { this.passageImageZoom = null; }

  onEditChapterChange(chapterId: string): void {
    if (!this.editingQuestion) return;
    const chapter = this.chapters.find((c) => c.id === chapterId);
    if (chapter) this.editingQuestion.book_id = chapter.book_id;
    this.selectedPassage = null;
    this.passageSearch = '';
    if (this.linkPassage) this.loadPassageOptions();
  }

  onTopicTagsChange(value: string): void {
    if (this.editingQuestion) {
      this.editingQuestion.topic_tags = value.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  markCorrect(index: number): void {
    if (!this.editingQuestion?.options) return;
    this.editingQuestion.options.forEach((o, i) => (o.isCorrect = i === index));
    this.editingQuestion.correctAnswer = this.editingQuestion.options[index]?.text ?? '';
  }

  uploadEditQuestionImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.editingQuestion) return;
    this.adaptive.uploadQuestionImage(this.courseId, file).subscribe({
      next: (res) => {
        this.editingQuestion!.image = res.path;
        this.toast.success('Image uploaded');
      },
      error: () => this.toast.error('Image upload failed'),
    });
  }

  saveEdit(): void {
    if (!this.editingQuestion) return;
    const id = this.qid(this.editingQuestion);
    if (!id) return;
    // Sync correctAnswer from whichever option is marked isCorrect
    const correct = this.editingQuestion.options?.find((o) => o.isCorrect);
    if (correct) this.editingQuestion.correctAnswer = correct.text;

    const wasLinked = !!this.editingQuestion.passage_id;

    this.resolvePassageLink().subscribe({
      next: (passageId) => {
        const { _id, id: _id2, ...patch } = this.editingQuestion as any;
        if (wasLinked) {
          // passage_text is canonical in passage_bank; don't write the denormalized copy back to question_bank
          delete patch.passage_text;
        } else if (this.linkPassage) {
          patch.passage_id = passageId;
          delete patch.passage_text;
        } else {
          patch.passage_id = null;
          patch.passage_text = null;
        }

        this.adaptive.updateQuestion(this.courseId, id, patch).subscribe({
          next: () => {
            // Sync passage_bank doc so adaptive test assembly uses updated text
            const eq = this.editingQuestion!;
            if (wasLinked && eq.passage_id && eq.passage_text && eq.chapter_id) {
              this.adaptive.updatePassage(this.courseId, eq.passage_id, {
                text: eq.passage_text,
                chapter_id: eq.chapter_id,
                difficulty: eq.difficulty ?? 3,
                images: eq.passage_images || [],
              }).subscribe({ error: () => {} }); // best-effort; question already saved
            }
            this.toast.success('Question updated');
            this.editingQuestion = null;
            this.loadQuestions();
            if (this.pending) this.loadPendingReview();
          },
          error: (err) => this.toast.error('Update failed: ' + (err?.message || '')),
        });
      },
      error: (err) => this.toast.error('Failed to link passage: ' + (err?.message || '')),
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
    const payload: any = {
      chapter_ids: this.aiRequest.chapter_ids,
      questions_per_chapter: this.aiRequest.questions_per_chapter,
      difficulty_distribution: this.aiRequest.distribution,
      passage_groups_per_chapter: this.aiRequest.passage_groups,
      questions_per_passage: this.aiRequest.questions_per_passage,
      style_instruction: this.aiRequest.style_instruction || undefined,
    };
    if (this.aiRequest.use_example_library) {
      payload.use_example_library = true;
      payload.target_count = this.aiRequest.target_count;
      payload.outputs_per_example = this.aiRequest.outputs_per_example;
      payload.examples_per_batch = this.aiRequest.examples_per_batch;
    }
    this.adaptive
      .generateQuestions(this.courseId, payload)
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

  // ---------- Example library ----------
  loadExampleLibrary(): void {
    this.exampleLibraryLoading = true;
    this.adaptive.listExamples(this.courseId, this.exampleContentType).subscribe({
      next: (res) => {
        this.exampleLibrary = res.items;
        this.exampleLibraryTotal = res.total;
        this.exampleLibraryLoading = false;
      },
      error: () => { this.exampleLibraryLoading = false; },
    });
  }

  addExample(): void {
    const text = this.newExampleText.trim();
    if (!text) return;
    this.adaptive.addExamples(this.courseId, this.exampleContentType, [text]).subscribe({
      next: () => {
        this.newExampleText = '';
        this.addingExample = false;
        this.loadExampleLibrary();
        this.toast.success('Example added');
      },
      error: (err) => this.toast.error('Failed to add example: ' + (err?.message || '')),
    });
  }

  deleteExample(id: string): void {
    this.adaptive.deleteExample(this.courseId, id).subscribe({
      next: () => {
        this.loadExampleLibrary();
        this.toast.success('Example removed');
      },
      error: (err) => this.toast.error('Failed to remove: ' + (err?.message || '')),
    });
  }

  clearExamples(): void {
    this.modal.confirm(`Remove all ${this.exampleLibraryTotal} examples from the library?`).then((ok) => {
      if (!ok) return;
      this.adaptive.clearExampleLibrary(this.courseId).subscribe({
        next: () => { this.exampleLibrary = []; this.exampleLibraryTotal = 0; this.toast.success('Library cleared'); },
        error: (err) => this.toast.error('Failed to clear: ' + (err?.message || '')),
      });
    });
  }

  onExampleContentTypeChange(): void {
    this.loadExampleLibrary();
    this.aiRequest.use_example_library = false;
  }

  addToExamples(q: QuestionBankItem): void {
    const text = q.text?.trim();
    if (!text) return;
    this.exampleContentType = 'question';
    this.newExampleText = text;
    this.addingExample = true;
  }

  generateFromExamples(): void {
    if (!this.aiRequest.chapter_ids.length) {
      this.toast.error('Select at least one chapter in the generation settings above');
      return;
    }
    this.exampleContentType = 'question';
    this.aiRequest.use_example_library = true;
    this.generate();
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

  // Group a chapter's pending questions by passage so RC sets can be reviewed together
  groupByPassage(questions: QuestionBankItem[]): { passage_id: string | null; passage_text?: string | null; passage_images?: string[] | null; questions: QuestionBankItem[] }[] {
    const groups: { passage_id: string | null; passage_text?: string | null; passage_images?: string[] | null; questions: QuestionBankItem[] }[] = [];
    const byPassage = new Map<string, { passage_id: string | null; passage_text?: string | null; passage_images?: string[] | null; questions: QuestionBankItem[] }>();
    for (const q of questions) {
      if (q.passage_id) {
        let g = byPassage.get(q.passage_id);
        if (!g) {
          g = { passage_id: q.passage_id, passage_text: q.passage_text, passage_images: q.passage_images, questions: [] };
          byPassage.set(q.passage_id, g);
          groups.push(g);
        }
        g.questions.push(q);
      } else {
        groups.push({ passage_id: null, questions: [q] });
      }
    }
    return groups;
  }

  reviewPassage(group: { passage_id: string | null; questions: QuestionBankItem[] }, action: 'approve' | 'reject'): void {
    const ids = group.questions.map((q) => this.qid(q)).filter(Boolean);
    if (!ids.length) return;
    this.adaptive.bulkReviewQuestions(this.courseId, ids, action).subscribe({
      next: () => {
        this.toast.success(`${ids.length} question${ids.length !== 1 ? 's' : ''} ${action}d`);
        this.loadPendingReview();
        this.loadStats();
      },
      error: (err) => this.toast.error('Review failed: ' + (err?.message || '')),
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

  // ---------- Raw text import ----------
  parseRawText(): void {
    if (!this.rawText.trim()) {
      this.toast.error('Paste some question text first');
      return;
    }
    this.rawParsing = true;
    this.rawWarnings = [];
    this.rawInsertedCount = 0;
    this.adaptive.parseRawText(this.courseId, {
      raw_text: this.rawText,
      chapter_id: this.rawChapterId || undefined,
      mode: this.rawMode,
    }).subscribe({
      next: (res) => {
        this.rawParsing = false;
        this.rawInsertedCount = res.inserted_count;
        this.rawWarnings = res.warnings || [];
        this.toast.success(`Parsed ${res.inserted_count} question${res.inserted_count !== 1 ? 's' : ''} — review below`);
        this.loadPendingReview();
        this.loadStats();
      },
      error: (err) => {
        this.rawParsing = false;
        this.toast.error('Parsing failed: ' + (err?.error?.detail || err?.message || 'Unknown error'));
      },
    });
  }

  uploadRawQuestionImage(q: QuestionBankItem, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.adaptive.uploadQuestionImage(this.courseId, file).subscribe({
      next: (res) => {
        q.image = res.path;
        const id = this.qid(q);
        if (id) {
          this.adaptive.updateQuestion(this.courseId, id, { image: res.path }).subscribe({ error: () => {} });
        }
        this.toast.success('Image uploaded');
      },
      error: () => this.toast.error('Image upload failed'),
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
        const toRow = (ex: Record<string, any>) =>
          headers.map((h: string) => `"${((ex[h] ?? '').toString().replace(/"/g, '""'))}"`).join(',');
        const exampleRows = Object.values(tpl.example_rows as Record<string, any>).map(toRow);
        const csv = headers.join(',') + '\n' + exampleRows.join('\n') + '\n';
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
