import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from './api-service';
@Component({
    selector: 'app-delete-account',
    standalone: true,
    imports: [FormsModule, CommonModule, HttpClientModule],
    providers: [ApiService],
    templateUrl: './delete-account.component.html'
})
export class DeleteAccountComponent {
  email = '';
  otp = '';
  loading = false;
  emailSent = false;
  showConfirm = false;
  showFinal = false;
  errorMessage: string = '';

  constructor(private api: ApiService) {}

  sendOtp() {
    if (!this.email) return;
    this.loading = true;
    this.api.post('/auth/v2/send-otp', { useremail: this.email }).subscribe({
      next: () => {
        this.emailSent = true;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Failed to send OTP.';
      }
    });
  }

  onDelete() {
    
    if (!this.email || !this.otp) return;
    this.showConfirm = true;
  }

  confirmDelete() {
    this.showConfirm = false;
    this.loading = true;
    this.api.post('/auth/v2/request-delete-account', {
      useremail: this.email,
      otp: this.otp
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.showFinal = true;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Failed to request account deletion.';
      }
    });
  }

  cancelDelete() {
    this.showConfirm = false;
  }

  closeFinal() {
    this.showFinal = false;
    this.email = '';
    this.otp = '';
    this.emailSent = false;
  }
}