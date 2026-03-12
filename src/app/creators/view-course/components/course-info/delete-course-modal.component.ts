import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-delete-course-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Delete Course</h3>
                
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p class="text-sm text-gray-700 mb-2">
                        This action cannot be undone. To confirm deletion, type the course name:
                    </p>
                    <p class="text-sm font-semibold text-red-600 mb-3">delete {{ courseName }}</p>
                </div>

                <input
                    [(ngModel)]="confirmationText"
                    placeholder="Type course name to confirm"
                    type="text"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                />

                <div class="flex gap-3 justify-end">
                    <button
                        (click)="onCancel()"
                        class="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        (click)="onConfirmDelete()"
                        [disabled]="!isConfirmButtonEnabled() || isDeleting"
                        class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {{ isDeleting ? 'Deleting...' : 'Delete Course' }}
                    </button>
                </div>
            </div>
        </div>
    `
})
export class DeleteCourseModalComponent {
    @Input() isOpen: boolean = false;
    @Input() courseName: string = '';
    @Input() isDeleting: boolean = false;
    @Output() cancel = new EventEmitter<void>();
    @Output() confirm = new EventEmitter<void>();

    confirmationText: string = '';

    isConfirmButtonEnabled(): boolean {
        return this.confirmationText.trim() === "delete "+this.courseName.trim();
    }

    onCancel() {
        this.confirmationText = '';
        this.cancel.emit();
    }

    onConfirmDelete() {
        if (this.isConfirmButtonEnabled()) {
            this.confirm.emit();
        }
    }
}
