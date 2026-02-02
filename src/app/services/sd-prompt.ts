import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SdPromptService {
  private apiUrl = 'http://127.0.0.1:11434/api/chat';

  generateSdPrompt(sceneText: string): Observable<string> {
    return this.generateOrUpdateSdPrompt(sceneText); // Reuse logic, no previous
  }

  // New: Update version
  updateSdPrompt(sceneText: string, previousPrompt: string): Observable<string> {
    return this.generateOrUpdateSdPrompt(sceneText, previousPrompt);
  }

  private generateOrUpdateSdPrompt(sceneText: string, previousPrompt: string = ''): Observable<string> {
    const subject = new Subject<string>();
    const systemContent = previousPrompt
      ? `You are an observer updating a visual description. Previous: ${previousPrompt}. Update with new details you SEE. Output updated comma-delimited list.`
      : 'You are an observer in this scene. List everything you SEE with your eyes in detail. Output a comma-delimited list of things you can only SEE in this scene.';

    const payload = {
      model: 'sd-prompt-gen',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: sceneText }
      ],
      stream: true
    };

    // ... (rest of the fetch/streaming logic unchanged—process NDJSON, emit deltas via subject)
    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(response => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const read = () => {
        reader?.read().then(({ done, value }) => {
          if (done) { subject.complete(); return; }
          buffer += decoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(line => {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                if (json.message?.content) subject.next(json.message.content);
              } catch {}
            }
          });
          read();
        });
      };
      read();
    }).catch(err => subject.error(err));

    return subject.asObservable();
  }
}
