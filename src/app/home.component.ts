import { AfterViewInit, ElementRef, ViewChild, OnDestroy, HostListener, Component } from '@angular/core';
import * as THREE from 'three';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-home',
  standalone: true,
    imports: [CommonModule],
    templateUrl: './home.component.html',
    styles: [`
    :host {
      --primary: #5f6fff;
      --accent: #a259ff;
      --cyan: #00d4ff;
      --background: #0a0a12;
      --surface1: #181a2a;
      --surface2: #23244a;
      --white: #fff;
    }
    .three-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      outline: none;
      z-index: -1;
    }
    .content-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      flex-direction: column;
      pointer-events: none;
    }
    .content-overlay > * {
      pointer-events: auto;
      background: rgba(24,26,42,0.15);
      border-radius: 1rem;
      box-shadow: 0 4px 32px 0 rgba(31, 38, 135, 0.17);
    }
    h1 {
      color: var(--white);
    }
    a {
      font-family: 'Inter', sans-serif;
    }
    @keyframes fade-in-down {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes gradient-shift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }
    .animate-fade-in-down {
      animation: fade-in-down 1s ease-out forwards;
      opacity: 0;
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.8s ease-out forwards;
      opacity: 0;
    }
    .animate-gradient {
      background-size: 200% 200%;
      animation: gradient-shift 3s ease infinite;
    }
  `]
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private lineSystem!: THREE.LineSegments;
  private animationId!: number;
  private mouseX = 0;
  private mouseY = 0;
  private sizes = { width: window.innerWidth, height: window.innerHeight };

  showAppPopup = false;
  showIos = true;

  ngAfterViewInit() {
    this.initThreeJS();
    this.animate();
    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer?.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    document.removeEventListener('mousemove', this.onDocumentMouseMove.bind(this));
  }

  private initThreeJS() {
    // Scene with dark background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a12');
    this.scene.fog = new THREE.Fog('#0a0a12', 100, 1000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);
    this.camera.position.z = 50;

    // Renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      alpha: false,
      precision: 'highp',
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.LinearToneMapping;

    // Add ambient lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(ambientLight);

    // --- PARTICLES CREATION ---
    const particleCount = 10000; // Increased for more visual impact
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // Enhanced color palette: Cyan -> Blue -> Purple
    const color1 = new THREE.Color('#00d4ff'); // Bright Cyan
    const color2 = new THREE.Color('#00a8ff'); // Medium Cyan-Blue
    const color3 = new THREE.Color('#5f6fff'); // Primary Blue
    const color4 = new THREE.Color('#a259ff'); // Accent Purple
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 20 + Math.random() * 35;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      
      positions[i3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Create smooth color gradient
      const colorMix = Math.random();
      let mixedColor;
      if (colorMix < 0.5) {
        mixedColor = color1.clone().lerp(color2, colorMix * 2);
      } else {
        mixedColor = color3.clone().lerp(color4, (colorMix - 0.5) * 2);
      }
      
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      
      // Vary particle sizes for depth
      sizes[i] = Math.random() * 0.5 + 0.1;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
      fog: false
    });
    this.particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(this.particleSystem);

    // --- ENHANCED NEURAL NETWORK LINES CREATION ---
    const lineVertices: number[] = [];
    const lineColors: number[] = [];
    const connectionDistance = 7; // Slightly increased for more connections
    const particlePositions = particlesGeometry.attributes['position'];
    const particleColors = particlesGeometry.attributes['color'];
    
    for (let i = 0; i < particleCount; i++) {
      const p1 = new THREE.Vector3().fromBufferAttribute(particlePositions, i);
      const c1 = new THREE.Color().fromBufferAttribute(particleColors, i);
      let connections = 0;
      
      for (let j = i + 1; j < Math.min(i + 200, particleCount); j++) {
        const p2 = new THREE.Vector3().fromBufferAttribute(particlePositions, j);
        const distance = p1.distanceTo(p2);
        
        if (distance < connectionDistance) {
          lineVertices.push(p1.x, p1.y, p1.z);
          lineVertices.push(p2.x, p2.y, p2.z);
          
          // Color lines based on connecting particles - create gradient effect
          const c2 = new THREE.Color().fromBufferAttribute(particleColors, j);
          lineColors.push(c1.r, c1.g, c1.b);
          lineColors.push(c2.r, c2.g, c2.b);
          
          connections++;
          if (connections > 3) break; // Increased from 2 to 3 for more dense network
        }
      }
    }
    
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lineColors), 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.12, // Increased from 0.05 for better visibility
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.scene.add(this.lineSystem);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const elapsedTime = performance.now() * 0.001;
    
    // Enhanced rotation with multiple axes for more dynamic effect
    const rotationSpeed = 0.03;
    this.particleSystem.rotation.y = elapsedTime * rotationSpeed;
    this.particleSystem.rotation.x = elapsedTime * rotationSpeed * 0.3;
    
    this.lineSystem.rotation.y = elapsedTime * rotationSpeed;
    this.lineSystem.rotation.x = elapsedTime * rotationSpeed * 0.3;
    
    // Smooth camera following with easing
    this.camera.position.x += (this.mouseX * 8 - this.camera.position.x) * 0.03;
    this.camera.position.y += (-this.mouseY * 8 - this.camera.position.y) * 0.03;
    
    // Slight Z-axis wobble for more dynamic feel
    this.camera.position.z = 50 + Math.sin(elapsedTime * 0.3) * 2;
    
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;
    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private onDocumentMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX - this.sizes.width / 2) / (this.sizes.width / 2);
    this.mouseY = (event.clientY - this.sizes.height / 2) / (this.sizes.height / 2);
  }

  openAppPopup(showIos: boolean = true) {
    this.showAppPopup = true;
    this.showIos = showIos;
  }
  closeAppPopup() {
    this.showAppPopup = false;
  }
  redirectToAndroid() {
    window.open('https://play.google.com/store/apps/details?id=com.adroytz.mentorstreak', '_blank');
  }
  redirectToIos() {
    window.open('https://apps.apple.com/app/id1234567890', '_blank');
  }
}