<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import YfmStaticView from '$lib/components/content/YfmStaticView.svelte';
  import transform from '@diplodoc/transform';
  import { transform as latex } from '@diplodoc/latex-extension/plugin';
  import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
  import { transform as transformHTML } from '@diplodoc/html-extension';
  import defaultPlugins from '@diplodoc/transform/lib/plugins';
  import ProblemSetActions from './ProblemSetActions.svelte';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  let { problemSet, onDelete }: { problemSet: ProblemSet; onDelete: () => void } = $props();

  // Descriptions are YFM markdown authored in the editor, so they are rendered
  // rather than printed raw — the same treatment the student card gives them.
  const descriptionHtml = $derived(
    transform(problemSet.description ?? '', {
      allowHTML: true,
      plugins: [
        latex({ bundle: false, runtime: 'extension:latex' }),
        mermaid({ bundle: false, runtime: 'extension:mermaid' }),
        transformHTML({ bundle: false, runtimeJsPath: 'extension:html' }),
        ...defaultPlugins
      ]
    }).result.html
  );
</script>

<div class="relative flex max-h-96 w-full flex-col gap-4 rounded-lg bg-base-200 p-6 hover:bg-base-100/70">
  <!-- Header: subject breadcrumb + actions -->
  <div class="flex items-start gap-4">
    <p class="flex-1 text-xs tracking-wide text-base-content/70">
      Courses / {#if problemSet.subject}
        <a
          class="transition-colors duration-250 hover:text-primary"
          href="/instructor/problemSets?tag={problemSet.subject.id}"
        >
          {problemSet.subject.label}
        </a>
      {:else}
        Other
      {/if}
    </p>
    <ProblemSetActions
      id={problemSet.id}
      title={problemSet.title}
      {onDelete}
    />
  </div>

  <h2 class="line-clamp-2 overflow-hidden font-display text-xl font-semibold">
    <a
      class="transition-colors duration-250 hover:text-primary"
      href="/instructor/problemSets/{problemSet.id}"
    >
      {problemSet.title}
    </a>
  </h2>

  <div class="flex max-h-14 flex-row flex-wrap gap-2 overflow-hidden">
    {#each problemSet.tags as tag (tag.id)}
      <TagChip
        {tag}
        href="/instructor/problemSets?tag={tag.id}"
      />
    {/each}
  </div>

  <div class="line-clamp-3 flex-1 overflow-hidden text-sm text-base-content/70">
    <YfmStaticView html={descriptionHtml} />
  </div>

  <!-- Footer: instructor-facing stats + open button -->
  <div class="flex flex-row items-end gap-4">
    <div class="flex flex-1 flex-wrap items-center gap-2 text-sm text-base-content/70">
      <span>{problemSet.problemCount} problem{problemSet.problemCount === 1 ? '' : 's'}</span>
      {#if problemSet.is_global}
        <span class="badge badge-sm badge-outline">Global</span>
      {/if}
    </div>

    <ButtonLink
      href="/instructor/problemSets/{problemSet.id}"
      class="btn-square btn-primary btn-outline inline-flex items-center gap-2"
      aria-label="Open {problemSet.title}"
    >
      <ArrowRightIcon
        class="h-4 w-4"
        aria-hidden="true"
      />
    </ButtonLink>
  </div>
</div>
