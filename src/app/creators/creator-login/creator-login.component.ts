import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api-service';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner.component';

@Component({
  selector: 'app-creator-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './creator-login.component.html',
  styleUrls: ['./creator-login.component.scss']
})
export class CreatorLoginComponent {
  email = '';
  otp = '';
  otpSent = false;
  isLoading = false;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  sendEmailOtp() {
    this.isLoading = true;
    this.api.post('/auth/v2/send-otp', { useremail: this.email }).subscribe({
      next: () => { 
        this.otpSent = true;
        this.isLoading = false;
      },
      error: (e: any) => {
        alert('Failed to send OTP');
        this.isLoading = false;
      }
    });
  }

  verifyEmailOtp() {
    this.isLoading = true;
    this.api.post('/auth/v2/login?useremail='+this.email+"&otp="+this.otp,{}).subscribe({
      next: (res: any) => {
        if (res?.access_token) {
          this.auth.saveToken(res.access_token);
          this.auth.saveRefreshToken(res.refresh_token);
          this.auth.saveUuid(res.uuid);
          this.router.navigate(['/creator/dashboard']);
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        alert('OTP verification failed');
        this.isLoading = false;
      }
    });
  }
}
