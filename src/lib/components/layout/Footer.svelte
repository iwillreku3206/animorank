<script lang="ts">
  import GithubIcon from '@iconify-svelte/fa6-brands/github';
  import Link from '$lib/components/ui/Link.svelte';
</script>

<footer class="bg-base-200 w-full">
  <div class="px-4 xl:px-32 pt-12 pb-8">
    <!-- Main columns: brand + link groups -->
    <div class="flex flex-row gap-8 mb-10">
      <!-- Brand column -->
      <div class="flex-[5] flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <img
            src="/animorank-logo.svg"
            alt="AnimoRank logo"
            class="w-8 h-8"
          />
          <span class="font-display text-3xl font-bold">AnimoRank</span>
        </div>
        <p class="text-sm text-base-content/70">Built by Lasallians, for Lasallians.</p>
      </div>

      <!-- Support links -->
      <div class="flex-[1] flex flex-col gap-4">
        <h3 class="font-display font-semibold text-sm tracking-wide">Support</h3>
        <nav class="flex flex-col gap-2">
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            class="link-neutral link-hover text-sm w-fit">Report a Bug</Link
          >
          <Link
            href="#"
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
      <div class="flex-[1] flex flex-col gap-4">
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
            href="#"
            class="link-neutral link-hover text-sm w-fit">License</Link
          >
        </nav>
      </div>

      <!-- Community links -->
      <div class="flex-[1] flex flex-col gap-4">
        <h3 class="font-display font-semibold text-sm tracking-wide">Community</h3>
        <nav class="flex flex-col gap-2">
          <Link
            href="#"
            class="link-neutral link-hover text-sm w-fit">Contact Us</Link
          >
          <Link
            href="/changelog"
            class="link-neutral link-hover text-sm w-fit">Changelog</Link
          >
        </nav>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-base-content/10"></div>

    <!-- Bottom bar: copyright + GitHub -->
    <div class="flex items-center justify-between pt-6 pb-2 text-sm text-base-content/70">
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
