<script lang="ts">
  import GithubIcon from '@iconify-svelte/fa6-brands/github';
</script>

<footer class="bg-base-200 w-full">
  <div class="px-4 xl:px-32 pt-12 pb-8">
    <!-- Main columns: brand + link groups -->
    <div class="flex flex-row gap-8 mb-10">
      <!-- Brand column -->
      <div class="flex-[3] flex flex-col gap-3">
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
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >Report a Bug</a
          >
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >Request a Feature</a
          >
          <a
            href="#"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >FAQs</a
          >
        </nav>
      </div>

      <!-- Legal links -->
      <div class="flex-[1] flex flex-col gap-4">
        <h3 class="font-display font-semibold text-sm tracking-wide">Legal</h3>
        <nav class="flex flex-col gap-2">
          <a
            href="/legal/terms-of-service"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >Terms of Service</a
          >
          <a
            href="/legal/privacy-policy"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >Privacy Policy</a
          >
          <a
            href="#"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >License</a
          >
        </nav>
      </div>

      <!-- Community links -->
      <div class="flex-[1] flex flex-col gap-4">
        <h3 class="font-display font-semibold text-sm tracking-wide">Community</h3>
        <nav class="flex flex-col gap-2">
          <a
            href="#"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >Contact Us</a
          >
          <a
            href="#"
            class="text-sm text-base-content/70 hover:text-base-content transition-colors duration-250"
            >Changelog</a
          >
        </nav>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-base-content/10"></div>

    <!-- Bottom bar: copyright + GitHub -->
    <div class="flex items-center justify-between pt-6 pb-2 text-sm text-base-content/70">
      <span>© AnimoRank 2026. All rights reserved.</span>
      <a
        href="https://github.com/iwillreku3206/animorank"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 hover:text-base-content transition-colors duration-250"
        aria-label="AnimoRank on GitHub"
      >
        <GithubIcon
          class="w-5 h-5"
          aria-hidden="true"
        />
        Github
      </a>
    </div>
  </div>
</footer>
