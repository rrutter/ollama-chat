import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SdPromptService {
  private apiUrl = 'http://localhost:11434/api/chat'; // Separate Ollama instance

  generateSdPrompt(sceneText: string): Observable<string> {
    const subject = new Subject<string>();
    const payload = {
      model: 'sd-prompt-gen',
      messages: [
        { role: 'system', content: 'You are an expert Stable Diffusion prompt generator. Given a scene description, create a concise, keyword-packed prompt optimized for SD: Start with key subject/action, add descriptors (highly detailed, masterpiece, 8k), styles (by greg rutkowski), weights (ethereal:1.2), negatives (ugly:-1.0). Keep it under 200 tokens.' },
        { role: 'user', content: `Generate an SD prompt for this scene: ${sceneText}` }
      ],
      stream: true // Stream for real-time feel
    };

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(response => {
      // Similar streaming parser as your Ollama service—process NDJSON chunks
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
