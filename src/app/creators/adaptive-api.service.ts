import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api-service';

export interface QuestionBankItem {
  _id?: string;
  id?: string;
  type: string;
  text: string;
  book_id?: string;
  chapter_id?: string;
  topic_tags?: string[];
  difficulty?: number;
  bloom_level?: string;
  estimated_time_seconds?: number;
  options?: { text: string; isCorrect: boolean }[];
  pairs?: { left: string; right: string }[];
  sequenceItems?: { text: string; order: number }[];
  correctAnswer?: string | null;
  explanation?: string | null;
  image?: string | null;
  source?: 'manual' | 'ai_generated' | 'csv';
  reviewed?: boolean;
  active?: boolean;
  times_served?: number;
  times_correct?: number;
  times_incorrect?: number;
  p_value?: number | null;
}

export interface QuestionListResponse {
  total: number;
  page: number;
  limit: number;
  questions: QuestionBankItem[];
}

export interface QuestionStats {
  course_id: string;
  total_questions: number;
  chapters: {
    chapter_id: string;
    chapter_name: string;
    total: number;
    difficulty_breakdown: Record<string, number>;
    sufficient: boolean;
  }[];
}

export interface MockTestPatternSection {
  name: string;
  chapter_ids: string[];
  question_count: number;
  marks_pos: number;
  marks_neg: number;
  time_limit_min: number;
  allowed_question_types?: string[];
  question_count_per_type?: Record<string, number>;
}

export interface MockTestPattern {
  total_duration_min: number;
  can_navigate_between_sections: boolean;
  sections: MockTestPatternSection[];
}

export interface AdaptiveConfig {
  default_question_count: number;
  default_duration_min: number;
  default_mock_question_count: number;
  default_mock_duration_min: number;
  difficulty_targets: { below: number; at: number; above: number };
  min_questions_per_chapter: number;
  mock_test_pattern?: MockTestPattern | null;
}

export interface GenerateRequest {
  chapter_ids: string[];
  questions_per_chapter: number;
  difficulty_distribution?: { easy: number; medium: number; hard: number };
}

export interface PendingReviewResponse {
  total_pending: number;
  shown: number;
  chapters: {
    chapter_id: string;
    chapter_name: string;
    questions: QuestionBankItem[];
  }[];
}

export interface CsvImportResult {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  dry_run: boolean;
  inserted_count: number;
  inserted_ids: string[];
  rows: { row: number; ok: boolean; errors: string[] }[];
}

export interface AdaptiveAnalytics {
  course_id: string;
  total_students: number;
  total_adaptive_attempts: number;
  total_questions: number;
  pending_review: number;
  avg_course_ability: number | null;
  weakest_chapter: any;
  chapters: any[];
  top_weak_topics: { topic: string; student_count: number }[];
  question_health: {
    distribution: Record<string, number>;
    flagged_questions: { question_id: string; p_value: number }[];
  };
}

export interface AdaptiveTestCreatePayload {
  title: string;
  instructions?: string;
  sections: MockTestPatternSection[];
  total_duration_min: number;
  can_navigate_between_sections?: boolean;
  hasNegativeMarking?: boolean;
  scoringFormula?: string;
  unattemptedMarks?: number;
  difficulty_targets?: { below: number; at: number; above: number };
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AdaptiveApiService {
  private qbBase(courseId: string) {
    return `/api/v2/courses/${courseId}/question-bank`;
  }

  constructor(private api: ApiService) {}

  // ---------- Question Bank CRUD ----------
  listQuestions(courseId: string, params: any): Observable<QuestionListResponse> {
    const cleaned: any = {};
    Object.keys(params || {}).forEach((k) => {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '') cleaned[k] = params[k];
    });
    return this.api.get<QuestionListResponse>(this.qbBase(courseId), cleaned);
  }

  getStats(courseId: string): Observable<QuestionStats> {
    return this.api.get<QuestionStats>(`${this.qbBase(courseId)}/stats`);
  }

  addQuestion(courseId: string, q: QuestionBankItem) {
    return this.api.post(this.qbBase(courseId), q);
  }

  addQuestionsBulk(courseId: string, questions: QuestionBankItem[]) {
    return this.api.post(`${this.qbBase(courseId)}/bulk`, questions);
  }

  updateQuestion(courseId: string, questionId: string, patch: Partial<QuestionBankItem>) {
    return this.api.put(`${this.qbBase(courseId)}/${questionId}`, patch);
  }

  deleteQuestion(courseId: string, questionId: string) {
    return this.api.delete(`${this.qbBase(courseId)}/${questionId}`);
  }

  // ---------- AI generation + review ----------
  generateQuestions(courseId: string, payload: GenerateRequest) {
    return this.api.post(`${this.qbBase(courseId)}/generate`, payload);
  }

  getGenerationStatus(courseId: string, jobId: string): Observable<{
    job_id: string;
    status: 'running' | 'completed' | 'failed';
    total_batches: number;
    completed_batches: number;
    generated_count: number;
    errors: string[];
    progress_pct: number;
  }> {
    return this.api.get(`${this.qbBase(courseId)}/generate/${jobId}/status`);
  }

  reviewQuestion(
    courseId: string,
    questionId: string,
    action: 'approve' | 'reject',
    opts?: { review_notes?: string; edits?: any }
  ) {
    return this.api.patch(`${this.qbBase(courseId)}/${questionId}/review`, {
      action,
      review_notes: opts?.review_notes,
      edits: opts?.edits,
    });
  }

  bulkReviewQuestions(courseId: string, ids: string[], action: 'approve' | 'reject', review_notes?: string) {
    return this.api.patch(`${this.qbBase(courseId)}/bulk-review`, { ids, action, review_notes });
  }

  regenerateQuestion(courseId: string, questionId: string) {
    return this.api.post(`${this.qbBase(courseId)}/${questionId}/regenerate`, {});
  }

  listPendingReview(courseId: string, chapterId?: string, limit = 100): Observable<PendingReviewResponse> {
    const params: any = { limit };
    if (chapterId) params.chapter_id = chapterId;
    return this.api.get<PendingReviewResponse>(`${this.qbBase(courseId)}/pending-review`, params);
  }

  // ---------- CSV ----------
  importCsv(courseId: string, file: File, dryRun = false): Observable<CsvImportResult> {
    const form = new FormData();
    form.append('file', file);
    const suffix = dryRun ? '?dry_run=true' : '?dry_run=false';
    return this.api.postMultipart<CsvImportResult>(
      `${this.qbBase(courseId)}/import-csv${suffix}`,
      form
    );
  }

  getCsvTemplate(courseId: string) {
    return this.api.get<any>(`${this.qbBase(courseId)}/csv-template`);
  }

  // ---------- Analytics ----------
  getCourseAnalytics(courseId: string): Observable<AdaptiveAnalytics> {
    return this.api.get<AdaptiveAnalytics>(`/api/v2/creator/courses/${courseId}/adaptive-analytics`);
  }

  getChapterAnalytics(courseId: string, chapterId: string) {
    return this.api.get<any>(`/api/v2/creator/courses/${courseId}/adaptive-analytics/chapters/${chapterId}`);
  }

  // ---------- Adaptive config + adaptive tests (creator-scoped) ----------
  getAdaptiveConfig(courseId: string): Observable<{ course_id: string; adaptive_config: AdaptiveConfig }> {
    return this.api.get(`/creator/v2/courses/${courseId}/adaptive-config`);
  }

  updateAdaptiveConfig(courseId: string, patch: Partial<AdaptiveConfig>) {
    return this.api.patch(`/creator/v2/courses/${courseId}/adaptive-config`, patch);
  }

  createAdaptiveTest(courseId: string, payload: AdaptiveTestCreatePayload) {
    return this.api.post(`/creator/v2/courses/${courseId}/adaptive-tests`, payload);
  }
}
