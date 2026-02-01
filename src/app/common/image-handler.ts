import { Injectable } from '@angular/core';
import { SdImageService } from '../services/sd-image';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageHandler {
  generatedImage$ = new BehaviorSubject<string>(''); // Observable for image
  isGenerating$ = new BehaviorSubject<boolean>(false); // For spinner

  constructor(private sdImageService: SdImageService) {}

  generateImageFromPrompt(prompt: string): void {
    this.isGenerating$.next(true);
    this.sdImageService.generateImage(prompt).subscribe(
      base64Image => {
        this.generatedImage$.next(`data:image/png;base64,${base64Image}`);
        this.isGenerating$.next(false);
      },
      error => {
        console.error('Image gen failed:', error);
        this.isGenerating$.next(false);
      }
    );
  }
}
