import { Component, Input, OnChanges, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { renderLatex } from '../../utils/latex.util';

@Component({
  selector: 'app-latex-text',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `<span class="latex-text" [innerHTML]="rendered"></span>`,
  styles: [`
    .latex-text .katex { font-size: 1.05em; }
    .latex-text .katex-display { margin: 8px 0; text-align: center; overflow-x: auto; }
  `]
})
export class LatexTextComponent implements OnChanges {
  @Input() text = '';
  rendered: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    this.rendered = this.sanitizer.bypassSecurityTrustHtml(renderLatex(this.text));
  }
}
