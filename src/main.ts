import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import "katex/dist/katex.min.css"; // Ensure you have 'katex' installed via npm

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
