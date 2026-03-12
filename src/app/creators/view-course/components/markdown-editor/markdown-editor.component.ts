import { Component, Input, Output, EventEmitter, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="markdown-editor">
      <div class="editor-tabs border-b">
        <button 
          [class.active]="activeTab === 'editor'"
          class="tab-button px-4 py-2 border-b-2 font-medium text-sm"
          [class.border-indigo-500]="activeTab === 'editor'"
          [class.text-indigo-600]="activeTab === 'editor'"
          [class.border-transparent]="activeTab !== 'editor'"
          [class.text-gray-500]="activeTab !== 'editor'"
          (click)="setActiveTab('editor')">
          Editor
        </button>
        <button 
          [class.active]="activeTab === 'preview'"
          class="tab-button px-4 py-2 border-b-2 font-medium text-sm ml-2"
          [class.border-indigo-500]="activeTab === 'preview'"
          [class.text-indigo-600]="activeTab === 'preview'"
          [class.border-transparent]="activeTab !== 'preview'"
          [class.text-gray-500]="activeTab !== 'preview'"
          (click)="setActiveTab('preview')">
          Preview
        </button>
      </div>

      <div class="editor-content" [style.height]="editorHeight">
        <!-- Editor Tab -->
        <div *ngIf="activeTab === 'editor'" class="h-full">
          <textarea 
            [(ngModel)]="content"
            (ngModelChange)="onContentChange($event)"
            class="w-full h-full p-4 border-0 resize-none focus:outline-none font-mono text-sm"
            placeholder="Enter your markdown content here..."
            [style.min-height]="editorHeight">
          </textarea>
        </div>

        <!-- Preview Tab -->
        <div *ngIf="activeTab === 'preview'" class="markdown-preview-container h-full overflow-auto p-6 bg-white">
          <div class="markdown-content" [innerHTML]="renderedContent"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .markdown-editor {
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      overflow: hidden;
    }

    .editor-tabs {
      background-color: #f9fafb;
      padding: 0 1rem;
    }

    .tab-button {
      background: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: #4f46e5;
    }

    .tab-button.active {
      background-color: white;
      border-bottom: 2px solid #4f46e5 !important;
    }

    .editor-content {
      background-color: white;
    }

    textarea {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      line-height: 1.6;
    }

    /* Markdown content styling - using ViewEncapsulation.None */
    .markdown-preview-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #24292e;
    }

    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: #1a202c;
    }

    .markdown-content h1 {
      font-size: 2em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 8px;
    }

    .markdown-content h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 8px;
    }

    .markdown-content h3 {
      font-size: 1.25em;
    }

    .markdown-content h4 {
      font-size: 1em;
    }

    .markdown-content h5 {
      font-size: 0.875em;
    }

    .markdown-content h6 {
      font-size: 0.85em;
      color: #6a737d;
    }

    .markdown-content p {
      margin-bottom: 16px;
      margin-top: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin-bottom: 16px;
      margin-top: 0;
      padding-left: 30px;
    }

    .markdown-content li {
      margin-bottom: 4px;
      word-wrap: break-all;
    }

    .markdown-content li > p {
      margin-bottom: 8px;
    }

    .markdown-content blockquote {
      margin: 0;
      padding: 0 16px;
      color: #6a737d;
      border-left: 4px solid #dfe2e5;
      margin-bottom: 16px;
    }

    .markdown-content code {
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      font-size: 85%;
      margin: 0;
      padding: 0.2em 0.4em;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    .markdown-content pre {
      background-color: #f6f8fa;
      border-radius: 6px;
      font-size: 85%;
      line-height: 1.45;
      overflow: auto;
      padding: 16px;
      margin-bottom: 16px;
      margin-top: 0;
    }

    .markdown-content pre code {
      background-color: transparent;
      border: 0;
      display: inline;
      line-height: inherit;
      margin: 0;
      max-width: auto;
      overflow: visible;
      padding: 0;
      word-wrap: normal;
    }

    .markdown-content table {
      border-collapse: collapse;
      border-spacing: 0;
      display: block;
      margin-bottom: 16px;
      margin-top: 0;
      overflow: auto;
      width: 100%;
    }

    .markdown-content table th {
      font-weight: 600;
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
      background-color: #f6f8fa;
    }

    .markdown-content table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }

    .markdown-content table tr {
      background-color: #fff;
      border-top: 1px solid #c6cbd1;
    }

    .markdown-content table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }

    .markdown-content img {
      max-width: 100%;
      box-sizing: content-box;
      background-color: #fff;
      border-radius: 6px;
    }

    .markdown-content hr {
      background-color: #e1e4e8;
      border: 0;
      height: 1px;
      margin: 24px 0;
    }

    /* Math formula styling */
    .markdown-content .katex {
      font-size: 1.1em;
      color: #24292e;
    }

    .markdown-content .katex-display {
      margin: 20px 0;
      text-align: center;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .markdown-content .katex-display > .katex {
      display: inline-block;
      white-space: nowrap;
    }
  `]
})
export class MarkdownEditorComponent implements OnInit {
  @Input() content: string = '';
  @Input() editorHeight: string = '300px';
  @Output() contentChange = new EventEmitter<string>();

  activeTab: 'editor' | 'preview' = 'editor';
  renderedContent: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {
    // Configure marked with KaTeX extension for math formula support
    const katexOptions = {
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false
    };
    marked.use(markedKatex(katexOptions));
    
    // Configure marked options for better rendering
    marked.setOptions({
      breaks: true, // Enable line breaks
      gfm: true, // Enable GitHub Flavored Markdown
    });
  }

  ngOnInit() {
    this.updateRenderedContent();
  }

  setActiveTab(tab: 'editor' | 'preview') {
    this.activeTab = tab;
    if (tab === 'preview') {
      this.updateRenderedContent();
    }
  }

  onContentChange(newContent: string) {
    this.content = newContent;
    this.contentChange.emit(newContent);
    if (this.activeTab === 'preview') {
      this.updateRenderedContent();
    }
  }

  private updateRenderedContent() {
    if (this.content && this.content.trim()) {
      try {
        // Pre-process content to handle multiple line breaks
        let processedContent = this.content
          // Convert double line breaks to proper paragraph breaks
          .replace(/\n\s*\n/g, '\n\n')
          // Ensure proper spacing around math formulas
          .replace(/(\$\$[\s\S]*?\$\$)/g, '\n\n$1\n\n')
          .replace(/(\$[^$\n]*?\$)/g, ' $1 ');
        
        const html = marked.parse(processedContent) as string;
        this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(html);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        this.renderedContent = this.sanitizer.bypassSecurityTrustHtml('<p class="text-red-500">Error rendering markdown content</p>');
      }
    } else {
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml('<p class="text-gray-500 italic">No content to preview</p>');
    }
  }
}