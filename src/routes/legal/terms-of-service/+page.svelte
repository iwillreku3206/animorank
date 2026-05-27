<script lang="ts">
  import { onMount } from 'svelte';

  const sections = [
    { id: 'acceptance', label: 'Acceptance of Terms' },
    { id: 'data-collection', label: 'Data Collection and Interaction Logging' },
    { id: 'acceptable-use', label: 'Acceptable Use' },
    { id: 'disclaimers', label: 'Disclaimers and Liability' },
    { id: 'termination', label: 'Termination' },
    { id: 'changes', label: 'Changes to These Terms' },
    { id: 'contact', label: 'Contact' }
  ];

  let activeSection = $state(sections[0].id);

  onMount(() => {
    const headings = document.querySelectorAll('h2[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -75% 0px' }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  });
</script>

<div class="px-4 xl:px-32 py-12 flex flex-row gap-16 items-start justify-center">

  <!-- Table of contents -->
  <aside class="w-56 sticky top-20 h-fit">
    <h3 class="text-sm font-display font-semibold mb-4">Terms of Service</h3>
    <nav class="flex flex-col">
      {#each sections as section (section.id)}
        <a
          href="#{section.id}"
          onclick={() => (activeSection = section.id)}
          class="text-sm block py-2 pl-4 border-l-2 transition-colors duration-250
            {activeSection === section.id
              ? 'text-base-content border-primary'
              : 'text-base-content/50 hover:text-base-content border-neutral'}"
        >
          {section.label}
        </a>
      {/each}
    </nav>
  </aside>

  <!-- Main content -->
  <main class="flex-1 max-w-2xl">
    <h1 class="font-display text-4xl font-bold mb-2">Terms of Service</h1>
    <p class="text-sm text-base-content/50 mb-8">Last Updated: May 25, 2026</p>

    <div class="prose prose-headings:font-display">

      <!-- Acceptance of Terms -->
      <h2 class="scroll-mt-24" id="acceptance">Acceptance of Terms</h2>
      <p>
        By accessing or using AnimoRank (the "Platform"), you agree to be bound by these Terms
        of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.
        You must be at least 18 years of age to use this Platform.
      </p>

      <hr class="my-8!" />

      <!-- Data Collection and Interaction Logging -->
      <h2 class="scroll-mt-24" id="data-collection">Data Collection and Interaction Logging</h2>
      <p>
        By using the Platform, you explicitly consent to the collection and logging of your
        interactions with the Platform, which includes but is not limited to:
      </p>
      <ul>
        <li>
          <strong>Code compilations:</strong> all code you write, submit, or execute on the Platform
        </li>
        <li>
          <strong>Session activity:</strong> pages visited, problems attempted, time spent
        </li>
        <li>
          <strong>Test results:</strong> outputs, errors, and performance metrics from your code runs
        </li>
        <li>
          <strong>Behavioral data:</strong> coding logs and feature usage
        </li>
        <li>
          <strong>Device and technical data:</strong> browser type, IP address, and operating system
        </li>
      </ul>
      <p>
        This data is used for purposes including platform improvement and research purposes. All
        data will be anonymized prior to any kind of analysis or study. Research findings from
        aggregated and anonymized data may be published in academic conferences and journals. If
        done so, none of the data will be personally identifiable to any individual. Your data
        will not be sold or shared to third parties without your explicit consent.
      </p>
      <p>
        By continuing to use the Platform, you acknowledge that you have read and understood
        this logging practice.
      </p>

      <hr class="my-8!" />

      <!-- Acceptable Use -->
      <h2 class="scroll-mt-24" id="acceptable-use">Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use automated scripts, bots, or tools designed to attack, exploit, or disrupt the
          Platform&#39;s infrastructure or judging systems
        </li>
        <li>
          Upload or execute malicious code, including malware, ransomware, or
          denial-of-service payloads
        </li>
        <li>
          Attempt to access other users&#39; submissions, accounts, or private data
        </li>
        <li>
          Harass, threaten, or harm other users through any feature of the Platform
        </li>
      </ul>
      <p>Violations may result in your account being banned.</p>

      <hr class="my-8!" />
      
      <!-- Disclaimers and Liability -->
      <h2 class="scroll-mt-24" id="disclaimers">Disclaimers and Liability</h2>
      <p>
        The Platform is provided &quot;as is&quot; without warranties of any kind, express or
        implied. While all efforts have been made for quality control, we do not warrant that
        the Platform will be uninterrupted or error-free, or that any problem and its test cases
        are complete and correct. Use of the Platform for any high-stakes purpose is at your own
        risk.
      </p>
      <p>
        The developers of AnimoRank and the problem contributors shall not be liable for any
        indirect, incidental, special, consequential, or punitive damages arising from your use
        of (or inability to use) the Platform.
      </p>

      <hr class="my-8!" />

      <!-- Termination -->
      <h2 class="scroll-mt-24" id="termination">Termination</h2>
      <p>
        We may suspend or terminate your access at any time, with or without notice, for conduct
        that we determine violates these Terms or is harmful to other users, the Platform, or
        third parties. Upon termination, your right to use the Platform ceases immediately.
      </p>

      <hr class="my-8!" />

      <!-- Changes to These Terms -->
      <h2 class="scroll-mt-24" id="changes">Changes to These Terms</h2>
      <p>
        We may update these Terms at any time. If we make material changes, you will be notified
        through a prominent notice on the Platform. Your continued use of the Platform after the
        effective date of revised Terms constitutes your acceptance of the changes.
      </p>
      <p>
        You have the right to revoke your acceptance of the terms of service at any time through
        the Platform itself. If you revoke your acceptance of the terms, all your data will also
        be deleted.
      </p>

      <hr class="my-8!" />

      <!-- Contact -->
      <h2 class="scroll-mt-24" id="contact">Contact</h2>
      <p>If you have questions about these Terms, please contact us at: animorank@gmail.com.</p>
    </div>
  </main>

</div>