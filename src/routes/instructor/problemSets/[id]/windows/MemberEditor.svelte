<script lang="ts">
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { MemberInfo } from '$lib/problemSet';

  /**
   * The body of the editor's two member tabs: collaborators are teachers granted
   * editing, student access is students granted practising, and the only thing
   * that differs is which list is being edited. Both add by email, so the form,
   * the error the server sends back and the row layout live here once.
   */
  let {
    id,
    label,
    description,
    placeholder,
    addLabel,
    emptyLabel,
    countNoun,
    members,
    onAdd,
    onRemove
  }: {
    /** Prefix for this instance's element ids, so two tabs never collide. */
    id: string;
    label: string;
    description: string;
    placeholder: string;
    addLabel: string;
    emptyLabel: string;
    /** What one row is, for the count under the list ("student", "collaborator"). */
    countNoun: string;
    members: MemberInfo[];
    onAdd: (_email: string) => Promise<void>;
    onRemove: (_id: string) => Promise<void>;
  } = $props();

  let email = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  const canSubmit = $derived(email.trim() !== '' && !busy);
  const count = $derived(`${members.length} ${countNoun}${members.length === 1 ? '' : 's'}`);

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;

    busy = true;
    error = null;
    try {
      await onAdd(email);
      email = '';
    } catch (failure) {
      // The server's sentence names the rule the address broke — unregistered,
      // or the wrong kind of account — so it is what the field reports back.
      error = failure instanceof Error ? failure.message : 'Adding that address failed';
    } finally {
      busy = false;
    }
  }

  async function remove(memberId: string): Promise<void> {
    error = null;
    try {
      await onRemove(memberId);
    } catch (failure) {
      error = failure instanceof Error ? failure.message : 'Removing that address failed';
    }
  }
</script>

<section class="flex flex-col gap-4">
  <p class="text-sm text-base-content/60">{description}</p>

  <form
    class="flex flex-wrap items-start gap-2"
    onsubmit={submit}
  >
    <div class="form-control min-w-64 flex-1">
      <label
        class="label"
        for="{id}__email"
      >
        <span class="font-bold">{label}</span>
      </label>
      <div class="flex flex-row gap-2">
        <TextInput
          id="{id}__email"
          type="email"
          class="w-full"
          {placeholder}
          autocomplete="off"
          bind:value={email}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : `${id}__error`}
        />
        <Button
          class="btn-primary"
          type="submit"
          disabled={!canSubmit}
        >
          {addLabel}
        </Button>
      </div>
    </div>
  </form>

  {#if error}
    <p
      id="{id}__error"
      class="text-sm text-error"
      role="alert"
      data-testid="{id}-error"
    >
      {error}
    </p>
  {/if}

  {#if members.length === 0}
    <p class="rounded-box bg-base-200 p-8 text-center text-base-content/60">{emptyLabel}</p>
  {:else}
    <ul
      class="flex flex-col gap-2"
      data-testid="{id}-list"
    >
      {#each members as member (member.id)}
        <li class="flex flex-wrap items-center justify-between gap-2 rounded-box bg-base-200 px-4 py-2">
          <span class="min-w-0">
            <span class="block truncate text-sm">{member.name ?? member.email}</span>
            {#if member.name}
              <span class="block truncate text-xs text-base-content/60">{member.email}</span>
            {/if}
          </span>
          <Button
            class="btn-ghost btn-sm"
            onclick={() => remove(member.id)}
            aria-label="Remove {member.email}">Remove</Button
          >
        </li>
      {/each}
    </ul>
    <p class="text-xs text-base-content/60">{count}</p>
  {/if}
</section>
