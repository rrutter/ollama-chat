import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { OllamaService } from '../../services/ollama'; // Adjusted for your folder
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  standalone: true, // If using standalone components; otherwise keep in module
  imports: [FormsModule, CommonModule]
})
export class ChatComponent implements OnInit {
  messages: { role: string, content: string }[] = [];
  userInput: string = '';
  model: string = 'sakura-rp-dev-v2'; // Default
  availableModels: string[] = [];
  isLoading: boolean = false;

  constructor(private ollamaService: OllamaService,
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
        this.cdr.detectChanges(); // Force UI update on each chunk
        this.isLoading = false; // Hide "Typing..." after first delta (optional: move here if you want it gone ASAP)
      },
      error => {
        console.error('Error:', error);
        this.messages[pendingIndex].content = 'Oops, something went wrong!';
        this.cdr.detectChanges(); // Update on error too
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
        this.cdr.detectChanges(); // Final update
      }
    );
  }
}
