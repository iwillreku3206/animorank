<script
  lang="ts"
  generics="T extends Form"
>
  import TypeEditorField from './TypeEditorField.svelte';

  import Editor from '$lib/components/editor/Editor.svelte';

  import type { Component } from 'svelte';
  import type { Form, FormFieldType, FormValue } from '$lib/form';
  import type { IntoJsonValue } from '$lib/types/utils';

  type Props = { form: T; value: FormValue<T>; class?: string };
  let { form, value = $bindable(), class: className = '' }: Props = $props();

  const formId = Math.random().toString(36).slice(2, 10);

  const defaults: Record<FormFieldType, IntoJsonValue> = {
    text: '',
    number: 0,
    select: '',
    code: '',
    markdown: '',
    checkbox: false,
    radio: '',
    segmented: '',
    date: '',
    time: '',
    datetime: '',
    range: 0,
    typeEditor: '',
    url: ''
  };

  $effect.pre(() => {
    for (const id of Object.keys(form.fields)) {
      if (value[id] === undefined) {
        const field = form.fields[id];
        (value[id as keyof T['fields']] as (typeof defaults)[FormFieldType]) = field.default ?? defaults[field.type];
      }
    }
  });
</script>

<div class="flex flex-col gap-2 {className}">
  {#each Object.keys(form.fields) as id (id)}
    {@const field = form.fields[id]}
    {@const fid = `${formId}-${id}`}

    {#if field.type === 'text'}
      <fieldset class="fieldset">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <input
          class="input input-xs input-primary"
          type="text"
          id={fid}
          pattern={field.regex?.toString()}
          bind:value={(value as FormValue<Form>)[id]}
        />
      </fieldset>
    {/if}

    {#if field.type === 'url'}
      <fieldset class="fieldset">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <input
          class="input input-xs input-primary"
          type="url"
          id={fid}
          pattern={field.regex?.toString()}
          bind:value={(value as FormValue<Form>)[id]}
        />
      </fieldset>
    {/if}

    {#if field.type === 'number'}
      <fieldset class="fieldset">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <input
          class="input input-xs input-primary"
          type="number"
          id={fid}
          min={field.min}
          max={field.max}
          step={field.isInteger ? 1 : undefined}
          bind:value={(value as FormValue<Form>)[id]}
        />
      </fieldset>
    {/if}

    {#if field.type === 'range'}
      <fieldset class="fieldset">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <div class="flex flex-row gap-2">
          <input
            class="range range-xs range-primary"
            type="range"
            id={fid}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.isInteger ? 1 : undefined}
            bind:value={value[id]}
          />
          <span class="fieldset-label">{value[id]}</span>
        </div>
      </fieldset>
    {/if}

    {#if field.type === 'checkbox'}
      <fieldset class="fieldset">
        <label
          class="label cursor-pointer gap-3"
          for={fid}
        >
          <input
            class="checkbox checkbox-xs checkbox-primary"
            type="checkbox"
            id={fid}
            bind:checked={value[id] as boolean}
          />
          {field.label}
        </label>
      </fieldset>
    {/if}

    {#if field.type === 'select'}
      {@const opts = field.options.map((opt) =>
        typeof opt === 'string'
          ? { label: opt, value: opt, icon: undefined as Component | undefined }
          : { ...opt, value: String(opt.value) }
      )}
      {@const hasIcon = opts.some((opt) => opt.icon)}
      {@const selectedOpt = opts.find((opt) => opt.value === String(value[id]))}

      <fieldset class="fieldset">
        {#if hasIcon}
          <span class="label">{field.label}</span>
          <div class="dropdown">
            <div
              tabindex="0"
              role="button"
              class="select select-xs select-primary w-full justify-between"
            >
              <span class="flex items-center gap-2">
                {#if selectedOpt?.icon}
                  {@const IconCmp = selectedOpt.icon}
                  <IconCmp class="w-4 h-4" />
                {/if}
                <span>{selectedOpt?.label ?? 'Select...'}</span>
              </span>
            </div>
            <div
              tabindex="0"
              role="menu"
              class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full z-10"
            >
              {#each opts as opt, i (i)}
                <li>
                  <button
                    role="menuitem"
                    class:active={opt.value === String(value[id])}
                    onclick={() => {
                      (value as FormValue<Form>)[id] = opt.value;
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    {#if opt.icon}
                      {@const IconCmp = opt.icon}
                      <IconCmp class="w-4 h-4" />
                    {/if}
                    {opt.label}
                  </button>
                </li>
              {/each}
            </div>
          </div>
        {:else}
          <label
            class="label"
            for={fid}>{field.label}</label
          >
          <select
            class="select select-xs select-primary"
            id={fid}
            bind:value={value[id]}
          >
            {#each opts as opt, i (i)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        {/if}
      </fieldset>
    {/if}

    {#if field.type === 'radio'}
      <fieldset class="fieldset">
        <span class="fieldset-legend">{field.label}</span>
        {#each field.options as opt, i (i)}
          {@const rid = `${fid}-${i}`}
          {@const optData =
            typeof opt === 'string'
              ? { label: opt, value: opt }
              : typeof opt === 'number'
                ? { label: String(opt), value: opt }
                : opt}
          <label
            class="label cursor-pointer gap-3"
            for={rid}
          >
            <input
              class="radio radio-xs radio-primary"
              type="radio"
              name={id}
              id={rid}
              value={optData.value}
              bind:group={(value as FormValue<Form>)[id]}
            />
            <span class="flex items-center gap-2">
              {#if 'icon' in optData && optData.icon}
                {@const IconCmp = optData.icon}
                <IconCmp class="w-4 h-4" />
              {/if}
              {String(optData.label)}
            </span>
          </label>
        {/each}
      </fieldset>
    {/if}

    {#if field.type === 'segmented'}
      <fieldset class="fieldset min-w-min">
        <span class="fieldset-legend">{field.label}</span>
        <div class="join min-w-min w-full">
          {#each field.options as opt, i (i)}
            {@const rid = `${fid}-${i}`}
            {@const optData =
              typeof opt === 'string'
                ? { label: opt, value: opt }
                : typeof opt === 'number'
                  ? { label: String(opt), value: opt }
                  : opt}
            <label
              class="join-item btn has-checked:btn-primary"
              for={rid}
            >
              <input
                class="sr-only"
                type="radio"
                name={id}
                id={rid}
                value={optData.value}
                bind:group={(value as FormValue<Form>)[id]}
              />
              {#if 'icon' in optData && optData.icon}
                {@const IconCmp = optData.icon}
                <IconCmp class="w-4 h-4" />
              {/if}
              {String(optData.label)}
            </label>
          {/each}
        </div>
      </fieldset>
    {/if}

    {#if field.type === 'date' || field.type === 'time' || field.type === 'datetime'}
      <fieldset class="fieldset">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <input
          class="input input-xs input-primary"
          type={field.type === 'datetime' ? 'datetime-local' : field.type}
          id={fid}
          min={field.earliest?.toString()}
          max={field.latest?.toString()}
          bind:value={value[id]}
        />
      </fieldset>
    {/if}

    {#if field.type === 'markdown'}
      <fieldset class="fieldset min-h-32">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <Editor bind:text={value[id] as string} />
      </fieldset>
    {/if}

    {#if field.type === 'code'}
      <fieldset class="fieldset min-h-32">
        <label
          class="label"
          for={fid}>{field.label}</label
        >
        <CodeEditor
          bind:code={value[id] as string}
          language="c"
          class="w-full min-h-32 resize-y overflow-auto"
        />
      </fieldset>
    {/if}
    {#if field.type === 'typeEditor'}
      <fieldset class="fieldset">
        <span class="label">{field.label}</span>
        <TypeEditorField bind:type={(value as FormValue<Form>)[id]} />
      </fieldset>
    {/if}
  {/each}
</div>
