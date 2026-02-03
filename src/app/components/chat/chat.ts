import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { OllamaService } from '../../services/ollama';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatBubbleComponent} from '../chat-bubble/chat-bubble';
import { SdPromptHandler } from '../../common/sd-prompt-handler';
import { ImageHandler } from '../../common/image-handler';
import {SdPromptService} from '../../services/sd-prompt';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, ChatBubbleComponent]
})
export class ChatComponent implements OnInit {
  messages: { role: string, content: string }[] = [];
  userInput: string = '';
  model: string = 'sakura-rp-dev-v2';
  availableModels: string[] = [];
  isLoading: boolean = false;
  generatedImage: string = '';
  isGenerating: boolean = false;

  constructor(private ollamaService: OllamaService,
              private sdPromptService: SdPromptService,
              protected promptHandler: SdPromptHandler,
              public imageGenerator: ImageHandler,
              private cdr: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.initImageGenListeners();
    this.loadAvailableModels();
    this.promptHandler.promptReady$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  initImageGenListeners(){
    this.imageGenerator.generatedImage$.subscribe(image => {
      this.generatedImage = image;
      this.cdr.detectChanges();
    });
    this.imageGenerator.isGenerating$.subscribe(isGen => {
      this.isGenerating = isGen;
      this.cdr.detectChanges();
    });
  }

  private loadAvailableModels(): void {
    this.ollamaService.getModels().subscribe({
      next: models => {
        this.availableModels = models;
        if (!this.availableModels.includes(this.model) && this.availableModels.length > 0) {
          this.model = this.availableModels[0];
          this.cdr.markForCheck();
        }
      },
      error: err => console.error('Failed to load models:', err)
    });
  }

  generateSdImage(index: number) {
    const prompt = this.promptHandler.getPendingPrompt();
    if (prompt) {
      this.imageGenerator.generateImageFromPrompt(prompt);
    } else {
      const startSlice = Math.max(0, index - 3);
      const recentHistory = this.messages.slice(startSlice, index + 1);
      const sceneText = recentHistory.map(msg =>
        `${msg.role === 'user' ? 'User' : 'Character'}: ${msg.content}`
      ).join('\n\n');

      if (!sceneText.trim()) {
        console.debug('No valid scene text found for prompt generation');
        return;
      }

      this.promptHandler.pendingSdPrompt = '';

      this.sdPromptService.generateSdPrompt(sceneText).subscribe({
        next: delta => {
          this.promptHandler.pendingSdPrompt += delta;
        },
        error: err => console.error('Fallback prompt failed:', err),
        complete: () => {
          const generatedPrompt = this.promptHandler.getPendingPrompt();
          if (generatedPrompt.trim()) {
            this.imageGenerator.generateImageFromPrompt(generatedPrompt);
          } else {
            console.debug('Fallback generated an empty prompt');
          }
        }
      });
    }
  }

  private streamResponse(isRegenerate: boolean = false, index?: number) {
    let pendingIndex: number;

    if (isRegenerate) {
      if (index === undefined)index=this.messages.length-1;
      this.messages[index].content = '';
      pendingIndex = index;
    } else {
      if (!this.userInput.trim() || this.isLoading) return;
      this.messages.push({role: 'user', content: this.userInput});
      this.userInput = '';
      pendingIndex = this.messages.push({role: 'assistant', content: ''}) - 1;
      this.promptHandler.clearPendingPrompt();
    }

    this.isLoading = true;

    const history = this.messages.slice(0, pendingIndex).map(msg => ({role: msg.role, content: msg.content}));

    this.ollamaService.streamMessage(this.model, history).subscribe(
      delta => {
        this.messages[pendingIndex].content += delta;
        this.cdr.detectChanges();
        this.isLoading = false;
      },
      error => {
        console.error('Error:', error);
        this.messages[pendingIndex].content = 'Oops, something went wrong!';
        this.cdr.detectChanges();
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
        this.cdr.detectChanges();

        const previousPrompt = this.promptHandler.getPendingPrompt();

        const recentHistory = this.messages.slice(-4);
        const sceneText = recentHistory.map(msg =>
          `${msg.role === 'user' ? 'User' : 'Character'}: ${msg.content}`
        ).join('\n\n');

        if (previousPrompt) {
          this.promptHandler.updatePromptInBackground(sceneText, previousPrompt);
        } else {
          this.promptHandler.generatePromptInBackground(sceneText);
        }
      }
    );
  }


  sendMessage() {
    this.streamResponse();
  }

  regenerateMessage(index: number) {
    this.promptHandler.clearPendingPrompt();
    this.streamResponse(true, index);
  }
}




