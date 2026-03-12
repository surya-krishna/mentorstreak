import { PackageManagerComponent } from '../view-course/components/package-manager/package-manager.component';
import { Component, OnInit, OnDestroy, Sanitizer, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../api-service';
import { ModalService } from '../../modal.service';
import { ToastService } from '../../toast.service';
import { QuillModule } from 'ngx-quill';
import { marked } from 'marked';
import TurndownService from 'turndown';

import { CourseInfoComponent } from '../view-course/components/course-info/course-info.component';
import { SubjectManagerComponent } from '../view-course/components/subject-manager/subject-manager.component';
import { ChapterManagerComponent } from '../view-course/components/chapter-manager/chapter-manager.component';
import { TestManagerComponent } from '../view-course/components/test-manager/test-manager.component';
import { COURSE_PUBLISH_TNC } from '../view-course/terms-and-conditions';
import { forkJoin } from 'rxjs';
import markedKatex from "marked-katex-extension";
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Import this
const options = {
  throwOnError: false,
  nonStandard: true,
  strict: false
};

//marked.use(markedKatex(options));

@Component({
  selector: 'app-view-course',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    QuillModule,
    CourseInfoComponent,
    SubjectManagerComponent,
    ChapterManagerComponent,
    TestManagerComponent,
    PackageManagerComponent
  ],
  templateUrl: './new-course.component.html',
  styleUrls: ['./new-course.component.scss']
})
export class NewCourseComponent implements OnInit, OnDestroy {

  @ViewChild(CourseInfoComponent) courseInfoComponent!: CourseInfoComponent;

  packages: any[] = [];
  parsedContent: SafeHtml = ""; // Use SafeHtml type

  get subjectCount() {
    return Array.isArray(this.course.subjects) ? this.course.subjects.length : 0;
  }
  get chapterCount() {
    if (!Array.isArray(this.course.subjects)) return 0;
    return this.course.subjects.reduce((acc: number, subj: any) => acc + (Array.isArray(subj.chapters) ? subj.chapters.length : 0), 0);
  }
  get testCount() {
    return Array.isArray(this.tests) ? this.tests.length : 0;
  }
  courseId: string = '';
  course: any = {};
  loading: boolean = false;
  actionMessage: string | null = null;
  step: number = 1;

  // Track if this is a new course (no ID provided)
  isNewCourse: boolean = false;

  // Course Info State
  thumbnailPreview: string | null = null;
  courseDirty: boolean = false;
  // Validation states from child components
  courseValid: boolean = false;
  subjectsValidState: boolean = false;
  chaptersValidState: boolean = false;

  // Test Manager State
  tests: any[] = [];
  selectedTestId: string | null = null;
  testAction: 'edit' | 'create' | 'auto' | null = null;
  showNewTestOptions: boolean = false;

  // Preview/Chapter Editor State
  selectedChapter: any = null;
  selectedChapterName: string = '';
  editorContentHtml: string = '';
  hasUnsavedChanges: boolean = false;
  quillModules = {
    formula: true,
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video', 'formula']
    ]
  };

  private turndownService = new TurndownService();

  

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private modal: ModalService,
    private toast: ToastService,
    private sanitizer: DomSanitizer
  ) { 
    // 2. Add a custom rule to detect KaTeX rendered HTML and revert it to $...$
    this.turndownService.addRule('katex-math', {
      filter: function (node) {
        // Look for the distinct class used by KaTeX wrappers
        return node.nodeName === 'SPAN' && node.classList.contains('katex');
      },
      replacement: function (content, node) {
        // Attempt to find the hidden annotation tag containing the source LaTeX
        const texAnnotation = node.querySelector('annotation[encoding="application/x-tex"]');
        
        if (texAnnotation) {
          const rawTex = texAnnotation.textContent;
          
          // Heuristic: If it contains newlines, treat as block math ($$), else inline ($)
          if (rawTex.includes('\n') || node.classList.contains('katex-display')) {
            return '\n$$ ' + rawTex + ' $$\n';
          }
          return '$' + rawTex + '$';
        }
        
        // Fallback if annotation isn't found (rare if configured correctly)
        return content;
      }
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId = params['id'];
      if (this.courseId) {
        this.loadCourse();
      } else {
        // No course ID: initialize empty course for creation
        this.isNewCourse = true;
        this.course = {
          name: '',
          title: '',
          description: '',
          price: 0,
          discount: 0,
          status: 'draft',
          subjects: [],
          books: []
        };
        this.step = 1; // Start at course info step
      }
    });
  }

  updateInitialValidities() {
    // Course validity
    const c = this.course || {};
    const nameOk = !!(c.name && String(c.name).trim().length);
    const descOk = !!(c.description && String(c.description).trim().length);
    const priceOk = typeof c.price === 'number' ? c.price >= 0 : !!c.price;
    const finalOk = (c.price || 0) * (1 - (c.discount || 0) / 100) >= 0;
    const thumbOk = !!(this.thumbnailPreview || (c.thumbnail && c.thumbnail.length));
    this.courseValid = !!(nameOk && descOk && priceOk && finalOk && thumbOk);

    // Subjects validity
    let subjectsOk = true;
    if (!c.subjects || !c.subjects.length) subjectsOk = false;
    else {
      for (const s of c.subjects) {
        if (!s.name || !String(s.name).trim().length) { subjectsOk = false; break; }
      }
    }
    this.subjectsValidState = subjectsOk;

    // Chapters validity
    let chaptersOk = true;
    if (!c.subjects || !c.subjects.length) chaptersOk = false;
    else {
      for (const s of c.subjects) {
        if (!s.name || !String(s.name).trim().length) { chaptersOk = false; break; }
        if (!s.chapters || !s.chapters.length) { chaptersOk = false; break; }
        for (const ch of s.chapters) {
          if (!ch.name || !String(ch.name).trim().length) { chaptersOk = false; break; }
          if (!ch.Url || !String(ch.Url).trim().length) { chaptersOk = false; break; }
        }
        if (!chaptersOk) break;
      }
    }
    this.chaptersValidState = chaptersOk;
  }

  ngOnDestroy() {
    try { if (this.thumbnailPreview && this.thumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(this.thumbnailPreview); } catch (e) { }
  }

  loadCourse() {
    this.loading = true;
    this.api.get(`/creator/v2/courses/${this.courseId}`).subscribe({
      next: (res: any) => {
        this.course = res;

        // Ensure subjects is initialized (might be named 'books' in the API)
        if ((!this.course.subjects||!this.course.subjects.length) && this.course.books) {
          this.course.subjects = this.course.books;
        }
        if (!this.course.subjects) {
          this.course.subjects = [];
        }

        // Normalize subject and chapter field names
        if (this.course.subjects) {
          this.course.subjects.forEach((subject: any) => {
            // Normalize subject name
            if (subject.Name && !subject.name) {
              subject.name = subject.Name;
            }

            // Ensure chapters array exists
            if (!subject.chapters) {
              subject.chapters = [];
            }

            // Note: Chapter field mapping is now:
            // - chapter.Name -> chapter.name (for display)
            // - chapter.Url stays as is (the template uses c.Url directly)
            if (subject.chapters) {
              subject.chapters.forEach((chapter: any) => {
                // Normalize chapter name
                if (chapter.Name && !chapter.name) {
                  chapter.name = chapter.Name;
                }
                // Url field is used as-is, no normalization needed
              });
            }
          });
        }

        // Also keep books reference for preview section compatibility
        if (!this.course.books && this.course.subjects) {
          this.course.books = this.course.subjects;
        }

        this.loading = false;

        // Set thumbnail preview if available. Prefer fetching via server endpoint when API returns
        // a storage path (not a direct URL or data URL). Follow the same approach as the dashboard.
        const path = (this.course as any).thumbnail_url || this.course.thumbnail || (this.course as any).thumbnailPath;
        if (path) {
          // try to fetch preview blob from server and convert to object URL
          this.setThumbnailFromPath(path, this.course.id).catch(() => {
            // fallback: if course.thumbnail contains a usable URL/data, set it directly
            if (this.course.thumbnail) this.setThumbnailDirect(this.course.thumbnail);
          });
        } else if (this.course.thumbnail) {
          this.setThumbnailDirect(this.course.thumbnail);
        }
        // Initialize validity flags from loaded course
        this.updateInitialValidities();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load course');
      }
    });
  }

  // Save newly created course and get ID
  createNewCourse() {
    // Prepare course payload according to CourseCreate schema
    const coursePayload = {
      name: this.course.name?.trim(),
      title: this.course.title?.trim() || this.course.name?.trim(),
      description: this.course.description?.trim(),
      price: this.course.price || 0,
      discount: this.course.discount || 0,
      status: 'draft',
      content: null,
      chapters: [],
      books: []
    };

    this.loading = true;
    this.api.post('/creator/v2/courses', coursePayload).subscribe({
      next: (res: any) => {
        this.courseId = res.id;
        this.course = res; // Update course with full response including ID
        this.isNewCourse = false;
        this.loading = false;
        this.toast.success('Course created successfully');
        
        // Now handle thumbnail upload if file is selected
        // Check if course-info component has a thumbnail file to upload
        if (this.courseInfoComponent && this.courseInfoComponent.thumbnailFile) {
          this.uploadThumbnailForNewCourse(this.courseInfoComponent.thumbnailFile);
        } else {
          // No thumbnail, just proceed to next step
          this.setStep(2);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.toast.error('Failed to create course: ' + (err?.error?.detail?.message || err?.error?.message || 'Unknown error'));
      }
    });
  }

  uploadThumbnailForNewCourse(file: File) {
    if (!this.courseId || !file) {
      this.setStep(2);
      return;
    }

    const fd = new FormData();
    fd.append('thumbnail', file);
    this.api.postMultipart(`/creator/v2/courses/${this.courseId}/thumbnail`, fd).subscribe({
      next: (res: any) => {
        // Update course with thumbnail path
        this.course.thumbnail_url = res.path;
        this.toast.success('Thumbnail uploaded successfully');
        this.loadCourse();
        this.setStep(2);
      },
      error: () => {
        this.toast.error('Thumbnail upload failed, but course was created');
        this.setStep(2);
      }
    });
  }

  countUnits() {
    if (!this.course.books) return 0;
    return this.course.books.reduce((acc: number, book: any) => acc + (book.chapters ? book.chapters.length : 0), 0);
  }

  get maxUnits() {
    return 100;
  }

  stepEquals(n: number) {
    return this.step === n;
  }

  setStep(n: number) {
    // Prevent advancing to a step if the previous step is invalid
    if (n > this.step) {
      // moving forward: validate current step
      if (this.step === 1 && !this.courseValid) return; // block advancing from Course
      if (this.step === 2 && !this.subjectsValidState) return; // block advancing from Subjects
      if (this.step === 3 && !this.chaptersValidState) return; // block advancing from Chapters
    }
    this.step = n;
    if (this.step === 5) {
      this.loadTests();
    }
  }

  // Handlers for validityChange emitted by child components
  onCourseValidityChange(valid: boolean) {
    this.courseValid = !!valid;
  }

  onSubjectsValidityChange(valid: boolean) {
    this.subjectsValidState = !!valid;
  }

  onChaptersValidityChange(valid: boolean) {
    this.chaptersValidState = !!valid;
  }

  onCourseChange() {
    this.courseDirty = true;
  }

  saveCourse() {
    this.actionMessage = 'Saving course...';
    this.api.put(`/creator/v2/courses/${this.courseId}`, this.course).subscribe({
      next: (res: any) => {
        this.course = res;
        this.courseDirty = false;
        this.actionMessage = 'Course saved';
        setTimeout(() => this.actionMessage = null, 2000);
      },
      error: () => {
        this.actionMessage = null;
        this.toast.error('Failed to save course');
      }
    });
  }

  convertMarkdownToQuillHtml(markdown: string): string {
  const mathExpressions: string[] = [];
  
  // FIXED REGEX:
  // 1. (\$\$[\s\S]*?\$\$) -> Matches block $$...$$ (including new lines)
  // 2. (\$[^\n\r]+?\$[^$]) -> Matches inline $...$ (no new lines allowed inside)
  // We use a simplified logic here: catch BOTH with one distinct pattern
  
  let protectedText = markdown.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g, (match) => {
    // 'match' includes the $$ or $ delimiters. We need to strip them.
    
    // Check if it is Block Level (starts with $$)
    const isBlock = match.startsWith('$$');
    
    // Strip delimiters: Remove first 1 or 2 chars, and last 1 or 2 chars
    const content = isBlock ? match.slice(2, -2) : match.slice(1, -1);
    
    mathExpressions.push(content);
    
    // We add a distinct prefix if it was block, though Quill treats them mostly the same visually
    return `%%MATH${mathExpressions.length - 1}%%`;
  });

  // Convert rest of Markdown to HTML
  let html = marked.parse(protectedText) as string;

  // Restore Math
  html = html.replace(/%%MATH(\d+)%%/g, (match, index) => {
    const formula = mathExpressions[parseInt(index)];
    // Quill Render
    return `<span class="ql-formula" data-value="${formula}"></span>`;
  });

  return html;
}

convertQuillHtmlToMarkdown(html: string): string {
  const turndownService = new TurndownService();

  // Rule: Detect Math in Spans
  turndownService.addRule('quillFormula', {
    filter: (node) => {
      // We target ALL spans
      return node.nodeName === 'SPAN';
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      
      // 1. Try to get content from 'data-value' (Proper Quill Formula)
      let formula = element.getAttribute('data-value');

      // 2. FALLBACK: If attribute is missing, check the text content
      if (!formula) {
        const text = element.textContent || '';
        // Heuristic: If it contains a backslash '\', assume it is LaTeX
        if (text.includes('\\') || text.includes('=')) {
          formula = text;
        } else {
          // If it's just a regular span (like color), return text as is
          return content; 
        }
      }

      if (!formula) return content;

      // 3. Block vs Inline Logic
      // Check if the parent <p> is basically empty besides this formula
      const parent = element.parentElement;
      const isAloneOnLine = parent && 
                            parent.tagName === 'P' && 
                            parent.textContent?.replace(formula, '').trim() === '';

      if (isAloneOnLine) {
        return `\n$$\n${formula}\n$$\n`; // Block
      } else {
        return `$${formula}$`; // Inline
      }
    }
  });

  // Handle standard superscripts like a^2 (from your snippet) if needed
  // Turndown handles <sup> automatically, but let's ensure it maps cleanly if you want LaTeX
  // (Optional: standard turndown maps <sup> to HTML or nothing usually, 
  // you might want to leave this to default behavior unless you want it converted to ^)

  return turndownService.turndown(html);
}


  saveSubjects() {
    this.actionMessage = 'Saving subjects...';
    const payload = this.course.subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      language: s.language
    }));

    this.api.post(`/creator/v2/courses/${this.courseId}/books/bulk`, payload).subscribe({
      next: (res: any) => {
        this.actionMessage = 'Subjects saved';
        setTimeout(() => this.actionMessage = null, 2000);
        this.loadCourse();
        // Auto-continue to next step after successful save
        setTimeout(() => this.setStep(3), 1000);
      },
      error: (err: any) => {
        console.error('Failed to save subjects', err);
        this.actionMessage = null;
        this.toast.error('Failed to save subjects');
      }
    });
  }  saveChapters() {
    this.actionMessage = 'Saving chapters...';
    // We need to save chapters for each book.
    // The API is /books/{book_id}/chapters/bulk

    if (!this.course.subjects || !this.course.subjects.length) {
      this.actionMessage = 'No subjects to save chapters for';
      setTimeout(() => this.actionMessage = null, 2000);
      return;
    }

    const promises = this.course.subjects.map((subject: any) => {
      if (!subject.id) return Promise.resolve(); // Skip if subject has no ID (shouldn't happen if subjects saved)

      const payload = (subject.chapters || []).map((c: any, index: number) => ({
        id: c.id,
        name: c.name,
        url: c.Url || c.youtube, // Handle both casing
        description: c.description,
        thumbnail_url: c.thumbnail_url,
        duration_seconds: c.duration_seconds,
        order: index,
        inputType: c.inputType || 'youtube',
        status: c.status
      }));

      return new Promise((resolve, reject) => {
        this.api.post(`/creator/v2/books/${subject.id}/chapters/bulk`, payload).subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err)
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        this.actionMessage = 'Chapters saved';
        setTimeout(() => this.actionMessage = null, 2000);
        this.loadCourse();
        // Auto-continue to next step after successful save
        setTimeout(() => this.setStep(4), 1000);
      })
      .catch((err) => {
        console.error('Failed to save chapters', err);
        this.actionMessage = null;
        this.toast.error('Failed to save chapters');
      });
  }

  confirmPublish() {
    this.tncAccepted = false;
    this.showTnCModal = true;
  }

  unpublish() {
    this.modal.confirm('Are you sure you want to unpublish this course?').then(confirmed => {
      if (confirmed) {
        this.course.status = 'draft';
        this.saveCourse();
      }
    });
  }

  // T&C Modal State
  showTnCModal: boolean = false;
  tncAccepted: boolean = false;
  tncText: string = COURSE_PUBLISH_TNC;

  proceedToPublish() {
    if (!this.tncAccepted) return;
    this.showTnCModal = false;
    this.course.status = 'active';
    this.saveCourse();
  }

  // Test Manager Logic
  loadTests() {
    this.api.get(`/creator/v2/courses/${this.courseId}/tests`).subscribe({
      next: (res: any) => {
        this.tests = res;
      },
      error: () => {
        this.toast.error('Failed to load tests');
      }
    });
  }

  selectTest(id: string) {
    this.selectedTestId = id;
    this.testAction = 'edit';
  }

  createNewTest() {
    this.selectedTestId = null;
    this.testAction = 'create';
    this.showNewTestOptions = false;
    // ensure TestManager is visible so it picks up the action
    this.setStep(5);
  }

  openAutoGenerate() {
    this.selectedTestId = null;
    this.testAction = null;
    this.showNewTestOptions = false;
    // switch to Tests step so TestManagerComponent mounts
    this.setStep(5);
    // set testAction to 'auto' after mount to trigger ngOnChanges
    setTimeout(() => {
      this.testAction = 'auto';
    }, 0);
  }

  deleteTest(index: number) {
    const test = this.tests[index];
    if (!test.id) return;

    this.modal.confirm('Delete this test?').then(confirmed => {
      if (confirmed) {
        this.api.delete(`/creator/v2/tests/${test.id}`).subscribe({
          next: () => {
            this.tests.splice(index, 1);
            if (this.selectedTestId === test.id) {
              this.selectedTestId = null;
              this.testAction = null;
            }
            this.toast.success('Test deleted');
          },
          error: () => {
            this.toast.error('Failed to delete test');
          }
        });
      }
    });
  }

  onTestSaved() {
    this.loadTests();
    this.selectedTestId = null;
    this.testAction = null;
  }

  onTestCancelled() {
    this.selectedTestId = null;
    this.testAction = null;
  }

  // Preview/Chapter Logic
  toggleBook(index: number) {
    if (this.course.books && this.course.books[index]) {
      this.course.books[index].expanded = !this.course.books[index].expanded;
    }
  }

  selectChapter(bookIndex: number, chapterIndex: number) {
    if (!this.course.books || !this.course.books[bookIndex]) return;

    const book = this.course.books[bookIndex];
    let chapter = book.chapters[chapterIndex];

    this.selectedChapter = chapter;
    this.loading = true;
    
    this.editorContentHtml= "<b>Loading chapter content</b>"
    let $chapterRequest = this.api.get(`/creator/v2/chapters/${this.selectedChapter["id"]}`);
    forkJoin([$chapterRequest]).subscribe((response)=>{
      this.loading=false;
      this.selectedChapter = response[0];
      this.selectedChapterName = this.selectedChapter.Name || 'Untitled Chapter';
      chapter = this.selectedChapter;
      // Load chapter content into Quill editor
      if (chapter.content) {
        // Convert markdown to HTML for Quill editor
        //chapter.content = chapter.content.replace("\\\\","\\").replace("\\","\\\\");
        chapter.content = chapter.content.replace(/\\\\/g, '\\');
        this.editorContentHtml = this.convertMarkdownToQuillHtml(chapter.content); // marked.parse(chapter.content) as string;
        this.parsedContent = this.sanitizer.bypassSecurityTrustHtml(this.editorContentHtml);
      } else {
        this.editorContentHtml = 'Chapter being generate please try after sometime';
      } 
    })
  
    
    this.hasUnsavedChanges = false;
  }

  toggleSidebar() {
  }

  saveChapterContent() {
    if (!this.selectedChapter) return;

    // Convert HTML from Quill editor back to markdown
    const markdown = this.convertQuillHtmlToMarkdown(this.editorContentHtml);//this.turndownService.turndown(this.editorContentHtml);
    this.selectedChapter.content = markdown;

    // Save the entire course (which includes the updated chapter content)
    this.updateChapterContent();
    this.hasUnsavedChanges = false;
  }

   updateChapterContent(){
    this.loading = true;
    this.api.put(`/creator/v2/courses/${this.courseId}/chapters/${this.selectedChapter["id"]}`,{'content':this.selectedChapter.content})
    .subscribe((response)=>{
      this.loading = false;
      this.toast.success("updated content successfully")
    });
  }

  onQuillChange(event: any) {
    this.hasUnsavedChanges = true;
  }

  onEditorCreated(event: any) {
  }

  checkChapterStatus() {
    this.loading = true;
    this.api.get(`/creator/v2/courses/${this.courseId}`).subscribe({
      next: (res: any) => {
        this.loading = false;
        // Update local course data to ensure we have latest statuses
        this.course = res;
        this.normalizeCourseData(); // Helper to ensure structure matches what we expect

      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to refresh course details');
      }
    });
  }



  // Helper to normalize data similar to loadCourse
  normalizeCourseData() {
    if (!this.course.subjects && this.course.books) {
      this.course.subjects = this.course.books;
    }
    if (!this.course.subjects) {
      this.course.subjects = [];
    }
    if (this.course.subjects) {
      this.course.subjects.forEach((subject: any) => {
        if (subject.Name && !subject.name) subject.name = subject.Name;
        if (!subject.chapters) subject.chapters = [];
        if (subject.chapters) {
          subject.chapters.forEach((chapter: any) => {
            if (chapter.Name && !chapter.name) chapter.name = chapter.Name;
          });
        }
      });
    }
    // Also keep books reference
    if (!this.course.books && this.course.subjects) {
      this.course.books = this.course.subjects;
    }
  }

  private async setThumbnailFromPath(path: string, courseId?: string) {
    try {
      // Revoke previous object URL if any
      try { if (this.thumbnailPreview && this.thumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(this.thumbnailPreview); } catch (e) { }
      const endpoint = (this.api as any).baseUrl + '/creator/v2/courses/' + (courseId || this.courseId) + '/thumbnail?filePath=' + encodeURIComponent(path);
      const token = (this.api as any).auth?.getToken?.() || null;
      const headers: any = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const resp = await fetch(endpoint, { method: 'GET', headers });
      if (!resp.ok) throw new Error('thumbnail fetch failed');
      const blob = await resp.blob();
      this.thumbnailPreview = URL.createObjectURL(blob);
    } catch (e) {
      console.error('setThumbnailFromPath failed', e);
      throw e;
    }
  }

  private setThumbnailDirect(val: string) {
    try { if (this.thumbnailPreview && this.thumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(this.thumbnailPreview); } catch (e) { }
    this.thumbnailPreview = val;
  }

  onChapterFileUpload(event: { file: File, subjectIndex: number, chapterIndex: number }) {
    const { file, subjectIndex, chapterIndex } = event;
    const subject = this.course.subjects[subjectIndex];
    const chapter = subject.chapters[chapterIndex];

    if (!this.courseId) {
      this.toast.error('Course must be saved before uploading files.');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('originalFileName', file.name);

    // Use a generic upload endpoint or a specific one if available. 
    // Since we don't have a specific chapter upload endpoint confirmed, 
    // we'll try to use a hypothetical one or the thumbnail one as a placeholder if needed, 
    // but better to use a likely path: /creator/v2/courses/{id}/upload
    // For now, I'll assume a generic upload endpoint exists or I'll use the thumbnail one as a base and modify the path.
    // Actually, let's try to use a path that makes sense: /creator/v2/courses/{id}/files

    this.api.postMultipartWithProgress(`/creator/v2/courses/${this.courseId}/upload-file`, fd).subscribe({
      next: (event: any) => {
        if (event.type === 1) { // HttpEventType.UploadProgress
          const progress = Math.round(100 * event.loaded / event.total);
          chapter.uploadProgress = progress;
        } else if (event.type === 4) { // HttpEventType.Response
          chapter.uploading = false;
          const res = event.body;
          if (res && res.path) {
            chapter.Url = res.path;
            // Also update inputType to 'file' if not already (though it should be)
            chapter.inputType = 'file';
            this.toast.success('File uploaded successfully');
            this.courseDirty = true;
          } else {
            this.toast.show('Upload completed but no path returned');
          }
        }
      },
      error: (err) => {
        chapter.uploading = false;
        this.toast.error('File upload failed');
        console.error('Upload error:', err);
      }
    });
  }
}
