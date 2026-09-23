<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Dropdown from './Dropdown.svelte';

  const { Story } = defineMeta({
    title: 'UI/Dropdown',
    component: Dropdown,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' },
      side: { control: { type: 'select' }, options: ['top', 'right', 'bottom', 'left'] },
      align: { control: { type: 'select' }, options: ['start', 'center', 'end'] },
      sideOffset: { control: 'number' }
    }
  });
</script>

<script>
  import Button from '../buttons/Button.svelte';
  import DropdownItem from './DropdownItem.svelte';
  import DropdownSeparator from './DropdownSeparator.svelte';
  import EllipsisVerticalIcon from '@iconify-svelte/fa6-solid/ellipsis-vertical';
  import PenIcon from '@iconify-svelte/fa6-solid/pen-to-square';
  import TrashIcon from '@iconify-svelte/fa6-solid/trash-can';
  import ContractIcon from '@iconify-svelte/fa6-solid/file-contract';
  import LogoutIcon from '@iconify-svelte/fa6-solid/arrow-right-from-bracket';
</script>

<!-- The shape the four "⋮" action menus use. Panels are portalled, so give the
     stories room below the trigger to see them open. -->
<Story name="ActionMenu">
  {#snippet template()}
    <div class="p-4 pb-64">
      <Dropdown label="Problem set actions">
        {#snippet trigger(props)}
          <Button
            {...props}
            class="btn-ghost btn-square btn-sm"
            aria-label="More actions"
          >
            <EllipsisVerticalIcon class="h-4 w-4" />
          </Button>
        {/snippet}

        <DropdownItem href="#">
          <PenIcon class="h-4 w-4 opacity-70" />
          Manage problem set
        </DropdownItem>
        <DropdownItem
          variant="danger"
          onSelect={() => {}}
        >
          <TrashIcon class="h-4 w-4" />
          Delete problem set
        </DropdownItem>
      </Dropdown>
    </div>
  {/snippet}
</Story>

<!-- With a separator and a non-interactive header block, as the account menu
     needs. -->
<Story name="WithSeparator">
  {#snippet template()}
    <div class="p-4 pb-64">
      <Dropdown
        label="Account"
        class="w-64"
      >
        {#snippet trigger(props)}
          <Button
            {...props}
            class="btn-ghost btn-sm">Account</Button
          >
        {/snippet}

        <div class="px-3 py-2">
          <p class="truncate text-sm font-medium">Ada Lovelace</p>
          <p class="truncate text-xs text-base-content/50">ada@example.com</p>
        </div>
        <DropdownSeparator />
        <DropdownItem onSelect={() => {}}>
          <ContractIcon class="h-4 w-4 text-base-content/50" />
          Review TOS
        </DropdownItem>
        <DropdownItem
          variant="danger"
          onSelect={() => {}}
        >
          <LogoutIcon class="h-4 w-4 opacity-70" />
          Log out
        </DropdownItem>
      </Dropdown>
    </div>
  {/snippet}
</Story>

<Story name="Disabled item">
  {#snippet template()}
    <div class="p-4 pb-64">
      <Dropdown>
        {#snippet trigger(props)}
          <Button
            {...props}
            class="btn-sm">Open</Button
          >
        {/snippet}
        <DropdownItem onSelect={() => {}}>Available action</DropdownItem>
        <DropdownItem
          disabled
          onSelect={() => {}}>Unavailable action</DropdownItem
        >
      </Dropdown>
    </div>
  {/snippet}
</Story>

<!-- Alignment reference: the action menus use align="end". -->
<Story name="AlignStart">
  {#snippet template()}
    <div class="p-4 pb-64">
      <Dropdown align="start">
        {#snippet trigger(props)}
          <Button
            {...props}
            class="btn-sm">Aligned to start</Button
          >
        {/snippet}
        <DropdownItem onSelect={() => {}}>First</DropdownItem>
        <DropdownItem onSelect={() => {}}>Second</DropdownItem>
      </Dropdown>
    </div>
  {/snippet}
</Story>

<Story name="Wide">
  {#snippet template()}
    <div class="p-4 pb-64">
      <Dropdown class="w-64">
        {#snippet trigger(props)}
          <Button
            {...props}
            class="btn-sm">w-64 panel</Button
          >
        {/snippet}
        <DropdownItem onSelect={() => {}}>An option with longer text</DropdownItem>
        <DropdownItem onSelect={() => {}}>Another option</DropdownItem>
      </Dropdown>
    </div>
  {/snippet}
</Story>
