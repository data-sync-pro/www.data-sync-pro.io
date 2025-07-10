import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { SourceFAQRecord } from '../models/faq.model';

/**
 * Data Access Layer for FAQ data
 * Handles raw data fetching and basic error handling
 */
@Injectable({
  providedIn: 'root',
})
export class FAQDataService {
  private readonly FAQ_DATA_URL = 'assets/data/faqs.json';
  private readonly FAQ_CONTENT_BASE = 'assets/faq-item/';
  private readonly RETRY_COUNT = 3;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch raw FAQ data from JSON file
   */
  fetchFAQData(): Observable<SourceFAQRecord[]> {
    return this.http
      .get<SourceFAQRecord[]>(this.FAQ_DATA_URL)
      .pipe(retry(this.RETRY_COUNT), catchError(this.handleError));
  }

  /**
   * Fetch FAQ content by path
   */
  fetchFAQContent(answerPath: string): Observable<string> {
    if (!answerPath) {
      return throwError(() => new Error('Answer path is required'));
    }

    const fullPath = `${this.FAQ_CONTENT_BASE}${answerPath}`;
    return this.http
      .get(fullPath, { responseType: 'text' })
      .pipe(retry(this.RETRY_COUNT), catchError(this.handleError));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
    }

    console.error('FAQ Data Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
