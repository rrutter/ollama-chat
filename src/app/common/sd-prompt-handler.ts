import { Injectable } from '@angular/core';
import { SdPromptService } from '../services/sd-prompt';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SdPromptHandler {
  pendingSdPrompt: string = '';
  promptReady$ = new Subject<string>(); // Observable for when prompt's done (optional for UI notifications)

  constructor(private sdPromptService: SdPromptService) {}

  generatePromptInBackground(sceneText: string) {
    this.pendingSdPrompt = ''; // Reset
    this.sdPromptService.generateSdPrompt(sceneText).subscribe(
      delta => { this.pendingSdPrompt += delta; },
      error => { console.error('Prompt gen failed'); },
      () => {
        console.log('SD prompt ready:', this.pendingSdPrompt);
        this.promptReady$.next(this.pendingSdPrompt); // Notify if needed
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
