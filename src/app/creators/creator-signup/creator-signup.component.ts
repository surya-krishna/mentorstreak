import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api-service';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-creator-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-signup.component.html',
  styleUrls: ['./creator-signup.component.scss']
})
export class CreatorSignupComponent {
  model: any = { name: '', email: '', dob: '', display:'', mobileNumber: '', address: '',  terms: false, youtubeChannel: '', bio: '', categories: '', profileImage: null };
  otpStage = false;
  emailOtp = '';
  mobileOtp = '';
  submitted = false;

  constructor(private api: ApiService, private auth: AuthService,private router: Router) {}

  handleProfileImageFile(file: File | null) {
    this.model.profileImage = file;
  }
  getMaxDate(): string {
    const today = new Date();
    // Set the year back 18 years
    today.setFullYear(today.getFullYear() - 18); 
    
    // Format the date to 'YYYY-MM-DD' for the max attribute
    const year = today.getFullYear();
    // Months are 0-indexed, so add 1 and pad with '0'
    const month = String(today.getMonth() + 1).padStart(2, '0');
    // Pad the day with '0'
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  startSignup(form?: any) {
    this.submitted = true;
    // If template-driven form is present, prefer its validity
    if (form && form.invalid) return;
    if (!this.emailOtp) return;
    if (!this.model.terms) return; // terms checkbox shows message in template
    if (!this.model.dob) return;
    const dob = new Date(this.model.dob);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 18) {
      
      return;
    }
    this.model.emailOtp = this.emailOtp;
    // prepare payload: omit UI-only fields like profileImage (should be uploaded separately)
    const payload = { ...this.model };
    // normalize categories: allow comma-separated string in the UI
    if (typeof payload.categories === 'string') {
      payload.categories = payload.categories.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    delete payload.profileImage;
    this.api.post('/auth/v2/register-creator', payload).subscribe({
      next: (res: any) => { this.auth.saveToken(res.access_token); this.auth.saveRefreshToken(res.refresh_token); this.auth.saveUuid(res.uuid); this.router.navigate(['/creator/dashboard']); },
      error: (err: any) => { console.error(err); alert('Signup failed'); }
    });
  }

  verifyOtps() {
    let otp_payload: any = { useremail: this.model.email, display: this.model.display };
    this.api.post('/auth/v2/send-creator-signup-otp', otp_payload).subscribe({
      next: (res: any) => { this.otpStage = true; },
      error: (err: any) => { console.error(err); alert('Signup failed'); }
    });
  }

  resendOtps() { const body = { email: this.model.email, mobile: this.model.mobileNumber }; this.api.post('/api/creator/verify-otp/resend', body).subscribe({ next: () => alert('OTP resent') }); }
  reset() { this.model = { name: '', email: '', dob: '', mobileNumber: '', address: '', terms: false, youtubeChannel: '', bio: '', categories: '', profileImage: null};this.otpStage = false; this.submitted = false;}
}
