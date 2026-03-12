import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../api-service';
import { ToastService } from '../../../../toast.service';
import { ModalService } from '../../../../modal.service';

@Component({
    selector: 'app-subject-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './subject-manager.component.html'
})
export class SubjectManagerComponent {
    @Input() course: any;
    @Input() loading: boolean = false;
    @Input() courseDirty: boolean = false;
    @Output() courseChange = new EventEmitter<void>();
    @Output() save = new EventEmitter<void>();
    @Output() back = new EventEmitter<void>();
    @Output() continue = new EventEmitter<void>();
    @Output() validityChange = new EventEmitter<boolean>();
    showErrors: boolean = false;

    constructor(
        private api: ApiService,
        private toast: ToastService,
        private modal: ModalService
    ) { }

    onCourseChange() {
        this.courseChange.emit();
    }

    // Validation: require at least one subject and each subject must have a non-empty title
    subjectsValid(): boolean {
        if (!this.course || !this.course.subjects || !this.course.subjects.length) return false;
        for (const s of this.course.subjects) {
            if (!s.name || !String(s.name).trim().length) return false;
        }
        return true;
    }

    addSubject() {
        if (!this.course.subjects) this.course.subjects = [];
        this.course.subjects.push({ name: '', chapters: [] });
        this.courseChange.emit();
        try { this.validityChange.emit(this.subjectsValid()); } catch (e) { }
    }

    removeSubject(index: number) {
        const subject = this.course.subjects[index];

        // If subject has an id, it's saved in the backend, so we need to delete it via API
        if (subject.id) {
            // Confirm deletion
            this.modal.confirm('Are you sure you want to delete this subject? This will also delete all its chapters.').then(confirmed => {
                if (!confirmed) {
                    return;
                }

                // Call DELETE API
                this.api.delete(`/creator/v2/books/${subject.id}`).subscribe({
                    next: () => {
                        // Remove from local array after successful API call
                        this.course.subjects.splice(index, 1);
                        this.courseChange.emit();
                        this.toast.success('Subject deleted successfully');
                        try { this.validityChange.emit(this.subjectsValid()); } catch (e) { }
                    },
                    error: (err) => {
                        console.error('Failed to delete subject:', err);
                        this.toast.error('Failed to delete subject');
                    }
                });
            });
        } else {
            // Subject is not saved yet, just remove it from the local array
            this.course.subjects.splice(index, 1);
            this.courseChange.emit();
            try { this.validityChange.emit(this.subjectsValid()); } catch (e) { }
        }
    }

    onSubjectChange(index: number) {
        this.courseChange.emit();
        try { this.validityChange.emit(this.subjectsValid()); } catch (e) { }
    }

    createAllSubjects() {
        this.save.emit();
    }

    attemptSave() {
        this.showErrors = true;
        this.validityChange.emit(this.subjectsValid());
        if (this.subjectsValid()) this.save.emit();
    }

    attemptContinue() {
        this.showErrors = true;
        this.validityChange.emit(this.subjectsValid());
        if (this.subjectsValid()) this.continue.emit();
    }

    onSaveSuccess() {
        // Auto-continue after successful save
        this.continue.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        try { this.validityChange.emit(this.subjectsValid()); } catch (e) { }
    }

    sectionHasChanges() {
        return this.courseDirty;
    }
}
