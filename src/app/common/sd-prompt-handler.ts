import { Injectable } from '@angular/core';
import { SdPromptService } from '../services/sd-prompt';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SdPromptHandler {
  pendingSdPrompt: string = '';
  promptReady$ = new Subject<string>();

  constructor(private sdPromptService: SdPromptService) {}

  generatePromptInBackground(sceneText: string) {
    this.sdPromptService.generateSdPrompt(sceneText).subscribe(
      delta => { this.pendingSdPrompt += delta; },
      error => { console.error('Prompt gen failed'); },
      () => {
        console.log('SD prompt ready:', this.pendingSdPrompt);
        this.promptReady$.next(this.pendingSdPrompt);
      }
    );
  }

  // New: For updating existing prompt incrementally
  updatePromptInBackground(sceneText: string, previousPrompt: string = '') {
    this.pendingSdPrompt = ''; // Temp reset for accumulation
    this.sdPromptService.updateSdPrompt(sceneText, previousPrompt).subscribe(
      delta => { this.pendingSdPrompt += delta; },
      error => { console.error('Prompt update failed'); },
      () => {
        console.log('Updated SD prompt ready:', this.pendingSdPrompt);
        this.promptReady$.next(this.pendingSdPrompt);
      }
    );
  }

  getPendingPrompt(): string {
    return this.pendingSdPrompt;
  }

  clearPendingPrompt() {
    this.pendingSdPrompt = '';
  }
}
