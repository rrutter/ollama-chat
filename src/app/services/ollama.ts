import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private apiUrl = 'http://localhost:11434/api/chat';

  // Non-streaming method (keep if needed)
  sendMessage(model: string, messages: any[]): Observable<any> {
    const payload = { model, messages, stream: false };
    return new Observable(observer => {
      fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          observer.next(data);
          observer.complete();
        })
        .catch(err => observer.error(err));
    });
  }

  getModels(): Observable<string[]> {
    return new Observable(observer => {
      fetch('http://localhost:11434/api/tags')
        .then(res => res.json())
        .then(data => {
          const models = data.models.map((m: any) => m.name); // Extract names like 'sakura-rp-dev-v2'
          observer.next(models);
          observer.complete();
        })
        .catch(err => observer.error(err));
    });
  }

  // New streaming method
  streamMessage(model: string, messages: any[]): Observable<string> {
    const payload = { model, messages, stream: true };
    const subject = new Subject<string>();

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readChunk = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              if (buffer) {
                // Process any remaining buffer
                try {
                  const json = JSON.parse(buffer);
                  if (json.message?.content) {
                    subject.next(json.message.content);
                  }
                } catch {} // Ignore parse errors on leftover
              }
              subject.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete lines (NDJSON)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            lines.forEach(line => {
              if (line.trim()) {
                try {
                  const json = JSON.parse(line);
                  if (json.message?.content) {
                    subject.next(json.message.content); // Emit the delta
                  }
                  if (json.done) {
                    subject.complete();
                  }
                } catch (err) {
                  subject.error(err);
                }
              }
            });

            readChunk(); // Continue reading
          }).catch(err => subject.error(err));
        };

        readChunk();
      })
      .catch(err => subject.error(err));

    return subject.asObservable();
  }
}
