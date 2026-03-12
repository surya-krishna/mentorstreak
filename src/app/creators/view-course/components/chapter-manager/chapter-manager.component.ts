import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../api-service';
import { ToastService } from '../../../../toast.service';
import { ModalService } from '../../../../modal.service';

@Component({
    selector: 'app-chapter-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chapter-manager.component.html'
})
export class ChapterManagerComponent {
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

    onChapterChange(si: number, ci: number) {
        this.courseChange.emit();
        try { this.validityChange.emit(this.chaptersValid()); } catch (e) { }
    }

    onInputTypeChange(si: number, ci: number, newType: string) {
        const chapter = this.course.subjects[si].chapters[ci];
        const oldType = chapter.inputType;

        // If there's a value (Url) and we are changing types, warn the user
        if (chapter.Url && chapter.Url.trim().length > 0 && oldType !== newType) {
            this.modal.confirm('Changing the input type will clear the existing value. Would you like to proceed?').then(confirmSwitch => {
                if (!confirmSwitch) {
                    // Revert the selection in the UI
                    setTimeout(() => {
                        chapter.inputType = oldType;
                    });
                    return;
                }
                // User confirmed, clear the value
                chapter.Url = '';
                chapter.inputType = newType;
                this.onChapterChange(si, ci);
            });
        } else {
            // No existing value or same type, just update
            chapter.inputType = newType;
            this.onChapterChange(si, ci);
        }
    }

    // Validation: subjects must exist and each chapter must have a non-empty title
    // URL is not required if inputType is 'manual' - content will be added in next step
    chaptersValid(): boolean {
        if (!this.course || !this.course.subjects || !this.course.subjects.length) return false;
        for (const s of this.course.subjects) {
            if (!s.name || !String(s.name).trim().length) return false;
            //if (!s.chapters || !s.chapters.length) return false;
            for (const c of s.chapters) {
                if (!c.name || !String(c.name).trim().length) return false;
                // URL is mandatory only for youtube and file types, not for manual
                if (c.inputType !== 'manual' && (!c.Url || !String(c.Url).trim().length)) return false;
            }
        }
        return true;
    }

    saveAll() {
        // emit save so parent can persist entire course
        this.save.emit();
    }

    attemptSaveAll() {
        this.showErrors = true;
        this.validityChange.emit(this.chaptersValid());
        if (this.chaptersValid()) this.save.emit();
    }

    attemptContinue() {
        this.showErrors = true;
        this.validityChange.emit(this.chaptersValid());
        if (this.chaptersValid()) this.continue.emit();
    }

    onSaveSuccess() {
        // Auto-continue after successful save
        this.continue.emit();
    }

    removeChapter(si: number, ci: number) {
        const subject = this.course.subjects[si];
        const chapter = subject.chapters[ci];

        // If chapter has an id, it's saved in the backend, so we need to delete it via API
        if (chapter.id && subject.id) {
            // Confirm deletion
            this.modal.confirm('Are you sure you want to delete this chapter?').then(confirmed => {
                if (!confirmed) {
                    return;
                }

                // Call DELETE API
                this.api.delete(`/creator/v2/books/${subject.id}/chapters/${chapter.id}`).subscribe({
                    next: () => {
                        // Remove from local array after successful API call
                        this.course.subjects[si].chapters.splice(ci, 1);
                        this.courseChange.emit();
                        this.toast.success('Chapter deleted successfully');
                        try { this.validityChange.emit(this.chaptersValid()); } catch (e) { }
                    },
                    error: (err) => {
                        console.error('Failed to delete chapter:', err);
                        this.toast.error('Failed to delete chapter');
                    }
                });
            });
        } else {
            // Chapter is not saved yet, just remove it from the local array
            this.course.subjects[si].chapters.splice(ci, 1);
            this.courseChange.emit();
            try { this.validityChange.emit(this.chaptersValid()); } catch (e) { }
        }
    }

    createChapterForSubject(si: number) {
        if (!this.course.subjects[si].chapters) this.course.subjects[si].chapters = [];
        // use Url field to align with existing data mapping
        // Default to 'youtube' type
        this.course.subjects[si].chapters.push({ name: '', Url: '', inputType: 'file' });
        this.courseChange.emit();
        try { this.validityChange.emit(this.chaptersValid()); } catch (e) { }
    }

    ngOnChanges(changes: SimpleChanges) {
        try { this.validityChange.emit(this.chaptersValid()); } catch (e) { }
    }

    // File Upload Logic
    onFileSelected(event: any, si: number, ci: number) {
        const file = event.target.files[0];
        if (!file) return;

        // Validation
        const isPdf = file.type === 'application/pdf';
        const sizeMb = file.size / (1024 * 1024);

        if (isPdf) {
            if (sizeMb > 25) {
                alert('PDF files must be less than 25MB');
                event.target.value = '';
                return;
            }
        } else {
            // Assume audio or other allowed types
            if (sizeMb > 1024) { // 1GB
                alert('Files must be less than 1GB');
                event.target.value = '';
                return;
            }
        }

        // Determine chapter to update
        const chapter = this.course.subjects[si].chapters[ci];
        chapter.uploading = true;
        chapter.uploadProgress = 0;

        // Mock upload for now or emit event to parent to handle actual upload
        // Since we don't have the backend endpoint confirmed, we'll emit an event
        // But wait, the user asked to "make changes to api input", implying I should try to implement it.
        // I'll emit an event 'chapterFileUpload' so the parent (ViewCourse) can handle the API call
        // reusing its access to ApiService and Course ID.
        this.uploadFile(file, si, ci);
    }

    @Output() uploadChapter = new EventEmitter<{ file: File, subjectIndex: number, chapterIndex: number }>();

    uploadFile(file: File, si: number, ci: number) {
        this.uploadChapter.emit({ file, subjectIndex: si, chapterIndex: ci });
    }
}
