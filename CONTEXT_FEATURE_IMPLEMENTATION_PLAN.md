# Context Feature Implementation Plan - Dedicated "Passage" Question Type

## Overview
Create a dedicated **"Passage" question type** that makes context/passages **mandatory** and first-class citizens. This enables educators to:
- Create passage-based reading comprehension tests
- Define multiple passages per test
- Set multiple questions per passage
- Include passage-based questions in auto-generated tests
- Better organize and structure passage-dependent assessments

---

## 1. Problem Statement & Solution

### Current State
- Questions are created individually without shared context
- No dedicated structure for passage-based questions (Reading Comprehension, etc.)
- Cannot auto-generate passage-based tests with passage count and questions-per-passage configuration
- Passages would be duplicated across multiple questions if added as optional context

### Proposed Solution
- Add **"Passage"** as a new question type (alongside MCQ, MSQ, Descriptive, etc.)
- Make context/passage **mandatory** for Passage type
- Passages are stored as separate entities with multiple questions linked to them
- Support in auto-generate feature: specify number of passages and questions per passage
- Clean UI for managing passage-question relationships

---

## 2. Data Structure Changes

### New Data Model: Passage + Questions

```typescript
interface Passage {
  id?: string;              // Generated on creation
  passageId: string;        // Unique identifier within section
  content: string;          // The passage text (mandatory)
  sourceAttribution?: string; // Optional: book, article, author
  images?: string[];        // Optional: images related to passage
  createdAt?: string;
}

interface PassageQuestion {
  // Inherits all standard question fields
  type: 'Passage';          // Dedicated type
  text: string;             // The actual question
  passageId: string;        // Link to parent passage
  
  // Question-specific fields based on subtype
  questionSubType: 'MCQ' | 'MSQ' | 'True/False' | 'Descriptive' | 'Fill-in-the-Blanks';
  options?: any[];
  correctAnswer?: string;
  pairs?: any[];
  
  // Standard fields
  marksPos: number;
  marksNeg: number;
  explanation: string;
  image?: string | null;
  chapterId?: string | null;
}

interface Section {
  // ... existing fields ...
  passages?: Passage[];     // NEW: Passages in this section
  questions: Question[];    // Regular + Passage-based questions
}
```

### Question Type Array Update
```typescript
questionTypes = [
  'MCQ', 
  'MSQ', 
  'True/False', 
  'Descriptive', 
  'Fill-in-the-Blanks', 
  'Matching', 
  'Sequence',
  'Passage'  // NEW
];
```

### API Payload Example
```json
{
  "sections": [
    {
      "name": "Reading Comprehension",
      "passages": [
        {
          "passageId": "passage_1",
          "content": "In the early 19th century...",
          "sourceAttribution": "Historical Records, 1820"
        }
      ],
      "questions": [
        {
          "type": "Passage",
          "text": "What was the main theme?",
          "passageId": "passage_1",
          "questionSubType": "MCQ",
          "options": [
            { "text": "Option A", "isCorrect": true },
            { "text": "Option B", "isCorrect": false }
          ],
          "marksPos": 1,
          "marksNeg": 0,
          "explanation": "The passage clearly states..."
        },
        {
          "type": "Passage",
          "text": "What can be inferred?",
          "passageId": "passage_1",
          "questionSubType": "MCQ",
          "options": [...]
        }
      ]
    }
  ]
}
```

---

## 3. UI/UX Design

### 3.1 Passage Management in Section Editor

```
┌────────────────────────────────────────────────────────────┐
│ Section 1: Reading Comprehension                           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ PASSAGES IN THIS SECTION:                                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Passage 1 (ID: passage_1)                           │   │
│ │ "In the early 19th century, there was a..."         │   │
│ │                                     [Edit] [Delete] │   │
│ │                                                     │   │
│ │ Questions linked: 3                                 │   │
│ │ ├─ Q1: What was the main theme?                     │   │
│ │ ├─ Q2: Can you infer...?                            │   │
│ │ └─ Q3: According to the passage...?                 │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add Passage]                                             │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ QUESTIONS IN THIS SECTION:                                 │
│ (Regular questions + Passage-based questions)              │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Add/Edit Passage Modal

```
╔════════════════════════════════════════════════════════╗
║ Add Passage                                        [✕]  ║
╠════════════════════════════════════════════════════════╣
║                                                         ║
║ Passage Content (Required) *                          ║
║ ┌───────────────────────────────────────────────────┐ ║
║ │ In the early 19th century, the Industrial        │ ║
║ │ Revolution transformed society...                │ ║
║ │                                                   │ ║
║ │ [Multiline textarea - auto-expanding]           │ ║
║ └───────────────────────────────────────────────────┘ ║
║ Character count: 245/10000                            ║
║                                                         ║
║ Source Attribution (Optional)                         ║
║ ┌───────────────────────────────────────────────────┐ ║
║ │ Historical Records, 1820                          │ ║
║ └───────────────────────────────────────────────────┘ ║
║                                                         ║
║ Upload Related Images (Optional)                      ║
║ [+ Add Image] [Image 1] [Image 2]                     ║
║                                                         ║
╠════════════════════════════════════════════════════════╣
║ [Cancel]                                  [Save]      ║
╚════════════════════════════════════════════════════════╝
```

### 3.3 Creating Passage-Based Questions

```
PASSAGE-BASED QUESTION EDITOR:
┌──────────────────────────────────────────────────────┐
│ Question Type: [Passage ▼]                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Select Passage:                                      │
│ ○ Passage 1 (ID: passage_1)                         │
│   "In the early 19th century..."                    │
│   [View Full Passage]                               │
│                                                      │
│ Question Sub-Type: [MCQ ▼]                          │
│ (shows: MCQ, MSQ, True/False, Descriptive, Fill-in) │
│                                                      │
│ Question Text:                                       │
│ [textarea: "What was the main theme?"]              │
│                                                      │
│ [MCQ options / question-specific fields...]         │
│                                                      │
│ [Marks] [Chapter] [Explanation]                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3.4 Auto-Generate Test Configuration for Passages

```
SECTION CONFIGURATION (Auto-Generate):
┌─────────────────────────────────────────────────────┐
│ Section Name: Reading Comprehension                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Question Distribution:                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ MCQ        [ 8]                                 │ │
│ │ MSQ        [ 2]                                 │ │
│ │ Descriptive[ 0]                                 │ │
│ │ True/False [ 0]                                 │ │
│ │ Passage-MCQ       [ 5] ← NEW                    │ │
│ │ Passage-Descriptive[3] ← NEW                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ PASSAGE CONFIGURATION (if Passage types selected): │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Number of Passages:           [2]              │ │
│ │ Questions Per Passage:        [4]              │ │
│ │ (Auto-generates: 2 passages × 4 questions)     │ │
│ │                                                 │ │
│ │ Passage Sources:                                │ │
│ │ [×] Ancient History  [+]                        │ │
│ │ [×] Modern Literature [+]                       │ │
│ │ [ ] Science Articles                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Implementation Details

### 4.1 Component Changes (test-manager.component.ts)

**Add to component class:**
```typescript
// Passage Management
passages: any[] = [];  // Passages in current section
showPassageModal: boolean = false;
editingPassage: any = null;
editingPassageSectionIndex: number = -1;

// Passage-related methods
openPassageModal(sectionIndex: number, passage?: any): void
closePassageModal(): void
savePassage(): void
deletePassage(sectionIndex: number, passageId: string): void
addPassageQuestion(sectionIndex: number, passageId: string): void
selectPassageForQuestion(question: any): void
getPassagesInSection(sectionIndex: number): Passage[]

// Auto-generate passage support
createPassageTypeDistribution(): any
```

**Update question initialization:**
- When type='Passage' is selected, require passage selection
- Create passage questions with passageId link
- Initialize with question subtype (MCQ, MSQ, etc.)

### 4.2 Template Changes - Passage Manager Section

**Location:** Top of each section (before questions list)

```html
<!-- Passage Manager -->
<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
  <div class="flex items-center justify-between mb-3">
    <h4 class="font-semibold text-gray-700 flex items-center gap-2">
      <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V6a1 1 0 00-1-1h-3a1 1 0 000-2h2a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
      </svg>
      Passages in this Section
    </h4>
    <button (click)="openPassageModal(si)"
      class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Add Passage
    </button>
  </div>

  <!-- Passages List -->
  <div *ngIf="getPassagesInSection(si).length > 0" class="space-y-2">
    <div *ngFor="let passage of getPassagesInSection(si)" 
      class="bg-white p-3 rounded border border-blue-100 hover:border-blue-300 transition">
      
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h5 class="font-medium text-gray-700 text-sm">Passage {{passage.passageId}}</h5>
          <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{passage.content}}</p>
          <div *ngIf="passage.sourceAttribution" class="text-xs text-gray-500 mt-1">
            <strong>Source:</strong> {{passage.sourceAttribution}}
          </div>
        </div>
        
        <div class="flex gap-2 flex-shrink-0">
          <button (click)="openPassageModal(si, passage)"
            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
          <button (click)="deletePassage(si, passage.passageId)"
            class="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
        </div>
      </div>
      
      <!-- Questions linked to this passage -->
      <div class="mt-2 text-xs text-gray-500">
        <strong>Questions:</strong>
        <span *ngIf="getQuestionsForPassage(si, passage.passageId).length > 0" 
          class="text-blue-600">
          {{getQuestionsForPassage(si, passage.passageId).length}} question(s)
        </span>
        <span *ngIf="getQuestionsForPassage(si, passage.passageId).length === 0" 
          class="text-orange-600">
          No questions yet
        </span>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div *ngIf="getPassagesInSection(si).length === 0" 
    class="text-center text-xs text-gray-500 py-2">
    No passages added yet
  </div>
</div>
```

### 4.3 Question Editor - Passage Type Handling

**Insert after question type selection:**
```html
<!-- Passage Type: Require Passage Selection -->
<div *ngIf="q.type === 'Passage'" class="space-y-2 bg-blue-50 p-3 rounded border border-blue-100">
  
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      Select Passage <span class="text-red-600">*</span>
    </label>
    <select [(ngModel)]="q.passageId"
      class="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500">
      <option [value]="null">-- Select a Passage --</option>
      <option *ngFor="let p of getPassagesInSection(si)" [value]="p.passageId">
        {{p.passageId}} - {{p.content | slice:0:40}}...
      </option>
    </select>
    <div *ngIf="showManualErrors && !q.passageId" 
      class="text-xs text-red-600 mt-1">
      Passage is required for Passage-type questions
    </div>
  </div>

  <!-- Show selected passage preview -->
  <div *ngIf="q.passageId && getPassageById(si, q.passageId) as passage">
    <div class="bg-white p-2 rounded text-xs border-l-4 border-blue-600">
      <p class="font-medium text-gray-700 mb-1">Passage:</p>
      <p class="text-gray-600 line-clamp-3">{{passage.content}}</p>
      <div *ngIf="passage.sourceAttribution" class="text-gray-500 text-xs mt-1">
        {{passage.sourceAttribution}}
      </div>
    </div>
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      Question Sub-Type <span class="text-red-600">*</span>
    </label>
    <select [(ngModel)]="q.questionSubType"
      class="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500">
      <option value="MCQ">Multiple Choice</option>
      <option value="MSQ">Multiple Select</option>
      <option value="True/False">True/False</option>
      <option value="Descriptive">Descriptive</option>
      <option value="Fill-in-the-Blanks">Fill-in-the-Blanks</option>
    </select>
  </div>
</div>

<!-- For non-Passage types, show regular question type selector -->
<div *ngIf="q.type !== 'Passage'" class="flex gap-2">
  <select [(ngModel)]="q.type"
    class="w-32 rounded border border-gray-200 px-2 py-1 text-xs font-medium">
    <option *ngFor="let t of questionTypes.filter(t => t !== 'Passage')" [value]="t">{{t}}</option>
  </select>
  <!-- rest of regular question editor -->
</div>
```

### 4.4 Add Passage Modal

```html
<!-- Passage Modal -->
<div *ngIf="showPassageModal && editingPassageSectionIndex >= 0"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
  <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-semibold">
        {{editingPassage?.passageId ? 'Edit Passage' : 'Add New Passage'}}
      </h3>
      <button (click)="closePassageModal()" class="text-gray-500 hover:text-gray-700">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <div class="space-y-4">
      <!-- Passage Content (Required) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Passage Content <span class="text-red-600">*</span>
        </label>
        <textarea 
          [(ngModel)]="editingPassage.content" 
          rows="6"
          placeholder="Enter the passage text here..."
          class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        ></textarea>
        <div class="text-xs text-gray-500 mt-1">
          Character count: {{editingPassage.content?.length || 0}}/10000
        </div>
      </div>

      <!-- Source Attribution (Optional) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Source Attribution (Optional)
        </label>
        <input type="text" 
          [(ngModel)]="editingPassage.sourceAttribution"
          placeholder="e.g., 'Historical Records, 1820' or 'Science Today, 2025'"
          class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p class="text-xs text-gray-500 mt-1">
          Helps students understand the source of the passage
        </p>
      </div>

      <!-- Related Images (Optional) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Upload Related Images (Optional)
        </label>
        <button (click)="triggerPassageImageUpload()"
          class="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z">
            </path>
          </svg>
          + Add Image
        </button>
      </div>
    </div>

    <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
      <button (click)="closePassageModal()"
        class="px-4 py-2 rounded border text-gray-600 hover:bg-gray-50">
        Cancel
      </button>
      <button (click)="savePassage()"
        class="px-6 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
        {{editingPassage?.passageId ? 'Update' : 'Create'}} Passage
      </button>
    </div>
  </div>
</div>
```

### 4.5 TypeScript Methods for Passage Management

```typescript
// Passage Management Methods
openPassageModal(sectionIndex: number, passage?: any): void {
  if (sectionIndex < 0 || sectionIndex >= this.currentTest.sections.length) return;
  
  this.editingPassageSectionIndex = sectionIndex;
  if (passage) {
    this.editingPassage = { ...passage };
  } else {
    // Generate new passage ID
    const sectionPassages = this.getPassagesInSection(sectionIndex);
    const passageNum = sectionPassages.length + 1;
    this.editingPassage = {
      passageId: `passage_${passageNum}`,
      content: '',
      sourceAttribution: '',
      images: []
    };
  }
  this.showPassageModal = true;
}

closePassageModal(): void {
  this.showPassageModal = false;
  this.editingPassage = null;
  this.editingPassageSectionIndex = -1;
}

savePassage(): void {
  if (!this.editingPassage?.content?.trim()) {
    this.toast.error('Passage content is required');
    return;
  }
  
  if (this.editingPassageSectionIndex < 0) return;
  
  const section = this.currentTest.sections[this.editingPassageSectionIndex];
  if (!section.passages) section.passages = [];
  
  const existingIndex = section.passages.findIndex(
    p => p.passageId === this.editingPassage.passageId
  );
  
  if (existingIndex >= 0) {
    // Update
    section.passages[existingIndex] = { ...this.editingPassage };
  } else {
    // Create new
    section.passages.push({ ...this.editingPassage });
  }
  
  this.closePassageModal();
  this.toast.success('Passage saved');
}

deletePassage(sectionIndex: number, passageId: string): void {
  if (sectionIndex < 0) return;
  
  const section = this.currentTest.sections[sectionIndex];
  if (!section.passages) return;
  
  // Check if passage has questions
  const hasQuestions = section.questions.some(q => q.passageId === passageId);
  if (hasQuestions) {
    this.modal.confirm(
      'This passage has questions linked to it. Delete them first?'
    ).then(confirmed => {
      if (confirmed) {
        // Remove all questions for this passage
        section.questions = section.questions.filter(q => q.passageId !== passageId);
        // Remove passage
        section.passages = section.passages.filter(p => p.passageId !== passageId);
        this.toast.success('Passage and related questions deleted');
      }
    });
  } else {
    section.passages = section.passages.filter(p => p.passageId !== passageId);
    this.toast.success('Passage deleted');
  }
}

getPassagesInSection(sectionIndex: number): any[] {
  if (!this.currentTest?.sections?.[sectionIndex]) return [];
  return this.currentTest.sections[sectionIndex].passages || [];
}

getPassageById(sectionIndex: number, passageId: string): any {
  return this.getPassagesInSection(sectionIndex).find(p => p.passageId === passageId);
}

getQuestionsForPassage(sectionIndex: number, passageId: string): any[] {
  if (!this.currentTest?.sections?.[sectionIndex]) return [];
  return this.currentTest.sections[sectionIndex].questions.filter(
    q => q.passageId === passageId
  );
}

addPassageQuestion(sectionIndex: number, passageId: string): void {
  if (!this.currentTest?.sections?.[sectionIndex]) return;
  
  const section = this.currentTest.sections[sectionIndex];
  const question: any = {
    type: 'Passage',
    passageId: passageId,
    questionSubType: 'MCQ',
    text: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    marksPos: section.useUniformMarking ? section.uniformMarksPos : 1,
    marksNeg: section.useUniformMarking ? section.uniformMarksNeg : 0,
    explanation: '',
    image: null,
    chapterId: null
  };
  section.questions.push(question);
}
```

### 4.6 Auto-Generate Support for Passages

**Update auto-generate configuration:**

```typescript
interface AutoGenPassageConfig {
  numPassages: number;              // e.g., 2 passages
  questionsPerPassage: number;      // e.g., 4 questions per passage
  passageSourceTopics: string[];    // e.g., ['History', 'Literature']
  passageSubTypes: {                // Distribution of question types within passages
    'MCQ': number;
    'MSQ': number;
    'Descriptive': number;
    'True/False': number;
  }
}
```

**Auto-generate section configuration would include:**
```html
<!-- In auto-generate modal, within section config -->
<div *ngIf="sec.typeDistribution['Passage'] && sec.typeDistribution['Passage'] > 0"
  class="border-t pt-4 mt-4">
  <h5 class="font-medium text-gray-700 mb-3">Passage Configuration</h5>
  
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">
        Number of Passages
      </label>
      <input type="number" [(ngModel)]="sec.numPassages" min="1" 
        class="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500">
    </div>
    
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">
        Questions Per Passage
      </label>
      <input type="number" [(ngModel)]="sec.questionsPerPassage" min="1"
        class="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500">
    </div>
  </div>
  
  <p class="text-xs text-gray-500 mt-2">
    Will generate: {{sec.numPassages}} passages × {{sec.questionsPerPassage}} questions 
    = {{sec.numPassages * sec.questionsPerPassage}} passage-based questions
  </p>
</div>
```

### 4.5 Question Initialization

**Update addQuestion() method:**
```typescript
addQuestion(sectionIndex: number) {
  if (!this.currentTest) return;
  const section = this.currentTest.sections[sectionIndex];
  
  let defaultChapterId: any = null;
  if (this.currentTest.type === 'CHAPTER' && this.currentTest.chapterId) {
    defaultChapterId = this.currentTest.chapterId;
  }
  
  const question: any = {
    type: 'MCQ',
    text: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    marksPos: section.useUniformMarking ? section.uniformMarksPos : 1,
    marksNeg: section.useUniformMarking ? section.uniformMarksNeg : 0,
    pairs: [{ left: '', right: '' }],
    sequenceItems: [{ text: '', order: 1 }],
    blanks: [],
    correctAnswer: '',
    explanation: '',
    image: null,
    chapterId: defaultChapterId,
    // NEW FIELDS
    hasContext: false,
    context: '',
    contextType: 'passage'
  };
  section.questions.push(question);
}
```

---

## 5. Backend API Changes

### 5.1 Database Schema Update

**Add Passage collection/table:**
```javascript
{
  passageId: String,           // Unique within section
  sectionId: String,           // Reference to section
  testId: String,              // Reference to test
  content: String,             // Passage text (max 10000 chars)
  sourceAttribution: String,   // Optional source info
  images: [String],            // Array of image URLs
  createdAt: Date,
  updatedAt: Date
}
```

**Update Question schema to include:**
```javascript
{
  // ... existing fields ...
  type: String,  // Now includes 'Passage' as option
  passageId: String,           // Link to parent passage (for type='Passage')
  questionSubType: String,     // For Passage questions: 'MCQ', 'MSQ', etc.
  content: String              // Passage text will be joined from linked Passage
}
```

### 5.2 API Validation Rules
- Passage content required (not empty, max 10000 chars)
- PassageId must be unique within a section
- Passage type questions must have passageId reference
- Cannot delete passage if questions reference it
- sourceAttribution is optional

### 5.3 Backend Processing
- Auto-generate API to create passages based on numPassages & questionsPerPassage
- Flatten/join passage data with questions in responses for frontend display
- Validate passage references when saving test

---

## 6. Advantages of Passage Question Type

### ✅ **Dedicated Structure**
- Passages are first-class entities, not optional context
- Clear relationship between passages and questions
- Easy to query all passages in a test

### ✅ **Reusability**
- One passage can have 3-10+ questions
- No duplication of passage content
- Easy to add/remove questions from passage

### ✅ **Auto-Generate Support**
- Specify number of passages
- Specify questions per passage
- Intelligent distribution of question types

### ✅ **Organized UI**
- Passage manager in each section
- Clear visual separation from regular questions
- Group questions by passage visually (future enhancement)

### ✅ **Analytics Ready**
- Track passage difficulty
- Analyze passage performance
- Generate passage-specific reports

### ✅ **Scalability**
- Handles 1-100+ passages per test
- Supports large passages (up to 10K chars)
- Efficient querying

---

## 7. Implementation Phases

### Phase 1: Core Passage Type Implementation
- [ ] Add 'Passage' to questionTypes array
- [ ] Create Passage data model
- [ ] Add passage manager section UI
- [ ] Add/Edit/Delete passage modals
- [ ] Link questions to passages
- [ ] Store passage data in sections

### Phase 2: Passage-Based Question Creation
- [ ] Update question editor for Passage type
- [ ] Require passage selection for Passage questions
- [ ] Display passage preview in question editor
- [ ] Support passage question subtypes (MCQ, MSQ, etc.)
- [ ] Update question initialization

### Phase 3: Auto-Generate Integration
- [ ] Add passage-type to question distribution
- [ ] Add numPassages & questionsPerPassage config
- [ ] Implement passage generation logic
- [ ] Auto-create passage questions with distribution

### Phase 4: Polish & Testing
- [ ] Validation for passage fields
- [ ] Error handling
- [ ] Mobile responsiveness
- [ ] Accessibility improvements
- [ ] End-to-end testing

---

## 8. Validation Rules & Business Logic

### Question Creation Constraints
- **Passage Type**: Must select at least one passage
- **Passage Type**: Must specify questionSubType
- **Regular Types**: Should not have passageId

### Passage Management Constraints
- **Passage Content**: Required, 1-10000 characters
- **Source Attribution**: Optional, helpful for citations
- **Deletion**: Cannot delete passage if questions reference it
- **Editing**: Can edit passage and all linked questions update

### Auto-Generate Constraints
- **Number of Passages**: 1-10 per section
- **Questions Per Passage**: 1-5 per passage
- **Type Distribution**: Can mix passage and regular question types
- **Total Questions**: Passage questions count toward total

---

## 9. Testing Checklist

### Manual Testing
- [ ] Add passage via modal
- [ ] Edit passage content and attribution
- [ ] Delete passage (with/without questions)
- [ ] Create passage-based question
- [ ] Link multiple questions to same passage
- [ ] Preview passage in question editor
- [ ] Save test with passage questions
- [ ] Load test and verify passages display correctly
- [ ] Edit passage and verify changes persist
- [ ] Auto-generate test with passage configuration
- [ ] Verify passage distribution in auto-generated test

### Validation Testing
- [ ] Cannot create question without passage (for Passage type)
- [ ] Cannot delete passage with questions
- [ ] Passage content character limit enforced
- [ ] PassageId must be unique per section
- [ ] Regular questions don't have passageId

### UI/UX Testing
- [ ] Passage manager section visible and intuitive
- [ ] Modal works smoothly (open/close/save)
- [ ] Passage preview displays in question editor
- [ ] Question count displays for each passage
- [ ] Mobile responsiveness

---

## 10. Future Enhancements

1. **Passage Grouping**: Visually group questions by passage
2. **Passage Library**: Reusable passages across tests
3. **Passage Metadata**: Difficulty level, topic tags
4. **Rich Text Passages**: Formatting support (bold, italic, lists)
5. **Passage Versioning**: Track changes to passages
6. **Passage Analytics**: Performance metrics per passage
7. **Bulk Import**: Upload passages from files/documents
8. **Passage Search**: Search passages across course
9. **Passage Comments**: Teacher/student notes on passages
10. **Adaptive Passages**: Different passages per difficulty level

---

## 11. Migration Path (if existing tests have context)

If you currently have optional context on questions:

```typescript
// Convert existing context to Passage type
existingQuestions.forEach(q => {
  if (q.hasContext && q.context) {
    // Create passage entry
    const passage = {
      passageId: `migrated_${q.id}`,
      content: q.context,
      sourceAttribution: '',
      images: []
    };
    section.passages.push(passage);
    
    // Update question to use passage type
    q.type = 'Passage';
    q.passageId = passage.passageId;
    q.questionSubType = q.originalType || 'MCQ';
    delete q.hasContext;
    delete q.context;
  }
});
```

---

## Implementation Files to Modify

1. **test-manager.component.ts**
   - Add passage-related properties and methods
   - Update question initialization
   - Add passage CRUD operations
   - Update auto-generate logic

2. **test-manager.component.html**
   - Add passage manager section before questions
   - Add passage modal HTML
   - Add passage selection for question editor
   - Add passage type in auto-generate config

3. **Backend: Question & Passage Schema**
   - Add Passage model/collection
   - Update Question schema with passageId & questionSubType
   - Add validation rules
   - Add API endpoints for passage CRUD

4. **API Service (api-service.ts)**
   - Add methods for passage operations if needed (usually handled in test endpoints)

---

## Sign-Off

This revised plan creates **Passage as a dedicated, first-class question type** rather than optional context. This is better for:
- ✅ Auto-generation of passage-based tests
- ✅ Organized UI and clear relationships
- ✅ Scalability and future enhancements
- ✅ Database efficiency (no duplication)
- ✅ Analytics and reporting

**Status:** Ready for Implementation
**Last Updated:** 2026-01-22
**Author:** Implementation Team
