import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

type GamePhase = 'config' | 'playing' | 'results';
type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameConfig {
  duration: number;
  operations: OperationType[];
  difficulty: Difficulty;
}

interface Problem {
  operandA: number;
  operandB: number;
  operation: OperationType;
  answer: number;
  display: string;
}

interface GameResult {
  totalAnswered: number;
  correct: number;
  incorrect: number;
  duration: number;
  problemsPerMinute: number;
}

const DIFFICULTY_RANGES = {
  easy:   { add: [1, 20]   as [number,number], sub: { answer: [1, 20]    as [number,number], b: [1, 10]    as [number,number] }, mul: [2, 9]  as [number,number], div: { divisor: [2, 9]  as [number,number], quotient: [2, 9]  as [number,number] } },
  medium: { add: [10, 99]  as [number,number], sub: { answer: [10, 99]   as [number,number], b: [10, 50]   as [number,number] }, mul: [2, 12] as [number,number], div: { divisor: [2, 12] as [number,number], quotient: [2, 12] as [number,number] } },
  hard:   { add: [50, 999] as [number,number], sub: { answer: [100, 999] as [number,number], b: [50, 500]  as [number,number] }, mul: [12, 25] as [number,number], div: { divisor: [7, 25] as [number,number], quotient: [7, 25] as [number,number] } },
};

@Component({
  selector: 'app-math-sprint',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './math-sprint.component.html',
  styles: [`
    :host {
      --primary: #5f6fff;
      --accent: #00ff99;
      --cyan: #00d4ff;
      --background: #0a0a12;
      --surface1: #181a2a;
      --surface2: #23244a;
    }

    @keyframes pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }

    .animate-pop   { animation: pop 0.2s ease-out; }
    .animate-fade  { animation: fade-in 0.3s ease-out; }
    .animate-shake { animation: shake 0.3s ease-out; }

    .progress-bar {
      transition: width 1s linear, background-color 0.5s ease;
    }

    .answer-input::-webkit-outer-spin-button,
    .answer-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .answer-input { -moz-appearance: textfield; }

    .op-pill.active   { background: var(--accent); color: #0a0a12; }
    .op-pill.inactive { border: 1px solid var(--surface2); color: #94a3b8; }

    .dur-pill.active   { background: var(--primary); color: #fff; }
    .dur-pill.inactive { border: 1px solid var(--surface2); color: #94a3b8; }

    .diff-btn.easy-active   { background: #22c55e; color: #0a0a12; }
    .diff-btn.medium-active { background: var(--primary); color: #fff; }
    .diff-btn.hard-active   { background: #ef4444; color: #fff; }
    .diff-btn.inactive      { border: 1px solid var(--surface2); color: #94a3b8; }

    .feedback-correct { color: var(--accent); }
    .feedback-wrong   { color: #ef4444; }

    .stat-card {
      background: var(--surface2);
      border-radius: 12px;
      padding: 1rem;
      text-align: center;
    }
  `]
})
export class MathSprintComponent implements OnDestroy {
  @ViewChild('answerInput') answerInputRef!: ElementRef<HTMLInputElement>;

  phase: GamePhase = 'config';

  config: GameConfig = {
    duration: 60,
    operations: ['addition', 'multiplication'],
    difficulty: 'medium',
  };

  useCustomDuration = false;
  customDuration = 90;

  currentProblem!: Problem;
  userInput = '';
  score = 0;
  totalAnswered = 0;
  timeRemaining = 0;
  lastAnswerCorrect: boolean | null = null;
  result!: GameResult;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly durationOptions = [60, 120, 180];
  readonly operationOptions: { value: OperationType; label: string }[] = [
    { value: 'addition',       label: '+' },
    { value: 'subtraction',    label: '−' },
    { value: 'multiplication', label: '×' },
    { value: 'division',       label: '÷' },
  ];
  readonly difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard'];

  selectDuration(d: number) {
    this.config.duration = d;
    this.useCustomDuration = false;
  }

  enableCustomDuration() {
    this.useCustomDuration = true;
    this.config.duration = this.customDuration;
  }

  onCustomDurationChange() {
    this.config.duration = Math.max(10, Math.min(600, this.customDuration));
  }

  isOperationSelected(op: OperationType): boolean {
    return this.config.operations.includes(op);
  }

  toggleOperation(op: OperationType) {
    const idx = this.config.operations.indexOf(op);
    if (idx >= 0) {
      if (this.config.operations.length > 1) {
        this.config.operations.splice(idx, 1);
      }
    } else {
      this.config.operations.push(op);
    }
  }

  setDifficulty(d: Difficulty) {
    this.config.difficulty = d;
  }

  get canStart(): boolean {
    return this.config.operations.length > 0 && this.config.duration >= 10;
  }

  startGame() {
    this.score = 0;
    this.totalAnswered = 0;
    this.userInput = '';
    this.lastAnswerCorrect = null;
    this.timeRemaining = this.config.duration;
    this.generateNextProblem();
    this.phase = 'playing';
    this.startTimer();
    setTimeout(() => this.answerInputRef?.nativeElement.focus(), 50);
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) this.endGame();
    }, 1000);
  }

  endGame() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    const ppm = this.config.duration > 0
      ? parseFloat((this.score / (this.config.duration / 60)).toFixed(1))
      : 0;
    this.result = {
      totalAnswered: this.totalAnswered,
      correct: this.score,
      incorrect: this.totalAnswered - this.score,
      duration: this.config.duration,
      problemsPerMinute: ppm,
    };
    this.phase = 'results';
  }

  onSubmit() {
    const trimmed = this.userInput.trim();
    if (trimmed === '') return;
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) return;

    this.totalAnswered++;
    const correct = parsed === this.currentProblem.answer;
    if (correct) this.score++;
    this.lastAnswerCorrect = correct;
    this.userInput = '';
    this.generateNextProblem();

    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => { this.lastAnswerCorrect = null; }, 500);

    setTimeout(() => this.answerInputRef?.nativeElement.focus(), 0);
  }

  private generateNextProblem() {
    const ops = this.config.operations;
    const op = ops[Math.floor(Math.random() * ops.length)];
    this.currentProblem = this.buildProblem(op, this.config.difficulty);
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private buildProblem(op: OperationType, difficulty: Difficulty): Problem {
    const r = DIFFICULTY_RANGES[difficulty];
    let a: number, b: number, answer: number, display: string;

    switch (op) {
      case 'addition':
        a = this.randomInt(r.add[0], r.add[1]);
        b = this.randomInt(r.add[0], r.add[1]);
        answer = a + b;
        display = `${a} + ${b} = ?`;
        break;
      case 'subtraction':
        answer = this.randomInt(r.sub.answer[0], r.sub.answer[1]);
        b = this.randomInt(r.sub.b[0], r.sub.b[1]);
        a = answer + b;
        display = `${a} − ${b} = ?`;
        break;
      case 'multiplication':
        a = this.randomInt(r.mul[0], r.mul[1]);
        b = this.randomInt(r.mul[0], r.mul[1]);
        answer = a * b;
        display = `${a} × ${b} = ?`;
        break;
      case 'division':
      default:
        b = this.randomInt(r.div.divisor[0], r.div.divisor[1]);
        answer = this.randomInt(r.div.quotient[0], r.div.quotient[1]);
        a = b * answer;
        display = `${a} ÷ ${b} = ?`;
        break;
    }

    return { operandA: a, operandB: b, operation: op, answer, display };
  }

  get timerDisplay(): string {
    const t = Math.max(0, this.timeRemaining);
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get timerColor(): string {
    if (this.timeRemaining > 30) return '#00ff99';
    if (this.timeRemaining > 10) return '#f59e0b';
    return '#ef4444';
  }

  get timerPercent(): number {
    return (Math.max(0, this.timeRemaining) / this.config.duration) * 100;
  }

  get accuracyPercent(): number {
    if (this.result.totalAnswered === 0) return 0;
    return Math.round((this.result.correct / this.result.totalAnswered) * 100);
  }

  diffBtnClass(d: Difficulty): string {
    if (this.config.difficulty !== d) return 'diff-btn inactive';
    return `diff-btn ${d}-active`;
  }

  restartGame() {
    this.phase = 'config';
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
  }
}
