import type { PreviousCodeSection } from '$lib/practiceSession/index.svelte';
import { parseSlots } from '$lib/utils/parseSlots';
import type { Problem as ProblemModel } from '$lib/zenstack/models';

export interface Slot {
  label: string;
  initialRange: [number, number, number, number]; // startLine, startColumn, endLine, endColumn
}

export class Problem {
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly model: ProblemModel) {}

  /**
   * Parse the starter_code and extract slot information.
   * If uses_slots is disabled, returns a single "body" slot covering the entire code.
   */
  getSlots(): Slot[] {
    const parsed = parseSlots(this.starter_code);
    return parsed.sections.map((section) => section.slot);
  }

  /**
   * Return the starter_code with slot/endslot markers removed.
   */
  getProcessedCode(): string {
    const parsed = parseSlots(this.starter_code);
    return parsed.fullCode;
  }

  /**
   * Return the default sections
   */
  getDefaultSections(): PreviousCodeSection[] {
    const parsed = parseSlots(this.starter_code);
    return parsed.sections;
  }

  // Getters for Problem model fields

  get id(): string {
    return this.model.id;
  }

  get name(): string {
    return this.model.name;
  }

  get description(): string {
    return this.model.description;
  }

  get starter_code(): string {
    return this.model.starter_code;
  }

  get visible(): boolean {
    return this.model.visible;
  }

  get uses_slots(): boolean {
    return this.model.uses_slots === true;
  }

  get difficulty_id(): string | null {
    return this.model.difficulty_id;
  }

  get subject_id(): string | null {
    return this.model.subject_id;
  }
}
