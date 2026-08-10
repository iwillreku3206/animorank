<script lang="ts">
  import GithubIcon from '@iconify-svelte/fa6-brands/github';
  import Link from '$lib/components/ui/Link.svelte';
</script>

<footer class="bg-base-200 w-full">
  <div class="app-gutter pt-12 pb-8">
    <!-- Main columns: brand on top, link groups below on mobile; single row on
         desktop. Link groups form a 2→3 col grid before the row kicks in. -->
    <div class="flex flex-col gap-10 mb-10 md:flex-row md:gap-8">
      <!-- Brand column -->
      <div class="flex flex-col gap-3 md:flex-5">
        <div class="flex items-center gap-3">
          <img
            src="/brand/icon/animorank_icon_primary_dark.svg"
            alt="AnimoRank logo"
            class="w-8 h-8"
          />
          <span class="font-display text-3xl font-bold">AnimoRank</span>
        </div>
        <p class="text-sm text-base-content/70">Practice problems built around your course.</p>

        <!-- Partnership credit (temporary home until the About page ships) -->
        <div class="flex flex-col gap-2 mt-2">
          <span class="text-xs font-medium uppercase tracking-wide text-base-content/60">In partnership with</span>
          <a
            href="https://dlsupts.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            class="w-fit"
            aria-label="Peer Tutors Society"
          >
            <img
              src="/partners/pts-stacked-mono-dark.png"
              alt="Peer Tutors Society"
              class="h-14 w-auto opacity-80 transition-opacity hover:opacity-100"
            />
          </a>
        </div>
      </div>

      <!-- Link groups: 2-col grid on phone, 3-col on small, inline row on desktop -->
      <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 md:flex md:flex-[3] md:gap-8">
        <!-- Support links -->
        <div class="flex-1 flex flex-col gap-4">
          <h3 class="font-display font-semibold text-sm tracking-wide">Support</h3>
          <nav class="flex flex-col gap-2">
            <Link
              href="https://github.com/iwillreku3206/animorank/issues/new?template=bug_report.md&labels=bug"
              target="_blank"
              rel="noopener noreferrer"
              class="link-neutral link-hover text-sm w-fit">Report a Bug</Link
            >
            <Link
              href="https://github.com/iwillreku3206/animorank/issues/new?template=feature_request.md&labels=enhancement"
              target="_blank"
              rel="noopener noreferrer"
              class="link-neutral link-hover text-sm w-fit">Request a Feature</Link
            >
            <Link
              href="/faqs"
              class="link-neutral link-hover text-sm w-fit">FAQs</Link
            >
          </nav>
        </div>

        <!-- Legal links -->
        <div class="flex-1 flex flex-col gap-4">
          <h3 class="font-display font-semibold text-sm tracking-wide">Legal</h3>
          <nav class="flex flex-col gap-2">
            <Link
              href="/legal/terms-of-service"
              class="link-neutral link-hover text-sm w-fit">Terms of Service</Link
            >
            <Link
              href="/legal/privacy-policy"
              class="link-neutral link-hover text-sm w-fit">Privacy Policy</Link
            >
            <Link
              href="https://github.com/iwillreku3206/animorank/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              class="link-neutral link-hover text-sm w-fit">License</Link
            >
          </nav>
        </div>

        <!-- Community links -->
        <div class="flex-1 flex flex-col gap-4">
          <h3 class="font-display font-semibold text-sm tracking-wide">Community</h3>
          <nav class="flex flex-col gap-2">
            <Link
              href="mailto:animorank@gmail.com"
              class="link-neutral link-hover text-sm w-fit">Contact Us</Link
            >
            <Link
              href="/changelog"
              class="link-neutral link-hover text-sm w-fit">Changelog</Link
            >
          </nav>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-base-content/10"></div>

    <!-- Bottom bar: copyright + GitHub -->
    <div
      class="flex flex-col gap-3 pt-6 pb-2 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>© AnimoRank 2026. All rights reserved.</span>
      <Link
        href="https://github.com/iwillreku3206/animorank"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 link-neutral text-sm w-fit"
        aria-label="AnimoRank on GitHub"
      >
        <GithubIcon
          class="w-5 h-5"
          aria-hidden="true"
        />
        Github
      </Link>
    </div>
  </div>
</footer>
