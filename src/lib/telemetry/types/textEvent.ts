export interface TextEvent {
  old: string;
  new: string;
  offset: number;
  type: 'userInput' | 'reset' | 'undo' | 'redo' | 'paste';
}
