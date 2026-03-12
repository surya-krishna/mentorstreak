
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ApiService } from '../../../../api-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../../../modal.service';

@Component({
  selector: 'app-package-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './package-manager.component.html',
})

export class PackageManagerComponent implements OnInit {
  @Input() packages: any[] = [];
  @Input() course: any;
  @Output() packagesChange = new EventEmitter<any[]>();

  newPackage: any = this.getEmptyPackage();
  showForm = false;
  showErrors = false;

  constructor(
    public api: ApiService,
    private modal: ModalService
  ) { }

  ngOnInit() {
    this.fetchPackages();
  }

  getEmptyPackage() {
    return {
      name: '',
      price: null,
      discount: 0,
      duration: {
        value: null,
        unit: 'months', // or 'years'
      },
      features: {
        content: false,
        videos: false,
        tests: false,
        aiDoubt: false,
        aiAnalysis: false
      }
    };
  }

  addPackage() {
    this.showErrors = true;
    if (!this.isValidPackage(this.newPackage)) return;
    // API call to create package
    this.api.post(`/creator/v2/packages`, {
      ...this.newPackage,
      courseId: this.course?.id
    }).subscribe({
      next: () => {
        this.fetchPackages();
        this.newPackage = this.getEmptyPackage();
        this.showForm = false;
        this.showErrors = false;
      },
      error: (err: any) => {
        alert('Failed to create package: ' + (err?.message || 'Unknown error'));
      }
    });
  }

  isValidPackage(pkg: any) {
    return pkg.name && pkg.name.trim().length > 0 &&
      typeof pkg.price === 'number' && pkg.price >= 0 &&
      pkg.discount >= 0 && pkg.discount <= 100 &&
      (pkg.features.content || pkg.features.videos || pkg.features.tests || pkg.features.aiDoubt || pkg.features.aiAnalysis);
  }

  removePackage(idx: number) {
    const pkg = this.packages[idx];
    if (!pkg || !pkg.id) {
      this.modal.confirm('Are you sure you want to remove this package?').then(confirmed => {
        if (confirmed) {
          this.packages.splice(idx, 1);
          this.packagesChange.emit(this.packages);
        }
      });
      return;
    }
    
    // Confirm before deleting saved package
    this.modal.confirm('Are you sure you want to delete this package? This action cannot be undone.').then(confirmed => {
      if (confirmed) {
        // API call to delete package
        this.api.delete(`/creator/v2/packages/${pkg.id}`).subscribe({
          next: () => {
            this.fetchPackages();
          },
          error: (err: any) => {
            alert('Failed to delete package: ' + (err?.message || 'Unknown error'));
          }
        });
      }
    });
  }
  fetchPackages() {
    if (!this.course?.id) return;
    this.api.get(`/creator/v2/courses/${this.course.id}/packages`).subscribe(
      (pkgs: any) => {
        this.packages = pkgs;
        this.packagesChange.emit(this.packages);
      },
      (err: any) => {
        // Optionally show error to user
      }
    );
  }

  getDiscountedPrice(pkg: any): number {
    if (!pkg || typeof pkg.price !== 'number' || typeof pkg.discount !== 'number') return 0;
    return Math.round(pkg.price * (1 - (pkg.discount || 0) / 100));
  }

}
