import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-bubble',
  templateUrl: './chat-bubble.html',
  styleUrls: ['./chat-bubble.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ChatBubbleComponent {
  @Input() msg: { role: string, content: string } = { role: '', content: '' };
  @Input() isLastAssistant: boolean = false;
  @Output() regenerate = new EventEmitter<void>();
  @Output() generateImage = new EventEmitter<void>();
  @Input() hasSdPrompt: boolean = false;

  onGenerateImage() {
    this.generateImage.emit();
  }

  onRegenerate() {
    this.regenerate.emit();
  }
}
