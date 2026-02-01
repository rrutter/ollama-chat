import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SdPromptService {
  private apiUrl = 'http://127.0.0.1:11434/api/chat'; // Separate Ollama instance

  generateSdPrompt(sceneText: string): Observable<string> {
    const subject = new Subject<string>();
    const payload = {
      model: 'sd-prompt-gen',
      messages: [
        { role: 'system', content: 'You are an observer in this scene. List everything you SEE with your eyes in detail.' },
       // { role: 'user', content: `Generate an SD prompt for this scene: ${sceneText}` }
        { role: 'user', content: `Output a comma delimited list of things you can only SEE in this scene: ${sceneText}` }
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
