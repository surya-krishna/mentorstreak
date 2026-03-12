import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl =  "https://api.mentorstreak.com";
  //private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  // helper for multipart/form-data uploads
  postMultipart<T>(url: string, form: FormData, authToken?: string): Observable<T> {
    const headers = this.getHeaders(authToken).delete('Content-Type');
    return this.http.post<T>(this.baseUrl + url, form, { headers })
      .pipe(catchError((err) => this.handleError(err)));
  }

  // helper that returns progress events for multipart uploads
  postMultipartWithProgress(url: string, form: FormData, authToken?: string): Observable<HttpEvent<any>> {
    const headers = this.getHeaders(authToken).delete('Content-Type');
    const req = new HttpRequest('POST', this.baseUrl + url, form, { headers, reportProgress: true });
    return this.http.request(req);
  }

  private getHeaders(authToken?: string): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = authToken ?? this.auth.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  get<T>(url: string, params?: any, authToken?: string): Observable<T> {
    return this.http.get<T>(this.baseUrl + url, {
      headers: this.getHeaders(authToken),
      params: params ? new HttpParams({ fromObject: params }) : undefined
    }).pipe(catchError((err) => this.handleError(err)));
  }

  // helper to GET binary blobs (files) with auth headers
  getBlob(url: string, authToken?: string) {
    return this.http.get(this.baseUrl + url, {
      headers: this.getHeaders(authToken),
      responseType: 'blob'
    }).pipe(catchError((err) => this.handleError(err)));
  }

  post<T>(url: string, body: any, authToken?: string): Observable<T> {
    return this.http.post<T>(this.baseUrl + url, body, {
      headers: this.getHeaders(authToken)
    }).pipe(catchError((err) => this.handleError(err)));
  }

  put<T>(url: string, body: any, authToken?: string): Observable<T> {
    return this.http.put<T>(this.baseUrl + url, body, {
      headers: this.getHeaders(authToken)
    }).pipe(catchError((err) => this.handleError(err)));
  }

  delete<T>(url: string, params?: any, authToken?: string): Observable<T> {
    return this.http.delete<T>(this.baseUrl + url, {
      headers: this.getHeaders(authToken),
      params: params ? new HttpParams({ fromObject: params }) : undefined
    }).pipe(catchError((err) => this.handleError(err)));
  }

  private handleError(err: any) {
    const normalized = { status: err?.status || 0, message: err?.error?.message || err?.message || 'Request failed', error: err?.error || null };
    return throwError(() => normalized);
  }
}
