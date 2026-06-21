import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LatexTextComponent } from '../shared/components/latex-text/latex-text.component';
import { ApiService } from '../api-service';

interface PYQOption { text: string; isCorrect: boolean; }

interface PYQQuestion {
  id: string;
  text: string;
  type: string;
  options: PYQOption[] | null;
  is_tita: boolean;
  correctAnswer: string | null;
  explanation: string | null;
  image: string | null;
  chapter_name: string;
  difficulty: number | null;
  course_id: string;
}

interface PassageGroup {
  passage_id: string;
  passage_text: string | null;
  passage_title: string | null;
  passage_images: string[] | null;
  questions: PYQQuestion[];
}

interface Section {
  name: string;
  passage_groups: PassageGroup[];
  standalone_questions: PYQQuestion[];
}

interface Paper {
  year: number;
  slot: number;
  label: string;
  sections: Section[];
}

@Component({
  selector: 'app-pyq',
  standalone: true,
  imports: [CommonModule, FormsModule, LatexTextComponent],
  templateUrl: './pyq.component.html',
})
export class PyqComponent implements OnInit {
  papers: Paper[] = [];
  loading = true;
  error = '';

  availableYears: number[] = [];
  selectedYear = 0;
  availableSlots: number[] = [];
  selectedSlot = 0;

  expandedSections = new Set<string>();
  revealedAnswers = new Set<string>();
  disclaimerDismissed = false;

  currentPaper: Paper | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.disclaimerDismissed = localStorage.getItem('pyq_disclaimer_dismissed') === '1';
    this.api.get<{ papers: Paper[] }>('/pyq/cat').subscribe({
      next: (res) => {
        this.papers = res.papers || [];
        this.loading = false;
        if (this.papers.length) {
          this.availableYears = [...new Set(this.papers.map(p => p.year))].sort((a, b) => b - a);
          this.selectedYear = this.availableYears[0];
          this.updateSlots();
        }
      },
      error: () => {
        this.error = 'Failed to load past papers. Please try again later.';
        this.loading = false;
      }
    });
  }

  updateSlots(): void {
    this.availableSlots = this.papers
      .filter(p => p.year === this.selectedYear)
      .map(p => p.slot)
      .sort((a, b) => a - b);
    this.selectedSlot = this.availableSlots[0] || 1;
    this.updateCurrentPaper();
  }

  selectYear(year: number): void {
    this.selectedYear = year;
    this.expandedSections.clear();
    this.updateSlots();
  }

  selectSlot(slot: number): void {
    this.selectedSlot = slot;
    this.expandedSections.clear();
    this.updateCurrentPaper();
  }

  private updateCurrentPaper(): void {
    this.currentPaper = this.papers.find(
      p => p.year === this.selectedYear && p.slot === this.selectedSlot
    ) || null;
  }

  toggleSection(name: string): void {
    if (this.expandedSections.has(name)) {
      this.expandedSections.delete(name);
    } else {
      this.expandedSections.add(name);
    }
  }

  isSectionExpanded(name: string): boolean {
    return this.expandedSections.has(name);
  }

  toggleAnswer(questionId: string): void {
    if (this.revealedAnswers.has(questionId)) {
      this.revealedAnswers.delete(questionId);
    } else {
      this.revealedAnswers.add(questionId);
    }
  }

  isAnswerRevealed(questionId: string): boolean {
    return this.revealedAnswers.has(questionId);
  }

  dismissDisclaimer(): void {
    this.disclaimerDismissed = true;
    localStorage.setItem('pyq_disclaimer_dismissed', '1');
  }

  sectionQuestionCount(section: Section): number {
    let count = section.standalone_questions.length;
    for (const pg of section.passage_groups) {
      count += pg.questions.length;
    }
    return count;
  }

  getImageUrl(courseId: string, path: string | null): string {
    if (!path) return '';
    return `${this.api.getBaseUrl()}/master/v2/files?filePath=${encodeURIComponent(courseId + '/' + path)}`;
  }

  optionLabel(index: number): string {
    return ['A', 'B', 'C', 'D', 'E'][index] || '';
  }

  sectionDisplayName(name: string): string {
    switch (name) {
      case 'VARC': return 'Verbal Ability & Reading Comprehension';
      case 'DILR': return 'Data Interpretation & Logical Reasoning';
      case 'QA': return 'Quantitative Ability';
      default: return name;
    }
  }
}
