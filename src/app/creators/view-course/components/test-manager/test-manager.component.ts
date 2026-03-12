

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../api-service';
import { ModalService } from '../../../../modal.service';
import { ToastService } from '../../../../toast.service';

@Component({
    selector: 'app-test-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './test-manager.component.html'
})
export class TestManagerComponent implements OnInit, OnChanges {
    @Input() courseId: string = '';
    @Input() course: any = null;
    @Input() testId: string | null = null;
    @Input() action: 'edit' | 'create' | 'auto' | null = null;
    @Output() saved = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    currentTest: any = null;
    isLoadingDetails: boolean = false;

    // Auto Generate
    showAutoGenerateModal: boolean = false;
    autoGenConfig: any = {
        numSections: 1,
        sections: []
    };
    isGenerating: boolean = false;
    generationStatus: string = '';

    // Image Upload
    isUploadingImage: boolean = false;

    // Section Management
    focusedSection: number = 0;

    actionMessage: string | null = null;

    testTypes = ['CHAPTER', 'OVERALL'];
    questionTypes = ['MCQ', 'MSQ', 'True/False', 'Descriptive', 'Fill-in-the-Blanks', 'Matching', 'Sequence', 'Passage'];
    scoringFormulas = ['Raw Score', 'Percentile (JEE/NEET)', 'Scaled Score (CAT)', 'Custom'];
    difficultyOptions:number[] = [];
    previewImageUrl: string | null = null;
    allChapters: any[] = [];
    tests: any[] = [];

    // Derived subjects list for easy selection
    subjects: string[] = [];
    // Validation flags
    showManualErrors: boolean = false;
    showAutoErrors: boolean = false;

    // For OVERALL tests allow selecting subjects at test level
    // currentTest.selectedSubjects: string[] expected

    // Passage Management
    showPassageModal: boolean = false;
    editingPassage: any = null;
    editingPassageSectionIndex: number = -1;

    constructor(
        private api: ApiService,
        private modal: ModalService,
        private toast: ToastService
    ) { }

    ngOnInit() {
        this.difficultyOptions = Array.from({ length: 10 }, (_, i) => i + 1);
        this.updateAllChapters();
        this.loadTests();
        
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['course']) {
            this.updateAllChapters();
            this.updateSubjects();
            this.loadTests();
        }
        if (changes['testId'] && this.testId) {
            this.fetchTestDetails(this.testId);
        } else if (changes['action']) {
            if (this.action === 'create') {
                this.initNewTest();
            } else if (this.action === 'auto') {
                this.openAutoGenerate();
            }
        }
    }

    updateAllChapters() {
        const chapters: any[] = [];
        if (this.course && this.course.subjects) {
            this.course.subjects.forEach((s: any) => {
                if (s.chapters) {
                    s.chapters.forEach((c: any) => {
                        chapters.push({ id: c.id || c.name, name: c.name, subject: s.name });
                    });
                }
            });
        }
        this.allChapters = chapters;
        this.updateSubjects();
    }

    updateSubjects() {
        const set = new Set<string>();
        this.allChapters.forEach(c => { if (c.subject) set.add(c.subject); });
        this.subjects = Array.from(set).sort();
    }

    loadTests() {
        if (!this.courseId) { this.tests = []; return; }
        this.api.get(`/creator/v2/courses/${this.courseId}/tests`).subscribe({
            next: (res: any) => {
                this.tests = Array.isArray(res) ? res : (res?.items || []);
            }, error: (err: any) => { console.error('Failed to load tests', err); this.tests = []; }
        });
    }

    initNewTest() {
        this.currentTest = {
            title: '',
            type: 'CHAPTER',
            duration: 60,
            instructions: '',
            hasNegativeMarking: false,
            scoringFormula: 'Raw Score',
            unattemptedMarks: 0,
            sections: [{
                name: 'Section 1',
                questions: [],
                passages: [],
                useUniformMarking: false,
                uniformMarksPos: 1,
                uniformMarksNeg: 0,
                timeLimit: 0,
                selectedChapters: []
            }],
            status: 'draft'
        };
        this.onTestTypeChange(this.currentTest.type);
        this.focusedSection = 0;
    }

    fetchTestDetails(testId: string) {
        this.isLoadingDetails = true;
        this.api.get(`/creator/v2/tests/${testId}`).subscribe({
            next: (res: any) => {
                this.currentTest = res;
                // Ensure defaults
                if (!this.currentTest.scoringFormula) this.currentTest.scoringFormula = 'Raw Score';
                if (this.currentTest.unattemptedMarks === undefined) this.currentTest.unattemptedMarks = 0;
                if (!this.currentTest.sections) this.currentTest.sections = [];

                this.currentTest.sections.forEach((s: any) => {
                    if (s.timeLimit === undefined) s.timeLimit = 0;
                    if (!s.selectedChapters) s.selectedChapters = [];
                    if (!s.questions) s.questions = [];
                    if (!s.passages) s.passages = [];
                    // Ensure each question has chapterId field
                    s.questions.forEach((q: any) => {
                        if (q.chapterId === undefined) {
                            q.chapterId = null;
                        }
                    });
                });

                // Set selectedSubject based on chapterId for CHAPTER type tests
                if (this.currentTest.type === 'CHAPTER' && this.currentTest.chapterId) {
                    const chapter = this.allChapters.find(c => c.id === this.currentTest.chapterId);
                    if (chapter) {
                        this.currentTest.selectedSubject = chapter.subject;
                    }
                }

                // Ensure selectedSubjects exists for OVERALL tests
                if (this.currentTest.type === 'OVERALL' && !this.currentTest.selectedSubjects) {
                    this.currentTest.selectedSubjects = this.currentTest.selectedChapters ? [] : [];
                }

                this.isLoadingDetails = false;
            },
            error: (err: any) => {
                this.toast.error('Failed to load test details');
                this.isLoadingDetails = false;
            }
        });
    }

    saveTest() {
        this.actionMessage = 'Saving test...';
        if (this.currentTest.id) {
            // Update
            this.api.put(`/creator/v2/tests/${this.currentTest.id}`, this.currentTest).subscribe({
                next: (res: any) => {
                    this.finishSaveTest();
                },
                error: () => {
                    this.actionMessage = 'Failed to save test';
                    this.toast.error('Failed to save test');
                }
            });
        } else {
            // Create
            this.api.post(`/creator/v2/courses/${this.courseId}/tests`, this.currentTest).subscribe({
                next: (res: any) => {
                    this.currentTest.id = res.id;
                    this.finishSaveTest();
                },
                error: () => {
                    this.actionMessage = 'Failed to create test';
                    this.toast.error('Failed to create test');
                }
            });
        }
    }

    finishSaveTest() {
        this.actionMessage = 'Test saved';
        this.toast.success('Test saved');
        setTimeout(() => {
            this.actionMessage = null;
            this.saved.emit();
            this.action=null;
        }, 1000);
    }

    cancelTestEdit() {
        this.currentTest = null;
        this.cancelled.emit();
    }

    // Section & Question Management
    addSection() {
        if (!this.currentTest) return;
        this.currentTest.sections.push({
            name: `Section ${this.currentTest.sections.length + 1}`,
            questions: [],
            passages: [],
            useUniformMarking: false,
            uniformMarksPos: 1,
            uniformMarksNeg: 0,
            timeLimit: 0,
            selectedChapters: []
        });
        this.focusedSection = this.currentTest.sections.length - 1;
    }

    removeSection(index: number) {
        if (!this.currentTest) return;
        this.modal.confirm('Are you sure you want to delete this section? All questions in this section will be lost.').then(confirmed => {
            if (confirmed) {
                this.currentTest.sections.splice(index, 1);
                if (this.focusedSection >= this.currentTest.sections.length) {
                    this.focusedSection = Math.max(0, this.currentTest.sections.length - 1);
                }
            }
        });
    }

    prevSection() {
        if (!this.currentTest) return;
        if (this.focusedSection > 0) this.focusedSection--;
    }

    nextSection() {
        if (!this.currentTest) return;
        if (this.focusedSection < this.currentTest.sections.length - 1) this.focusedSection++;
    }

    addQuestion(sectionIndex: number) {
        if (!this.currentTest) return;
        const section = this.currentTest.sections[sectionIndex];
        
        // For CHAPTER type tests, auto-select the test's chapter
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
            passageId: null,
            questionSubType: null
        };
        section.questions.push(question);
    }

    removeQuestion(sectionIndex: number, questionIndex: number) {
        if (!this.currentTest) return;
        this.modal.confirm('Are you sure you want to delete this question?').then(confirmed => {
            if (confirmed) {
                this.currentTest.sections[sectionIndex].questions.splice(questionIndex, 1);
            }
        });
    }

    addOption(question: any) {
        question.options.push({ text: '', isCorrect: false });
    }

    removeOption(question: any, index: number) {
        this.modal.confirm('Are you sure you want to delete this option?').then(confirmed => {
            if (confirmed) {
                question.options.splice(index, 1);
            }
        });
    }

    onUniformMarkingToggle(sectionIndex: number) {
        if (!this.currentTest) return;
        const section = this.currentTest.sections[sectionIndex];

        if (section.useUniformMarking) {
            section.questions.forEach((q: any) => {
                q.marksPos = section.uniformMarksPos;
                q.marksNeg = section.uniformMarksNeg;
            });
        }
    }

    onUniformMarksChange(sectionIndex: number) {
        if (!this.currentTest) return;
        const section = this.currentTest.sections[sectionIndex];

        if (section.useUniformMarking) {
            section.questions.forEach((q: any) => {
                q.marksPos = section.uniformMarksPos;
                q.marksNeg = section.uniformMarksNeg;
            });
        }
    }

    setCorrectOption(question: any, optionIndex: number) {
        // Get the effective question type (for Passage questions, use the subtype)
        const questionType = question.type === 'Passage' ? question.questionSubType : question.type;
        
        if (questionType === 'MCQ' || questionType === 'True/False') {
            question.options.forEach((opt: any, index: number) => {
                opt.isCorrect = index === optionIndex;
            });
        } else if (questionType === 'MSQ') {
            question.options[optionIndex].isCorrect = !question.options[optionIndex].isCorrect;
        }
    }

    addPair(question: any) {
        if (!question.pairs) question.pairs = [];
        question.pairs.push({ left: '', right: '' });
    }

    removePair(question: any, index: number) {
        this.modal.confirm('Are you sure you want to delete this pair?').then(confirmed => {
            if (confirmed) {
                question.pairs.splice(index, 1);
            }
        });
    }

    addSequenceItem(question: any) {
        if (!question.sequenceItems) question.sequenceItems = [];
        question.sequenceItems.push({ text: '', order: question.sequenceItems.length + 1 });
    }

    removeSequenceItem(question: any, index: number) {
        this.modal.confirm('Are you sure you want to delete this sequence item?').then(confirmed => {
            if (confirmed) {
                question.sequenceItems.splice(index, 1);
            }
        });
    }

    onTestTypeChange(newType: string) {
        if (!this.currentTest) return;
        if (newType === 'OVERALL') {
            const all = this.allChapters.map(c => c.id);
            this.currentTest.selectedChapters = all;
            this.currentTest.chapterId = undefined;
            this.currentTest.selectedSubject = undefined;
            // ensure selectedSubjects exists for OVERALL tests
            if (!this.currentTest.selectedSubjects) this.currentTest.selectedSubjects = [];
        } else if (newType === 'CHAPTER') {
            const all = this.allChapters;
            if (!this.currentTest.chapterId && all.length) {
                this.currentTest.chapterId = all[0].id;
            }
            // Set default subject based on current chapter
            if (this.currentTest.chapterId) {
                const chapter = this.allChapters.find(c => c.id === this.currentTest.chapterId);
                if (chapter) {
                    this.currentTest.selectedSubject = chapter.subject;
                }
            }
            this.currentTest.selectedChapters = this.currentTest.selectedChapters || [];
        }
    }

    getAllSubjects(): string[] {
        const subjects = new Set<string>();
        this.allChapters.forEach(ch => {
            if (ch.subject) {
                subjects.add(ch.subject);
            }
        });
        return Array.from(subjects).sort();
    }

    getChaptersBySubject(subject: string): any[] {
        return this.allChapters.filter(ch => ch.subject === subject);
    }



    onSubjectChange() {
        if (!this.currentTest) return;
        // Clear chapter selection when subject changes
        this.currentTest.chapterId = undefined;
    }

    // Auto Generate
    openAutoGenerate() {
        const proceed = () => {
            this.currentTest = null;
            this.showAutoGenerateModal = true;
            this.autoGenConfig = {
                numSections: 1,
                sections: [{
                    name: 'Section 1',
                    questionCount: 10,
                    typeDistribution: this.createEmptyTypeDistribution(),
                    chapters: [],
                    selectedSubjects: [],
                    marksPos: 1,
                    marksNeg: 0,
                    unattemptedMarks: 0,
                    timeLimit: 0
                }]
            };
            this.autoGenConfig.sections.forEach((s: any) => this.ensureChapterDistribution(s));
        };

        if (this.currentTest) {
            this.modal.confirm('Discard current changes?').then(confirmed => {
                if (confirmed) proceed();
            });
        } else {
            proceed();
        }
    }

    createEmptyTypeDistribution() {
        const map: any = {};
        (this.questionTypes || []).forEach((t: string) => map[t] = 0);
        if (map['MCQ'] !== undefined) map['MCQ'] = 10;
        return map;
    }

    updateAutoGenSections() {
        const currentLen = this.autoGenConfig.sections.length;
        const targetLen = this.autoGenConfig.numSections;

        if (targetLen > currentLen) {
            for (let i = currentLen; i < targetLen; i++) {
                this.autoGenConfig.sections.push({
                    name: `Section ${i + 1}`,
                    questionCount: 10,
                    typeDistribution: this.createEmptyTypeDistribution(),
                    chapters: [],
                    chapterDistribution: {},
                    marksPos: 1,
                    marksNeg: 0,
                    unattemptedMarks: 0,
                    timeLimit: 0
                });
            }
        } else if (targetLen < currentLen) {
            this.autoGenConfig.sections.splice(targetLen);
        }
    }

    clampQuestionCount(sec: any) {
        if (!sec) return;
        sec.questionCount = Math.min(Math.max(Number(sec.questionCount) || 0, 0), 30);
        this.ensureChapterDistribution(sec);
    }

    getChapterName(id: any) {
        const ch = this.allChapters.find(c => c.id === id);
        return ch ? `${ch.subject} - ${ch.name}` : String(id);
    }

    // No-op: per-chapter distribution removed for simplicity
    ensureChapterDistribution(secCfg: any) {}

    // Get available chapters for a question based on test type
    getChaptersForQuestion(): any[] {
        if (!this.currentTest) return [];
        
        if (this.currentTest.type === 'CHAPTER') {
            // For CHAPTER type tests, only the selected chapter is relevant
            const chapter = this.allChapters.find(c => c.id === this.currentTest.chapterId);
            return chapter ? [chapter] : [];
        } else if (this.currentTest.type === 'OVERALL') {
            // For OVERALL tests, show all chapters from selected subjects/chapters
            if (this.currentTest.selectedChapters && this.currentTest.selectedChapters.length) {
                return this.allChapters.filter(c => this.currentTest.selectedChapters.includes(c.id));
            }
            return this.allChapters;
        }
        
        return this.allChapters;
    }

    getChaptersForSubjects(subjects: string[] | null | undefined): any[] {
        if (!subjects || !subjects.length) return this.allChapters;
        return this.allChapters.filter(ch => subjects.indexOf(ch.subject) !== -1);
    }

    getDistTotal(sec: any) {
        let sum = 0;
        if (sec.typeDistribution) {
            Object.values(sec.typeDistribution).forEach((v: any) => sum += (Number(v) || 0));
        }
        return sum;
    }

    private computeAllocation(secCfg: any) {
        const out: any = {};
        const dist = secCfg.typeDistribution || this.createEmptyTypeDistribution();
        const totalRequested = Number(secCfg.questionCount) || 0;

        let sum = 0;
        Object.keys(dist).forEach(k => sum += Number(dist[k]) || 0);

        if (totalRequested === 0) {
            Object.keys(dist).forEach(k => out[k] = Number(dist[k]) || 0);
            return out;
        }

        if (sum === 0) {
            Object.keys(dist).forEach(k => out[k] = 0);
            if (out['MCQ'] !== undefined) out['MCQ'] = totalRequested;
            else out[Object.keys(out)[0]] = totalRequested;
            return out;
        }

        let allocated = 0;
        Object.keys(dist).forEach(k => {
            out[k] = Math.floor((Number(dist[k]) || 0) * totalRequested / sum);
            allocated += out[k];
        });

        let remaining = totalRequested - allocated;
        const prefer = out['MCQ'] !== undefined ? 'MCQ' : Object.keys(out)[0];
        while (remaining > 0) {
            out[prefer] = (out[prefer] || 0) + 1;
            remaining--;
        }

        return out;
    }

    generateTest() {
        this.initNewTest();
        this.currentTest.title = 'Auto Generated Test';
        this.currentTest.sections = [];

        this.autoGenConfig.sections.forEach((secCfg: any, idx: number) => {
            if (!secCfg.typeDistribution) secCfg.typeDistribution = this.createEmptyTypeDistribution();
            if (!secCfg.chapters) secCfg.chapters = [];

            secCfg.questionCount = Math.min(Number(secCfg.questionCount) || 0, 30);

            const allocation = this.computeAllocation(secCfg);
            const chapters = secCfg.chapters || [];

            const newSection: any = {
                name: secCfg.name || `Section ${idx + 1}`,
                questions: [],
                useUniformMarking: true,
                uniformMarksPos: secCfg.marksPos,
                uniformMarksNeg: secCfg.marksNeg,
                timeLimit: secCfg.timeLimit || 0,
                selectedChapters: secCfg.chapters || [],
                unattemptedMarks: secCfg.unattemptedMarks || 0
            };

            const makeQuestion = (type: string, ch: any, iNum: number) => ({
                type,
                text: `Generated ${type} Question ${iNum + 1} (Chapter: ${ch ? ch.name : 'N/A'})`,
                options: [{ text: 'Option A', isCorrect: false }, { text: 'Option B', isCorrect: false }],
                marksPos: secCfg.marksPos,
                marksNeg: secCfg.marksNeg,
                pairs: [{ left: '', right: '' }],
                sequenceItems: [{ text: '', order: 1 }],
                blanks: [],
                correctAnswer: '',
                explanation: '',
                image: null,
                chapterId: ch ? ch.id : null
            });

            // Per-chapter distribution removed: allocate questions by section only
            Object.keys(allocation).forEach(type => {
                const count = Number(allocation[type]) || 0;
                for (let i = 0; i < count; i++) {
                    newSection.questions.push(makeQuestion(type, null, i));
                }
            });
            this.currentTest.sections.push(newSection);
        });

        this.showAutoGenerateModal = false;
        this.action=null;
        this.toast.success('Test structure generated (draft)');
    }

    closeAutoGen(){
        this.showAutoGenerateModal = false;
        this.cancelled.emit();
    }

    // Image Upload
    triggerImageUpload(question: any) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => this.uploadImage(e, question);
        fileInput.click();
    }

    uploadImage(event: any, question: any) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        this.actionMessage = 'Uploading image...';
        this.api.postMultipart<{ path: string }>(`/creator/v2/courses/${this.courseId}/upload-image`, formData).subscribe({
            next: (res) => {
                question.image = res.path;
                this.actionMessage = 'Image uploaded';
                setTimeout(() => this.actionMessage = null, 2000);
            },
            error: () => {
                this.toast.error('Failed to upload image');
                this.actionMessage = null;
            }
        });
    }

    deleteImage(question: any) {
        if (!question.image) return;
        this.modal.confirm('Delete this image?').then(confirmed => {
            if (confirmed) {
                this.api.delete(`/creator/v2/files`, { filePath: question.image }).subscribe({
                    next: () => {
                        question.image = null;
                        this.toast.success('Image deleted');
                    },
                    error: () => {
                        this.toast.error('Failed to delete image');
                    }
                });
            }
        });
    }

    openPreview(imagePath: string) {
        this.actionMessage = 'Loading image...';
        this.api.getBlob(`/creator/v2/files?filePath=${encodeURIComponent(imagePath)}`).subscribe({
            next: (blob: any) => {
                this.previewImageUrl = URL.createObjectURL(blob);
                this.actionMessage = null;
            },
            error: () => {
                this.toast.error('Failed to load image');
                this.actionMessage = null;
            }
        });
    }

    closePreview() {
        if (this.previewImageUrl) {
            URL.revokeObjectURL(this.previewImageUrl);
        }
        this.previewImageUrl = null;
    }

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
            (p:any) => p.passageId === this.editingPassage.passageId
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
        const hasQuestions = section.questions.some((q:any) => q.passageId === passageId);
        if (hasQuestions) {
            this.modal.confirm(
                'This passage has questions linked to it. Delete them first?'
            ).then(confirmed => {
                if (confirmed) {
                    // Remove all questions for this passage
                    section.questions = section.questions.filter((q:any) => q.passageId !== passageId);
                    // Remove passage
                    section.passages = section.passages.filter((p:any) => p.passageId !== passageId);
                    this.toast.success('Passage and related questions deleted');
                }
            });
        } else {
            section.passages = section.passages.filter((p:any) => p.passageId !== passageId);
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
            (q:any) => q.passageId === passageId
        );
    }

    triggerPassageImageUpload(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => this.uploadPassageImage(e);
        fileInput.click();
    }

    uploadPassageImage(event: any): void {
        const file = event.target.files[0];
        if (!file || !this.editingPassage) return;

        const formData = new FormData();
        formData.append('file', file);

        this.actionMessage = 'Uploading image...';
        this.api.postMultipart<{ path: string }>(`/creator/v2/courses/${this.courseId}/upload-image`, formData).subscribe({
            next: (res) => {
                if (!this.editingPassage.images) this.editingPassage.images = [];
                this.editingPassage.images.push(res.path);
                this.actionMessage = 'Image uploaded';
                setTimeout(() => this.actionMessage = null, 2000);
            },
            error: () => {
                this.toast.error('Failed to upload image');
                this.actionMessage = null;
            }
        });
    }

    // Validation for manual create/edit test
    manualTestValid(): boolean {
        const t = this.currentTest;
        if (!t) return false;
        if (!t.title || !String(t.title).trim().length) return false;
        if (!(Number(t.duration) > 0)) return false;
        if (!t.type) return false;
        if (t.type === 'CHAPTER') {
            if (!t.selectedSubject || !String(t.selectedSubject).trim().length) return false;
            if (!t.chapterId) return false;
        }
        if (t.type === 'OVERALL') {
            if (!t.selectedChapters || !t.selectedChapters.length) return false;
            // if overall and test-level selectedSubjects are present, they should be non-empty
            if (t.selectedSubjects && !t.selectedSubjects.length) return false;
        }
        // sections validation: at least one section and each section should have proper counts
        if (!t.sections || !t.sections.length) return false;
        for (const s of t.sections) {
            if (!s.name || !String(s.name).trim().length) return false; // section name required
            if (!(Number(s.questionCount) > 0) && !(s.questions && s.questions.length)) return false;
            // validate questions
            if (s.questions && s.questions.length) {
                for (const q of s.questions) {
                    if (this.questionError(q, s)) return false;
                }
            }
        }
        return true;
    }

    // Returns an error message string if question invalid, otherwise null
    questionError(q: any, section?: any): string | null {
        if (!q) return 'Question missing';
        if (!q.type) return 'Question type is required';
        if (!q.text || !String(q.text).trim().length) return 'Question text is required';

        // Passage type validation
        if (q.type === 'Passage') {
            if (!q.passageId) return 'Passage is required for Passage-type questions';
            if (!q.questionSubType) return 'Question sub-type is required for Passage questions';
            // Validate based on sub-type
            return this.validatePassageQuestionSubType(q);
        }

        const nonEmptyOptions = (q.options || []).filter((o: any) => o.text && String(o.text).trim().length);

        switch (q.type) {
            case 'MCQ':
                if (!q.options || q.options.length < 2) return 'At least two options required for MCQ';
                if (nonEmptyOptions.length < 2) return 'At least two non-empty options required for MCQ';
                if (!q.options.some((o: any) => o.isCorrect)) return 'One option must be selected as correct for MCQ';
                return null;
            case 'MSQ':
                if (!q.options || q.options.length < 2) return 'At least two options required for MSQ';
                if (nonEmptyOptions.length < 2) return 'At least two non-empty options required for MSQ';
                if (!q.options.some((o: any) => o.isCorrect)) return 'At least one option must be selected for MSQ';
                return null;
            case 'Descriptive':
                if (!q.correctAnswer || !String(q.correctAnswer).trim().length) return 'Model answer is required for Descriptive questions';
                return null;
            case 'True/False':
                if (!q.options || q.options.length < 2) return 'True/False must have two options';
                // require at least one correct and values 'True' or 'False' present
                const texts = q.options.map((o: any) => (o.text || '').toString().toLowerCase());
                if (!(texts.includes('true') && texts.includes('false'))) return 'Options must include True and False';
                if (!q.options.some((o: any) => o.isCorrect)) return 'Select the correct option for True/False';
                return null;
            case 'Fill-in-the-Blanks':
                if (!q.correctAnswer || !String(q.correctAnswer).trim().length) return 'Correct answer is required for Fill-in-the-Blanks';
                return null;
            case 'Matching':
                if (!q.pairs || q.pairs.length < 2) return 'At least two pairs are required for Matching';
                for (const p of q.pairs) {
                    if (!p.left || !String(p.left).trim().length || !p.right || !String(p.right).trim().length) return 'Both left and right items required for each pair';
                }
                return null;
            case 'Sequence':
                if (!q.sequenceItems || q.sequenceItems.length < 2) return 'At least two items required for Sequence';
                for (const it of q.sequenceItems) {
                    if (!it.text || !String(it.text).trim().length) return 'Sequence items cannot be empty';
                }
                return null;
            default:
                return null;
        }
    }

    // Helper method to validate passage question subtypes
    private validatePassageQuestionSubType(q: any): string | null {
        const subType = q.questionSubType;
        const nonEmptyOptions = (q.options || []).filter((o: any) => o.text && String(o.text).trim().length);

        switch (subType) {
            case 'MCQ':
                if (!q.options || q.options.length < 2) return 'At least two options required for MCQ';
                if (nonEmptyOptions.length < 2) return 'At least two non-empty options required for MCQ';
                if (!q.options.some((o: any) => o.isCorrect)) return 'One option must be selected as correct for MCQ';
                return null;
            case 'MSQ':
                if (!q.options || q.options.length < 2) return 'At least two options required for MSQ';
                if (nonEmptyOptions.length < 2) return 'At least two non-empty options required for MSQ';
                if (!q.options.some((o: any) => o.isCorrect)) return 'At least one option must be selected for MSQ';
                return null;
            case 'Descriptive':
                if (!q.correctAnswer || !String(q.correctAnswer).trim().length) return 'Model answer is required for Descriptive questions';
                return null;
            case 'True/False':
                if (!q.options || q.options.length < 2) return 'True/False must have two options';
                const texts = q.options.map((o: any) => (o.text || '').toString().toLowerCase());
                if (!(texts.includes('true') && texts.includes('false'))) return 'Options must include True and False';
                if (!q.options.some((o: any) => o.isCorrect)) return 'Select the correct option for True/False';
                return null;
            case 'Fill-in-the-Blanks':
                if (!q.correctAnswer || !String(q.correctAnswer).trim().length) return 'Correct answer is required for Fill-in-the-Blanks';
                return null;
            default:
                return null;
        }
    }


    autoGenValid(): boolean {
        const ag = this.autoGenConfig;
        if (!ag) return false;
        if (!(Number(ag.numSections) >= 1)) return false;
        for (const s of ag.sections) {
            if (!(Number(s.questionCount) > 0)) return false;
            // subjects must be selected per user's requirement
            if (!s.selectedSubjects || !s.selectedSubjects.length) return false;
            // chapters must be selected
            if (!s.chapters || !s.chapters.length) return false;
            // ensure type distribution matches total questions exactly
            const totalDist = this.getDistTotal(s);
            if (Number(totalDist) !== Number(s.questionCount)) return false;
        }
        // ensure overall questions across sections is > 0
        if (this.getAutoGenTotalQuestions() <= 0) return false;
        return true;
    }

    // Returns total questions across all auto-gen sections
    getAutoGenTotalQuestions(): number {
        if (!this.autoGenConfig || !this.autoGenConfig.sections) return 0;
        return this.autoGenConfig.sections.reduce((acc: number, s: any) => acc + (Number(s.questionCount) || 0), 0);
    }

    totalAutoGenQuestions(): number {
        if (!this.autoGenConfig || !this.autoGenConfig.sections) return 0;
        return this.autoGenConfig.sections.reduce((acc: number, s: any) => acc + (Number(s.questionCount) || 0), 0);
    }



    attemptSaveTest() {
        this.showManualErrors = true;
        if (this.manualTestValid()) {
            this.saveTest();
        }
    }

    attemptGenerate() {
        this.showAutoErrors = true;
        if (!this.autoGenValid()) return;
        this.isGenerating = true;
        const payload = {
            ...this.autoGenConfig,
            sections: this.autoGenConfig.sections.map((sec: any) => ({
                ...sec,
                selectedSubjects: this.autoGenConfig.testType === 'CHAPTER' ? [sec.selectedSubjects] : sec.selectedSubjects,
                chapters: this.autoGenConfig.testType === 'CHAPTER' ? [sec.chapters] : sec.chapters
            })),
            testType: this.autoGenConfig.testType
        };
        this.api.post(`/creator/v2/courses/${this.courseId}/auto-generate-test`, payload).subscribe({
            next: (res: any) => {
                this.isGenerating = false;
                this.showAutoGenerateModal = false;
                this.action= null;
                this.showAutoGenSuccessPopup();
            },
            error: (err: any) => {
                this.isGenerating = false;
                this.toast.error('Failed to auto-generate test');
            }
        });
    }

    showAutoGenSuccessPopup() {
        this.modal.alert('Test generation initiated. Please continue with your next activity.');
    }
}
