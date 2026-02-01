import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { OllamaService } from '../../services/ollama';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatBubbleComponent} from '../chat-bubble/chat-bubble';
import { SdPromptService} from '../../services/sd-prompt';
import {SdImageService} from '../../services/sd-image';

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
  availableModels: string[] = []; //testing purposes only
  isLoading: boolean = false;
  //TODO: these need to go to a prompt class or interface probably
  generatedPrompt: string = '';
  pendingSdPrompt: string = '';

  //TODO: these need to go to an image class or interface probably
  generatedImage: string = ''; // Base64 image to display
  isGeneratingImage: boolean = false; // For spinner

  constructor(private ollamaService: OllamaService,
              private sdPromptService: SdPromptService,
              private sdImageService: SdImageService,
              private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.ollamaService.getModels().subscribe(
      models => {
        this.availableModels = models;
        // Ensure default is selected if available, else first one
        if (!this.availableModels.includes(this.model) && this.availableModels.length > 0) {
          this.model = this.availableModels[0];
        }
        this.cdr.detectChanges(); // Refresh UI if needed
      },
      error => console.error('Failed to load models:', error)
    );
  }

  generateSdImage(index: number) {
    if (this.pendingSdPrompt) {
      this.isGeneratingImage = true;
      this.generatedPrompt = this.pendingSdPrompt; // Optional: Show prompt
      this.cdr.detectChanges();

      this.sdImageService.generateImage(this.pendingSdPrompt).subscribe(
        base64Image => {
          this.generatedImage = `data:image/png;base64,${base64Image}`;
          this.isGeneratingImage = false;
          this.cdr.detectChanges();
          // Optional: Add as a new message { role: 'system', content: 'Generated Image', image: this.generatedImage }
        },
        error => {
          console.error('Image gen failed:', error);
          this.generatedPrompt = 'Oops, image gen failed!';
          this.isGeneratingImage = false;
          this.cdr.detectChanges();
        }
      );
      this.pendingSdPrompt = ''; // Clear for next
    } else {
      // Fallback if not prepped (rare)
      const scene = this.messages[index].content;
      this.generatedPrompt = 'Generating prompt...';
      this.sdPromptService.generateSdPrompt(scene).subscribe(
        delta => { this.generatedPrompt += delta; this.cdr.detectChanges(); },
        error => { this.generatedPrompt = 'Oops!'; },
        () => { /* Ready—chain to SD if wanted */ }
      );
    }
  }


  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    this.messages.push({ role: 'user', content: this.userInput });
    this.userInput = '';

    const pendingIndex = this.messages.push({ role: 'assistant', content: '' }) - 1;
    this.isLoading = true;

    const history = this.messages.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content }));

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

        // Background: Generate SD prompt from recent context (last 2 exchanges, up to 4 messages)
        const recentHistory = this.messages.slice(-4); // Safe for short chats
        const sceneText = recentHistory.map(msg =>
          `${msg.role === 'user' ? 'You' : 'Sakura'}: ${msg.content}`
        ).join('\n\n');

        this.pendingSdPrompt = ''; // Reset
        this.sdPromptService.generateSdPrompt(sceneText).subscribe(
          delta => { this.pendingSdPrompt += delta; },
          error => { console.error('Prompt gen failed'); },
          () => { console.log('SD prompt ready:', this.pendingSdPrompt); } // Or notify UI subtly
        );
      }
    );
  }

  regenerateMessage(index: number) {
    if (this.messages[index].role !== 'assistant') return; // Safety

    // Backup old content if you want undo, but for now, clear it
    this.messages[index].content = ''; // Show loading or empty
    this.isLoading = true;
    this.cdr.detectChanges();

    // Rebuild history up to the user's last message (before this assistant one)
    const history = this.messages.slice(0, index).map(msg => ({ role: msg.role, content: msg.content }));

    // Re-stream
    this.ollamaService.streamMessage(this.model, history).subscribe(
      delta => {
        this.messages[index].content += delta;
        this.cdr.detectChanges();
      },
      error => {
        this.messages[index].content = 'Oops, retry failed!';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    );
  }
}




