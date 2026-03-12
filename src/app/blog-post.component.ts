import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

export const BLOG_POSTS = [
  {
    id: 1,
    title: 'How AI Is Changing Homework Forever',
    image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80',
    tag: 'AI in Education',
    readTime: '8 min read',
    author: 'Mentorstreak Team',
    date: 'June 2025',
    content: `
      <p>Artificial intelligence (AI) is revolutionizing the way students approach and complete homework assignments. With instant doubt-solving, personalized feedback, and step-by-step guidance, AI is making learning more accessible and less stressful for everyone.</p>
       <hr class="my-6 border-accent/30">

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">1</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Personalized Learning Journeys</div>
          <p>AI-powered platforms analyze each student’s strengths and weaknesses, adapting the content and pace to suit individual needs. This means no more one-size-fits-all homework—students get targeted practice where they need it most, and can move ahead when they’re ready.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">2</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Instant Feedback and Support</div>
          <p>Gone are the days of waiting for teachers to grade assignments. AI tools provide instant feedback, helping students understand mistakes and learn from them immediately. This real-time support boosts confidence and encourages a growth mindset.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">3</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Reducing Homework Stress</div>
          <p>Homework can be a major source of stress for students and parents alike. AI helps by breaking down complex problems into manageable steps, offering hints, and even suggesting additional resources. This makes homework less intimidating and more productive.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">4</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Preparing for the Future</div>
          <p>As AI becomes more integrated into education, students are developing critical thinking and problem-solving skills that will serve them well in the future. By embracing AI, we’re not just making homework easier—we’re preparing the next generation for success in a rapidly changing world.</p>
        </div>
      </section>

      <hr class="my-6 border-accent/30">
      <h2 class="text-2xl font-bold text-primary mt-8 mb-4">Conclusion</h2>
      <p>AI is transforming homework from a chore into an opportunity for growth and discovery. With the right tools, every student can achieve their full potential.</p>
    `
  },
  {
    id: 2,
    title: '5 Learning Tips Backed by Science',
    image: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=800&q=80',
    tag: 'Learning Tips',
    readTime: '7 min read',
    author: 'Mentorstreak Team',
    date: 'June 2025',
    content: `
      <p>Want to study smarter, not harder? Here are five evidence-based tips to help you learn more effectively:</p>
      <hr class="my-6 border-accent/30">

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">1</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Space Out Your Study Sessions</div>
          <p>Research shows that spacing out your study sessions over several days helps you retain information better than cramming. Try reviewing material a little each day instead of all at once.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">2</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Practice Retrieval</div>
          <p>Testing yourself on what you’ve learned—using flashcards or practice quizzes—strengthens your memory and helps you identify gaps in your understanding.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">3</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Mix Up Subjects</div>
          <p>Interleaving, or mixing different subjects or types of problems, improves your ability to transfer knowledge and apply concepts in new situations.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">4</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Teach Someone Else</div>
          <p>Explaining concepts to someone else is a powerful way to reinforce your own understanding. If you can teach it, you truly know it!</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">5</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Take Care of Your Brain</div>
          <p>Good sleep, regular exercise, and healthy eating all contribute to better learning. Don’t underestimate the power of a healthy lifestyle on your academic performance.</p>
        </div>
      </section>

      <hr class="my-6 border-accent/30">
      <h2 class="text-2xl font-bold text-primary mt-8 mb-4">Conclusion</h2>
      <p>Incorporate these science-backed strategies into your routine and watch your learning soar!</p>
    `
  },
  {
    id: 3,
    title: 'Top 5 Ways Parents Can Stay Involved',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80',
    tag: 'Parenting',
    readTime: '6 min read',
    author: 'Mentorstreak Team',
    date: 'June 2025',
    content: `
      <p>Every parent wants to see their child thrive in school, but with busy schedules and ever-changing curriculums, staying involved can feel overwhelming. The good news? You don’t need to be a subject expert or have hours of free time to make a real difference. Here are five heartfelt, practical ways to stay engaged in your child’s learning journey—and help them shine, both in and out of the classroom.</p>
      <hr class="my-6 border-accent/30">

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">1</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Create a Positive Learning Environment at Home</div>
          <p>Children flourish in spaces where they feel safe, supported, and inspired. Set up a cozy, distraction-free study nook—maybe a corner of the living room or a spot by the window. Add a comfy chair, good lighting, and a few of your child’s favorite things. Even a small gesture, like a handwritten note of encouragement on their desk, can make homework time feel special.</p>
          <blockquote class="border-l-4 border-accent pl-4 italic my-4 text-accent/80">“My daughter loves when I leave her a little snack and a note before she starts her homework. It’s our way of connecting, even on busy days.” – A Mentorstreak Parent</blockquote>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">2</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Keep the Conversation Going with Teachers</div>
          <p>Teachers are your partners in your child’s education. Don’t hesitate to reach out—whether it’s a quick email, a chat at pickup, or attending school events. Ask about your child’s strengths, challenges, and how you can support learning at home. When your child sees you and their teacher working together, it sends a powerful message: their education matters.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">3</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Spark Curiosity Beyond the Classroom</div>
          <p>Learning doesn’t stop when the bell rings. Ask open-ended questions about what your child is exploring at school. Take a walk and talk about nature, cook together and discuss measurements, or watch a documentary as a family. Show genuine interest, and let your child teach you something new—they’ll love being the expert!</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">4</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Support Healthy Habits for Mind and Body</div>
          <p>Academic success is built on a foundation of healthy routines. Encourage regular sleep, nutritious meals, and movement breaks. Celebrate effort, not just results—praise your child for sticking with a tough assignment or trying a new approach. Remind them (and yourself!) that mistakes are part of learning and growth.</p>
        </div>
      </section>

      <section class="flex items-start gap-4 my-10">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">5</div>
        <div>
          <div class="font-extrabold text-xl md:text-2xl text-primary mb-2">Celebrate Progress, Big and Small</div>
          <p>Every step forward deserves recognition. Did your child finish a challenging project? Master a new skill? Show appreciation with words, a high-five, or a special family treat. Your encouragement fuels their motivation and builds resilience for future challenges.</p>
        </div>
      </section>

      <hr class="my-6 border-accent/30">
      <h2 class="text-2xl font-bold text-primary mt-8 mb-4">You’re Their Biggest Cheerleader</h2>
      <p>Remember, your involvement doesn’t require perfection—just presence and positivity. By showing up, asking questions, and celebrating the journey, you’re giving your child the greatest gift: the confidence to believe in themselves. Here’s to learning, growing, and thriving—together!</p>
    `
  }
];

@Component({
    selector: 'app-blog-post',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './blog-post.component.html',
    styles: [``]
})
export class BlogPostComponent {
  post: any;
  constructor(private route: ActivatedRoute, private router: Router) {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.post = BLOG_POSTS.find(p => p.id === id);
  }
  goBack() {
    this.router.navigate(['/blog']);
  }
}
