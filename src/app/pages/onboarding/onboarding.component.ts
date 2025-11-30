import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from "@ionic/angular/standalone";

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  imports: [IonContent, IonIcon],
})


export class OnboardingComponent implements AfterViewInit {
  @ViewChild('slidesWrapper', { static: true }) slidesWrapper!: ElementRef;
  
  currentSlide = 0;
  totalSlides = 3;
  private touchStartX = 0;
  private touchEndX = 0;
  private minSwipeDistance = 50;

  constructor(private router: Router) {}

  ngAfterViewInit() {
    this.showSlide(this.currentSlide);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].screenX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent) {
    this.touchEndX = e.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private handleSwipe() {
    const swipeDistance = this.touchEndX - this.touchStartX;
    
    if (Math.abs(swipeDistance) < this.minSwipeDistance) return;

    if (swipeDistance > 0) {
      // Swipe right - previous slide
      this.previousSlide();
    } else {
      // Swipe left - next slide
      this.nextSlide();
    }
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
      this.showSlide(this.currentSlide);
    } else {
      this.navigateToMainApp();
    }
  }

  previousSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.showSlide(this.currentSlide);
    }
  }

  private showSlide(slideIndex: number) {
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    
    // Update wrapper transform for sliding effect
    if (this.slidesWrapper?.nativeElement) {
      this.slidesWrapper.nativeElement.style.transform = `translateX(-${slideIndex * 100}%)`;
    }
    
    // Update active states
    slides.forEach((slide, index) => {
      if (index === slideIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
    
    // Update indicators
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === slideIndex);
    });
    
    // Update button visibility
    this.updateButtonVisibility();
  }

  private updateButtonVisibility() {
    const skipButton = document.getElementById('skipButton');
    const getStartedButton = document.getElementById('getStartedButton');
    
    if (this.currentSlide === this.totalSlides - 1) {
      // Last slide
      if (skipButton) skipButton.style.display = 'none';
      if (getStartedButton) {
        getStartedButton.textContent = 'Get Started';
      }
    } else {
      // Not last slide
      if (skipButton) skipButton.style.display = 'block';
      if (getStartedButton) {
        getStartedButton.textContent = 'Next';
      }
    }
  }

  skipOnboarding() {
    this.navigateToMainApp();
  }

  getStarted() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.nextSlide();
    } else {
      this.navigateToMainApp();
    }
  }

   private navigateToMainApp() {
    localStorage.setItem('onboardingCompleted', 'true');
    this.router.navigate(['/tabs/home']);
  }
} 