import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { OllamaService } from '../../services/ollama';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatBubbleComponent} from '../chat-bubble/chat-bubble';
import { SdPromptService} from '../../services/sd-prompt';

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
  model: string = 'sakura-rp-dev-v2'; // Default
  availableModels: string[] = [];
  isLoading: boolean = false;
  generatedPrompt: string = ''; // For displaying the final prompt (optional)
  pendingSdPrompt: string = ''; // Background-generated prompt

  constructor(private ollamaService: OllamaService,
              private sdPromptService: SdPromptService,
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
      this.generatedPrompt = this.pendingSdPrompt; // Display it, or send to SD here later
      this.cdr.detectChanges();
      // TODO: Chain to SD gen if ready (e.g., this.sdPromptService.generateImage(this.pendingSdPrompt))
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

  // ... regenerateMessage unchanged ...

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




