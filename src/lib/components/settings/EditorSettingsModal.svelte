<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Select from '$lib/components/ui/selects/Select.svelte';
  import Toggle from '$lib/components/ui/toggles/Toggle.svelte';
  import PaletteIcon from '@iconify-svelte/fa6-solid/palette';
  import IndentIcon from '@iconify-svelte/fa6-solid/indent';
  import CodeIcon from '@iconify-svelte/fa6-solid/code';
  import {
    editorSettings,
    FONT_SIZE_MAX,
    FONT_SIZE_MIN,
    TAB_SIZES,
    type EditorSettings
  } from '$lib/editor/settings.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let dialog = $state<HTMLDialogElement | null>(null);

  // Drive the native <dialog> from `open` so we inherit the platform's focus
  // trap, Esc-to-close and focus restoration instead of reimplementing them.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // `showModal` focuses the first element carrying a tabindex, which is the
      // tablist container (it only has one to satisfy the ARIA linter) — that
      // paints a UA focus ring around the whole rail. Put focus on the selected
      // tab instead, which is where a keyboard user should start.
      dialog.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  // Bound directly, so every change applies to the live editors behind the
  // dialog and persists on its own — there is no save step.
  let settings = $derived(editorSettings.current);

  // Adding a category is one entry here plus one `{#if}` branch in the pane;
  // the dialog's size never changes, which is the point of the rail.
  const categories = [
    { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
    { id: 'indentation', label: 'Indentation', icon: IndentIcon },
    { id: 'editing', label: 'Editing', icon: CodeIcon }
  ] as const;

  let active = $state<(typeof categories)[number]['id']>('appearance');

  const lineNumberModes: { value: EditorSettings['lineNumbers']; label: string }[] = [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
    { value: 'relative', label: 'Relative' }
  ];

  // Vertical tablist convention: Up/Down move, Home/End jump.
  function onRailKeydown(e: KeyboardEvent) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const index = categories.findIndex((c) => c.id === active);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? categories.length - 1
          : (index + (e.key === 'ArrowDown' ? 1 : -1) + categories.length) % categories.length;
    active = categories[next].id;
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }
</script>

<!-- One settings row: label (and optional hint) left, control right. Rows are
     separated by hairlines rather than boxed into cards, so a category reads as
     one list however many settings it grows to hold. -->
{#snippet row(label: string, hint: string | undefined, control: Snippet)}
  <div class="flex items-center justify-between gap-6 border-b border-base-content/5 py-3.5 last:border-b-0">
    <div class="flex min-w-0 flex-col gap-0.5">
      <span class="text-sm text-base-content">{label}</span>
      {#if hint}
        <span class="text-xs leading-snug text-base-content/60">{hint}</span>
      {/if}
    </div>
    <div class="shrink-0">{@render control()}</div>
  </div>
{/snippet}

{#snippet toggle(checked: boolean, set: (_value: boolean) => void, label: string)}
  <Toggle
    class="toggle-primary toggle-sm"
    aria-label={label}
    {checked}
    onchange={(e) => set(e.currentTarget.checked)}
  />
{/snippet}

<dialog
  bind:this={dialog}
  onclose={() => (open = false)}
  onclick={(e) => {
    if (e.target === dialog) dialog?.close();
  }}
  aria-labelledby="editor-settings-title"
  class="fixed inset-0 m-auto h-[min(25rem,calc(100dvh-3rem))] w-[min(44rem,calc(100vw-3rem))] overflow-hidden rounded-xl bg-base-100 p-0 text-base-content shadow-2xl backdrop:bg-base-300/70"
>
  <!-- Fixed size on purpose: the dialog must not resize as you move between
       categories. It is sized for the largest category with room to grow, and
       the pane scrolls past that. -->
  <div class="grid h-full grid-cols-[12rem_1fr]">
    <!-- Category rail. `bg-base-200` gives the navigation its own neutral layer,
         a step back from the pane it controls. -->
    <div class="flex min-h-0 flex-col border-r border-base-content/10 bg-base-200">
      <h2
        id="editor-settings-title"
        class="px-5 pb-3 pt-5 font-display text-base font-semibold"
      >
        Settings
      </h2>
      <!-- A plain div, not <nav>: `tablist` is an interactive role and cannot sit
           on a landmark element. -->
      <div
        class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3 focus:outline-none"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Settings categories"
        tabindex="-1"
        onkeydown={onRailKeydown}
      >
        {#each categories as category (category.id)}
          {@const selected = active === category.id}
          {@const Icon = category.icon}
          <button
            type="button"
            role="tab"
            id="tab-{category.id}"
            aria-selected={selected}
            aria-controls="panel-{category.id}"
            tabindex={selected ? 0 : -1}
            class="rail-item flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm
                   {selected ? 'bg-primary/15 font-medium text-primary' : 'text-base-content/70'}"
            onclick={() => (active = category.id)}
          >
            <Icon
              class="h-3.5 w-3.5 shrink-0 {selected ? '' : 'opacity-70'}"
              aria-hidden="true"
            />
            {category.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Settings pane -->
    <div class="flex min-h-0 min-w-0 flex-col">
      <div
        class="min-h-0 flex-1 overflow-y-auto px-6 py-2"
        role="tabpanel"
        id="panel-{active}"
        aria-labelledby="tab-{active}"
        tabindex="-1"
      >
        {#if active === 'appearance'}
          {#snippet fontSizeControl()}
            <div class="flex items-center gap-3">
              <input
                type="range"
                class="range range-primary range-xs w-40"
                aria-label="Font size"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step="1"
                bind:value={settings.fontSize}
              />
              <span class="w-9 text-right font-mono text-xs tabular-nums text-base-content/70">
                {settings.fontSize}px
              </span>
            </div>
          {/snippet}
          {@render row('Font size', undefined, fontSizeControl)}

          {#snippet lineNumbersControl()}
            <Select
              class="select-sm w-32"
              aria-label="Line numbers"
              bind:value={settings.lineNumbers}
            >
              {#each lineNumberModes as mode (mode.value)}
                <option value={mode.value}>{mode.label}</option>
              {/each}
            </Select>
          {/snippet}
          {@render row('Line numbers', undefined, lineNumbersControl)}

          {#snippet wordWrapControl()}
            {@render toggle(settings.wordWrap, (v) => (settings.wordWrap = v), 'Word wrap')}
          {/snippet}
          {@render row('Word wrap', 'Break long lines instead of scrolling sideways', wordWrapControl)}

          {#snippet minimapControl()}
            {@render toggle(settings.minimap, (v) => (settings.minimap = v), 'Minimap')}
          {/snippet}
          {@render row('Minimap', 'Show the code overview on the right edge', minimapControl)}
        {:else if active === 'indentation'}
          {#snippet tabSizeControl()}
            <Select
              class="select-sm w-32"
              aria-label="Tab size"
              bind:value={settings.tabSize}
            >
              {#each TAB_SIZES as size (size)}
                <option value={size}>{size} spaces</option>
              {/each}
            </Select>
          {/snippet}
          {@render row('Tab size', 'Width of one indentation level', tabSizeControl)}

          {#snippet insertSpacesControl()}
            {@render toggle(settings.insertSpaces, (v) => (settings.insertSpaces = v), 'Insert spaces')}
          {/snippet}
          {@render row('Insert spaces', 'Off inserts a tab character instead', insertSpacesControl)}
        {:else if active === 'editing'}
          {#snippet bracketsControl()}
            {@render toggle(
              settings.autoClosingBrackets,
              (v) => (settings.autoClosingBrackets = v),
              'Auto-close brackets and quotes'
            )}
          {/snippet}
          {@render row('Auto-close brackets', 'Insert the closing bracket or quote for you', bracketsControl)}

          {#snippet suggestionsControl()}
            {@render toggle(settings.quickSuggestions, (v) => (settings.quickSuggestions = v), 'Suggest while typing')}
          {/snippet}
          {@render row('Suggest while typing', 'Show completions without pressing Ctrl+Space', suggestionsControl)}
        {/if}
      </div>

      <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-base-content/10 px-6 py-3">
        <!-- `-ml-3` cancels the button's own padding so its label sits on the
             same vertical line as the setting labels above it. -->
        <Button
          type="button"
          class="btn-ghost btn-sm -ml-3 font-normal text-base-content/70"
          onclick={() => editorSettings.reset()}
        >
          Reset to defaults
        </Button>
        <Button
          type="button"
          class="btn-primary btn-sm"
          onclick={() => dialog?.close()}
        >
          Done
        </Button>
      </footer>
    </div>
  </div>
</dialog>

<style>
  .rail-item {
    transition:
      background-color 150ms cubic-bezier(0.22, 0.61, 0.36, 1),
      color 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  @media (hover: hover) {
    .rail-item[aria-selected='false']:hover {
      background-color: color-mix(in oklab, var(--color-base-content) 8%, transparent);
      color: var(--color-base-content);
    }
  }
  .rail-item:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }

  /* Entrance only — the dialog is dismissed by the platform, which gives us no
     hook to animate the exit without deferring close(). */
  dialog[open] {
    animation: dialog-in 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  dialog[open]::backdrop {
    animation: backdrop-in 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: scale(0.98) translateY(-4px);
    }
  }
  @keyframes backdrop-in {
    from {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rail-item,
    dialog[open],
    dialog[open]::backdrop {
      transition: none;
      animation: none;
    }
  }
</style>
