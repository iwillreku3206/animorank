<script lang="ts">
  import { typeToString } from '$lib/utils/typeToString';
  import { Popover } from 'bits-ui';
  import { type CType } from '$lib/zenstack/models';
  import UndoIcon from '$lib/assets/undo.svg';

  let { type = $bindable() }: { type: CType } = $props();

  let rng = $state(Math.random());
</script>

<Popover.Root>
  <Popover.Trigger class="btn btn-sm btn-outline min-w-32">
    {typeToString(type)}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Overlay />
    <Popover.Content>
      <div class="bg-neutral-900 p-4 flex flex-col gap-2 rounded-lg">
        <div class="flex flex-row gap-2">
          {#each ['BOOL', 'CHAR', 'INT', 'FLOAT', 'DOUBLE'] as base}
            <input
              type="radio"
              class="radio"
              name="c_paramselector_type_{rng}"
              id="c_paramselector_type_{rng}_{base}"
              value={base}
              bind:group={type.base}
            />
            <label for="c_paramselector_type_{rng}_{base}">{base.toLowerCase()}</label>
          {/each}
        </div>
        <div class="flex flex-row w-full">
          <div class="flex flex-col gap-2 w-full">
            Size Modifier:
            {#each ['LONG', 'LONG_LONG', 'SHORT'] as modifier}
              <div class="flex flex-row gap-2 items-center">
                <input
                  type="radio"
                  class="radio"
                  name="c_paramselector_sizemod_{rng}"
                  id="c_paramselector_sizemod_{rng}_{modifier}"
                  value={modifier}
                  bind:group={type.sizeModifier}
                  disabled={type.base !== 'INT'}
                />
                <label for="c_paramselector_sizemod_{rng}_{modifier}">
                  {modifier.replace('_', ' ').toLowerCase()}
                </label>
              </div>
            {/each}
          </div>
          <div class="flex flex-col w-full gap-2">
            Other Options:
            <div class="flex flex-row gap-2 items-center">
              <input
                type="checkbox"
                class="checkbox"
                id="c_paramselector_pointer_{rng}"
                bind:checked={type.isPointer}
              />
              <label for="c_paramselector_pointer_{rng}">Is Pointer</label>
            </div>
            <div class="flex flex-row gap-2 items-center">
              <input
                type="checkbox"
                class="checkbox"
                id="c_paramselector_signed_{rng}"
                onchange={(e) => (type.signed = e.currentTarget.checked)}
                checked={type.signed}
                disabled={type.base !== 'INT' && type.base !== 'CHAR'}
                indeterminate={type.signed === undefined || type.signed === null}
              />
              <label for="c_paramselector_signed_{rng}">Is Signed</label>
              {#if type.signed === true || type.signed === false}
                <button onclick={() => (type.signed = null)}>
                  <img
                    src={UndoIcon}
                    class="svg-undo w-4 h-4"
                    alt="Undo button"
                  />
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
      <Popover.Close />
      <Popover.Arrow />
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  .svg-undo {
    filter: brightness(0) saturate(100%) invert(99%) sepia(10%) saturate(0%) hue-rotate(146deg)
      brightness(82%) contrast(93%);
  }
</style>
