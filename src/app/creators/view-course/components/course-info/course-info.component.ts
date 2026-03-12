import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../api-service';
import { ToastService } from '../../../../toast.service';
import { DeleteCourseModalComponent } from './delete-course-modal.component';

@Component({
    selector: 'app-course-info',
    standalone: true,
    imports: [CommonModule, FormsModule, DeleteCourseModalComponent],
    templateUrl: './course-info.component.html'
})
export class CourseInfoComponent {
    @Input() course: any;
    @Input() loading: boolean = false;
    @Input() courseDirty: boolean = false;
    @Input() thumbnailPreview: string | null = null;
    @Output() courseChange = new EventEmitter<void>();
    @Output() save = new EventEmitter<void>();
    @Output() continue = new EventEmitter<void>();
    @Output() thumbnailUploaded = new EventEmitter<string>(); // Emits new preview URL
    @Output() validityChange = new EventEmitter<boolean>();

    thumbnailFile: File | null = null;
    uploadInProgress: boolean = false;
    uploadProgress: number = 0;
    showErrors: boolean = false;
    showDeleteModal: boolean = false;
    isDeleting: boolean = false;
    

    constructor(
        private api: ApiService,
        private toast: ToastService,
        private router: Router
    ) { }

    onCourseChange() {
    this.courseChange.emit();
    try { this.validityChange.emit(this.isValidCourse()); } catch (e) {}
    }

    // Validation: ensure required course fields are present
    isValidCourse(): boolean {
        if (!this.course) return false;
        const nameOk = !!(this.course.name && String(this.course.name).trim().length);
        const descOk = !!(this.course.description && String(this.course.description).trim().length);
        const skillLevelOk = !!(this.course.skillLevel && String(this.course.skillLevel).trim().length);
        const thumbOk = !!(this.thumbnailPreview || (this.course.thumbnail && this.course.thumbnail.length));
        return nameOk && descOk && skillLevelOk && thumbOk;
    }

    attemptSave() {
        this.showErrors = true;
        this.validityChange.emit(this.isValidCourse());
        if (this.isValidCourse() && !this.loading) {
            this.saveCourseWithThumbnail();
        }
    }

    attemptContinue() {
        this.showErrors = true;
        this.validityChange.emit(this.isValidCourse());
        if (this.isValidCourse()) {
            this.continue.emit();
        }
    }

    saveCourseWithThumbnail() {
        this.loading = true;
        
        // Step 1: Upload thumbnail if available
        if (this.thumbnailFile && this.course.id) {
            this.uploadThumbnailAndSaveCourse();
        } else {
            // No thumbnail to upload, just save course
            this.saveCourse();
        }
    }

    uploadThumbnailAndSaveCourse() {
        if (!this.course.id || !this.thumbnailFile) {
            this.saveCourse();
            return;
        }

        const fd = new FormData();
        fd.append('thumbnail', this.thumbnailFile);
        this.api.postMultipart(`/creator/v2/courses/${this.course.id}/thumbnail`, fd).subscribe({
            next: (res: any) => {
                // Update course with thumbnail path
                this.course.thumbnail_url = res.path;
                this.thumbnailFile = null; // Clear after upload
                // Now save the course
                this.saveCourse();
            },
            error: () => {
                this.loading = false;
                this.toast.error('Thumbnail upload failed');
            }
        });
    }

    recalcPrice() {
        if (!this.course) return;
        this.course.price = Number(this.course.price) || 0;
        this.course.discount = Math.min(Math.max(Number(this.course.discount) || 0, 0), 100);
    }

    finalPrice() {
        return this.course.price * (1 - this.course.discount / 100);
    }

    onThumbnailChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.thumbnailFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => this.thumbnailPreview = e.target.result;
            reader.readAsDataURL(file);
            this.courseChange.emit();
            try { this.validityChange.emit(this.isValidCourse()); } catch (e) {}
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        try { this.validityChange.emit(this.isValidCourse()); } catch (e) {}
    }

    saveCourse() {
        this.save.emit();
    }

    openDeleteModal() {
        this.showDeleteModal = true;
    }

    closeDeleteModal() {
        this.showDeleteModal = false;
    }

    deleteCourse() {
        if (!this.course || !this.course.id) {
            this.toast.error('Invalid course');
            return;
        }

        this.isDeleting = true;
        const courseId = this.course.id;
        
        this.api.delete(`/creator/v2/courses/${courseId}`).subscribe({
            next: () => {
                this.isDeleting = false;
                this.showDeleteModal = false;
                this.toast.success('Course deleted successfully');
                // Navigate back to creator dashboard after deletion
                setTimeout(() => {
                    this.router.navigate(['/creator/dashboard']);
                }, 1000);
            },
            error: (err) => {
                this.isDeleting = false;
                this.toast.error(err.message || 'Failed to delete course');
            }
        });
    }
}
