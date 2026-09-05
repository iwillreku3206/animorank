/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */

declare module 'constrained-editor-plugin' {
  import * as monaco from 'monaco-editor';
  // ---------------------------------------------------------------------------
  // Public API exposed by constrainedEditor (the factory function)
  // ---------------------------------------------------------------------------

  interface ConstrainedEditorInstance {
    /**
     * Initialise the constrainer on a Monaco editor instance.
     * Registers a keydown listener that intercepts edits at checkpoint
     * boundaries (editable / non-editable transitions).
     * @returns `true` on success
     */
    initializeIn(editorInstance: monaco.editor.ICodeEditor): boolean;

    /**
     * Add restrictions to a model so that only the specified ranges are
     * editable.
     * @returns the constrained model (the original model augmented with
     *          restriction-related methods and properties).
     */
    addRestrictionsTo(model: monaco.editor.ITextModel, ranges: RangeRestrictionObject[]): ConstrainedModel;

    /**
     * Remove all restriction-related APIs and listeners from a model.
     * @returns the model itself if restrictions were present, otherwise
     *          `false`.
     */
    removeRestrictionsIn(model: monaco.editor.ITextModel): monaco.editor.ITextModel | false;

    /**
     * Dispose the constrainer instance — removes event listeners, cleans
     * up the model restriction map, and clears internal state.
     * @returns `true` if the instance was successfully disposed.
     */
    disposeConstrainer(): boolean;

    /**
     * Toggle developer mode on the editor instance.  When enabled a
     * context-menu action "Show Range in console" is added so that the
     * developer can inspect the raw range of the current selection.
     */
    toggleDevMode(): void;
  }

  // ---------------------------------------------------------------------------
  // Range restriction definition
  // ---------------------------------------------------------------------------

  /**
   * A single editable range definition.
   *
   * `range` is a zero-based 4-element tuple:
   *   `[ startLineNumber, startColumn, endLineNumber, endColumn ]`
   *
   * All values are 1-based (Monaco convention).  Negative column and
   * line values are treated as offsets from the end of the line / file.
   */
  interface RangeRestrictionObject {
    /**
     * Four-element range tuple.
     * `[ startLineNumber, startColumn, endLineNumber, endColumn ]`
     */
    range: [number, number, number, number];

    /**
     * A human-readable label for this restriction.  Used as the key in
     * the object returned by `getValueInEditableRanges()` and
     * `getCurrentEditableRanges()`.  If omitted, a default label
     * `[startLine,startCol -> endLine,endCol]` is generated.
     */
    label?: string;

    /**
     * When `true` the editable range may span multiple lines.  If the
     * range definition itself spans multiple lines this flag is
     * auto-detected unless explicitly overridden.
     *
     * When `false` (the default), attempts to enter multi-line content
     * in the range will be rejected (the edit is undone).
     */
    allowMultiline?: boolean;

    /**
     * A validation callback invoked after every content change in this
     * range.  Returning `false` causes the edit to be undone.
     *
     * @param currentlyTypedValue — the new text content of the range
     * @param newRange            — the updated `monaco.Range` after the change
     * @param lastInfo            — an object describing the nature of the
     *                              last edit (see `RangeChangeInfo`).
     */
    validate?: (currentlyTypedValue: string, newRange: monaco.Range, lastInfo: RangeChangeInfo | undefined) => boolean;
  }

  // ---------------------------------------------------------------------------
  // Range change info (passed to `validate`)
  // ---------------------------------------------------------------------------

  interface RangeChangeInfo {
    isAddition: boolean;
    isDeletion: boolean;
    isReplacement: boolean;
    startLineOfRange: boolean;
    startColumnOfRange: boolean;
    endLineOfRange: boolean;
    endColumnOfRange: boolean;
    middleLineOfRange: boolean;
    rangeIsSingleLine: boolean;
    rangeIsMultiLine: boolean;
  }

  // ---------------------------------------------------------------------------
  // Constrained model — the ITextModel augmented with restriction APIs
  // ---------------------------------------------------------------------------

  interface ConstrainedModel extends monaco.editor.ITextModel {
    // --- Flags (enumerable: false on the real model) ------------------------

    /** `true` if this model has restrictions active. */
    _isRestrictedModel: boolean;

    /** Internal flag tracking whether the last restricted value was valid. */
    _isRestrictedValueValid: boolean;

    /**
     * Set this flag to `true` before calling `model.undo()` directly if you
     * want the undo to be allowed even while restrictions are active.
     */
    editInRestrictedArea: boolean;

    // --- Reading current editable ranges -----------------------------------

    /**
     * Returns an object keyed by `label` whose values describe the current
     * state of every editable range.
     */
    getCurrentEditableRanges(): Record<string, EditableRangeInfo>;

    /**
     * Returns an object keyed by `label` whose values are the current text
     * content of every editable range.
     */
    getValueInEditableRanges(): Record<string, string>;

    // --- Programmatic value updates ----------------------------------------

    /**
     * Update the text inside editable ranges programmatically.
     *
     * @param object      — an object keyed by `label`, values are the new
     *                       text for each corresponding range.
     * @param forceMoveMarkers — if `true`, existing markers are moved with
     *                            the edited text (default `false`).
     */
    updateValueInEditableRanges(object: Record<string, string>, forceMoveMarkers?: boolean): void;

    // --- Listener for content changes inside editable ranges ---------------

    /**
     * Subscribe to content changes that occur within any editable range.
     * The callback receives the *currently edited ranges* (partial
     * changes) and *all values* (full snapshot), plus the current
     * editable ranges structure.
     *
     * @returns void
     */
    onDidChangeContentInEditableRange(
      callback: (
        currentChanges: Record<string, string>,
        allChanges: Record<string, string>,
        currentRanges: Record<string, EditableRangeInfo>
      ) => void
    ): void;

    // --- Updating the restriction set itself --------------------------------

    /**
     * Replace the existing restriction definitions with a new set.
     *
     * @param ranges — new array of `RangeRestrictionObject`.
     */
    updateRestrictions(ranges: RangeRestrictionObject[]): void;

    // --- Highlighting editable areas --------------------------------------

    /**
     * Toggle visual highlighting of editable areas.  Call again to turn
     * off.
     *
     * @param cssClasses — optional override for CSS class names.
     */
    toggleHighlightOfEditableAreas(cssClasses?: {
      cssClassForSingleLine?: string;
      cssClassForMultiLine?: string;
    }): void;

    // --- Cleanup -----------------------------------------------------------

    /**
     * Remove all restriction-related methods and properties from the model.
     * @returns the model itself.
     */
    disposeRestrictions(): monaco.editor.ITextModel;
  }

  // ---------------------------------------------------------------------------
  // Info about a single editable range (returned by getCurrentEditableRanges)
  // ---------------------------------------------------------------------------

  interface EditableRangeInfo {
    /** Whether the range allows multi-line content. */
    allowMultiline: boolean;
    /** Index of this restriction in the original array. */
    index: number;
    /** Current Monaco Range object (shallow copy). */
    range: monaco.Range;
    /** The original range tuple before any normalisation. */
    originalRange: number[];
  }

  // ---------------------------------------------------------------------------
  // Factory function
  // ---------------------------------------------------------------------------

  /**
   * Creates a constrained editor instance.
   *
   * @param monaco — the Monaco editor global (imported as `import * as monaco from 'monaco-editor'`
   *                 or the `monaco` namespace from the UMD / AMD build).
   * @returns an instance of `ConstrainedEditorInstance`.
   *
   * @example
   * ```ts
   * import * as monaco from 'monaco-editor';
   * import constrainedEditor from 'constrained-editor-plugin';
   *
   * const constrainer = constrainedEditor(monaco);
   * const editor = monaco.editor.create(container, { value: 'hello', language: 'javascript' });
   * constrainer.initializeIn(editor);
   * const model = editor.getModel()!;
   * constrainer.addRestrictionsTo(model, [
   *   { range: [1, 1, 1, 5], label: 'greeting' }
   * ]);
   * ```
   */
  function constrainedEditor(monaco: typeof import('monaco-editor')): ConstrainedEditorInstance;

  // ---------------------------------------------------------------------------
  // deepClone utility export
  // ---------------------------------------------------------------------------

  /**
   * Creates a deep clone of a JavaScript value.
   *
   * The returned function also exposes three static helpers:
   * - `withProto` — include prototype chain properties
   * - `andFreeze` — freeze the cloned result
   * - `withProtoAndFreeze` — both of the above
   */
  const deepClone: {
    <T>(value: T): T;
    withProto: { <T>(value: T): T };
    andFreeze: { <T>(value: T): T };
    withProtoAndFreeze: { <T>(value: T): T };
  };

  // ---------------------------------------------------------------------------
  // Enums export
  // ---------------------------------------------------------------------------

  const enums: {
    /** CSS class name applied to single-line editable area highlights. */
    SINGLE_LINE_HIGHLIGHT_CLASS: string;
    /** CSS class name applied to multi-line editable area highlights. */
    MULTI_LINE_HIGHLIGHT_CLASS: string;
  };

  export = constrainedEditor;
}
