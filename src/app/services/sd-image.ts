import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SdImageService {
  private apiUrl = 'http://localhost:7860/sdapi/v1/txt2img'; // Your SD endpoint

  generateImage(prompt: string): Observable<string> {
    return new Observable(observer => {
      const payload = {
        prompt: prompt, // Your pendingSdPrompt
        negative_prompt: 'photorealistic, realistic, 3d, multiple views, multiple angle, split view, grid view, two shot, outside border, picture frame, framed, border, letterboxed, pillarboxed, 2koma, modern, recent, old, oldest, cartoon, graphic, text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured, long body, lowres, bad anatomy, bad hands, missing fingers, extra fingers, extra digits, fewer digits, cropped, very displeasing, (worst quality, bad quality:1.2), sketch, jpeg artifacts, signature, watermark, username, (censored, bar_censor, mosaic_censor:1.2), simple background, conjoined, bad ai-generated\n' +
          '        Steps: 20, Sampler: Euler a, CFG scale: 4.5, Global Seed: 428649103, Seed: 3941906949, Size: 768x1344, Clip skip: 2, Model hash: c9a587a3c0, Model: NovaMatureV4, Hires steps: 40, Hires upscale: 1.5, Hires Adjust: ("shadow": [0, 0, 0, 0.8, 1.0], "middle": [0, 0, 0, 0.9, 0.9], "highlight": [20, 0, 0, 1.1, 1.0]), Denoising strength: 0.4, Hires CFG Scale: 4', // Optional negatives
        steps: 20, // Tweak for quality/speed
        width: 512,
        height: 768, // Portrait for RP scenes
        sampler_name: 'Euler a', // Or your fave
        cfg_scale: 7, // Guidance
        seed: -1 // Random
      };

      fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          const base64Image = data.images[0]; // First image as base64
          observer.next(base64Image);
          observer.complete();
        })
        .catch(err => {
          console.error('SD API error:', err);
          observer.error(err);
        });
    });
  }
}
