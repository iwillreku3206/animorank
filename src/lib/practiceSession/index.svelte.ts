import type { Problem, Slot } from '$lib/problem';
import { parseSlots } from '$lib/utils/parseSlots';
import type { PracticeSession as PracticeSessionModel } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import type { JsonValue } from '@zenstackhq/orm';

export type PracticeSessionData = {
  code: Record<string, string>;
  extensionData: Record<string, JsonValue>;
};

export type PreviousCodeSection = {
  slot: Slot;
  code: string;
};

export type PreviousCode = {
  fullCode: string;
  sections: PreviousCodeSection[];
};

export abstract class PracticeSession {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly model: PracticeSessionModel,
    // eslint-disable-next-line no-unused-vars
    protected problem: Problem,
    // eslint-disable-next-line no-unused-vars
    protected currentUser: User
  ) {}

  /**
   * Get the previous code from previous_state, combining the processed starter code
   * with any saved user code sections. Slots are resolved from the Problem.
   */
  public get previousCode(): PreviousCode {
    return this.problem.uses_slots
      ? parseSlots(this.problem.starter_code, this.getPreviousState().code)
      : {
          fullCode: this.getCodeSection('body') || '',
          sections: [
            {
              code: this.getCodeSection('body') || '',
              slot: {
                initialRange: [
                  1,
                  1,
                  1,
                  (this.getCodeSection('body') || '').replaceAll('\r\n', '\n').split('\n').at(-1)?.length || 0
                ],
                label: 'body'
              }
            }
          ]
        };
  }

  /**
   * Get all previous code sections as a plain object.
   */
  public getPreviousState(): PracticeSessionData {
    return (this.model.previous_state as PracticeSessionData) ?? { code: {}, extensionData: {} };
  }

  /**
   * Get code from a specific section.
   */
  public getCodeSection(section: string): string | undefined {
    return this.getPreviousState().code[section];
  }

  // Getters for model fields

  get id(): string {
    return this.model.id;
  }

  get problemId(): string {
    return this.model.problem_id;
  }

  get studentId(): string {
    return this.model.student_id;
  }

  get done(): boolean {
    return this.model.done;
  }

  set done(value: boolean) {
    this.model.done = value;
  }

  get createdAt(): Date {
    return this.model.created_at;
  }

  get updatedAt(): Date {
    return this.model.updated_at;
  }
}
