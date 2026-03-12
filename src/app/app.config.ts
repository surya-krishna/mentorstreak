import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import Quill from 'quill';
import katex from 'katex';

import { routes } from './app.routes';

// Register KaTeX with window for Quill to use
declare global {
  interface Window {
    katex?: any;
  }
}

function initializeQuillModules() {
  return () => {
    // Make KaTeX available globally for Quill formula rendering
    window.katex = katex;
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeQuillModules,
      multi: true
    }
  ]
};
