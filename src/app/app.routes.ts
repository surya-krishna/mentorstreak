import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { BlogComponent } from './blog.component';
import { AboutComponent } from './about.component';
import { ContactComponent } from './contact.component';
import { BlogPostComponent } from './blog-post.component';
import { DeleteAccountComponent } from './delete-account.component';
import { CreatorLoginComponent } from './creators/creator-login/creator-login.component';
import { CreatorSignupComponent } from './creators/creator-signup/creator-signup.component';
import { CreatorDashboardComponent } from './creators/creator-dashboard/creator-dashboard.component';
import { NewCourseComponent } from './creators/new-course/new-course.component';
import { ViewCourseComponent } from './creators/view-course/view-course.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'blog/:id', component: BlogPostComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  {
    path: 'delete-account-request',
    component: DeleteAccountComponent
  },
  { path: 'creator/login', component: CreatorLoginComponent },
  { path: 'creator/signup', component: CreatorSignupComponent },
  { path: 'creator/profile', component: CreatorSignupComponent },
  { path: 'creator/dashboard', component: CreatorDashboardComponent },
  { path: 'creator/courses/new', component: NewCourseComponent },
  { path: 'creator/courses/:id', component: ViewCourseComponent },
];
