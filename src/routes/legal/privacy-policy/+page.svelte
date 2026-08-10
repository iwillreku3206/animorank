<script lang="ts">
  import { onMount } from 'svelte';
  import Seo from '$lib/components/layout/Seo.svelte';

  const sections = [
    { id: 'information-we-collect', label: 'Information We Collect' },
    { id: 'how-we-use', label: 'How We Use Your Information' },
    { id: 'data-anonymization', label: 'Data Anonymization' },
    { id: 'data-retention', label: 'Data Retention and Deletion' },
    { id: 'changes', label: 'Changes to This Policy' },
    { id: 'contact', label: 'Contact Information' }
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

<Seo
  title="Privacy Policy"
  description="How AnimoRank collects, uses, anonymizes, and retains your data."
/>

<div class="app-gutter py-12 flex flex-col gap-10 items-start justify-center lg:flex-row lg:gap-16">
  <!-- Table of contents (rail nav; hidden on mobile where readers just scroll) -->
  <aside class="hidden lg:block lg:w-56 lg:shrink-0 lg:sticky lg:top-20 lg:h-fit">
    <h3 class="text-sm font-display font-semibold mb-4">Privacy Policy</h3>
    <nav class="flex flex-col">
      {#each sections as section (section.id)}
        <a
          href="#{section.id}"
          onclick={() => (activeSection = section.id)}
          class="text-sm block py-2 pl-4 border-l-2 transition-colors duration-250
            {activeSection === section.id
            ? 'text-base-content border-primary'
            : 'text-base-content/60 hover:text-base-content border-neutral'}"
        >
          {section.label}
        </a>
      {/each}
    </nav>
  </aside>

  <!-- Main content -->
  <main class="flex-1 max-w-2xl">
    <h1 class="font-display text-4xl font-bold mb-2">Privacy Policy</h1>
    <p class="text-md text-base-content/60 mb-8">Last Updated: May 25, 2026</p>

    <div class="prose prose-headings:font-display text-md text-base-content/70">
      <p>
        AnimoRank ("we," "us," or "our") provides this Privacy Policy to inform you of our policies and procedures
        regarding the collection, use, disclosure, and protection of information we receive from users of our
        programming practice platform (the "Platform").
      </p>
      <p>
        This Privacy Policy applies to the AnimoRank website, integrated development environment, problem sets, and any
        related services we offer (collectively, the "Services").
      </p>

      <hr class="my-8!" />

      <h2
        class="scroll-mt-24"
        id="information-we-collect"
      >
        Information We Collect
      </h2>
      <p>
        We collect information that you provide directly and information generated through your use of the Services.
      </p>
      <p>
        When you authenticate, we receive and store your institutional email address. This is the only personally
        identifiable information we maintain and is used solely for authentication and account management purposes.
      </p>
      <p>
        We automatically log your activity on the platform to enable the Platform's core functionality and objectives.
        This includes:
      </p>
      <ul>
        <li>All source code you write, edit, and submit</li>
        <li>Compilation attempts and their corresponding outputs, including error messages</li>
        <li>Test case execution results and performance metrics</li>
        <li>Problems attempted and completed</li>
      </ul>
      <p>
        We collect standard web server information including your IP address, browser type and version, operating system
        and device identifiers. This data is used for security monitoring, abuse prevention, and platform compatibility.
      </p>
      <p>
        We do not collect payment information, audio or video recordings, biometric data, precise geolocation data, or
        any information beyond what is necessary for the Services' operation and stated research purposes.
      </p>

      <hr class="my-8!" />

      <h2
        class="scroll-mt-24"
        id="how-we-use"
      >
        How We Use Your Information
      </h2>
      <p>Your information is used exclusively for the following purposes:</p>
      <p>
        Your email address authenticates your access and links your progress across sessions. Your interaction data
        enables features such as submission history and progress tracking.
      </p>
      <p>
        The Services are operated as part of a thesis research study on programming education at De La Salle University.
        Your anonymized interaction data may be analyzed to study learning patterns, evaluate educational interventions,
        and advance understanding of how students learn to program. All personally identifiable information is removed
        prior to research analysis, as described in the Data Anonymization section below.
      </p>
      <p>
        We analyze aggregated usage patterns to identify bugs and develop new features. This includes understanding
        which problems students find most challenging and how they approach problem-solving.
      </p>
      <p>
        Technical data helps us detect and prevent automated abuse, identify security vulnerabilities, and ensure fair
        use of platform resources.
      </p>
      <p>
        We do not use your information for advertising, marketing to third parties, or any commercial purposes unrelated
        to the Services. We do not sell, rent, or trade your personal information. Research findings derived from
        anonymized data may be published in academic conferences or journals, but you will never be individually
        identifiable in any publication.
      </p>

      <hr class="my-8!" />

      <h2
        class="scroll-mt-24"
        id="data-anonymization"
      >
        Data Anonymization
      </h2>
      <p>
        Aggregated statistics derived from your data, such as average completion times or common behaviors across all
        users, contain no information that could identify you. Published research results present only group-level
        findings and never include code or interaction logs that could be attributed to specific individuals.
      </p>

      <hr class="my-8!" />

      <h2
        class="scroll-mt-24"
        id="data-retention"
      >
        Data Retention and Deletion
      </h2>
      <p>
        Active interaction logs, including your code submissions and session activity, are retained for two years
        following your last platform activity.
      </p>
      <p>
        Aggregated and anonymized research data may be retained indefinitely as it contains no personally identifiable
        information and serves ongoing educational research. Your email address remains in our system only as long as
        your account is active.
      </p>
      <p>
        You have the right to delete your account at any time through your account settings. Upon deletion, all
        personally identifiable information, including your email address and any linkage between your user ID and
        identity, is permanently removed within 30 days. Anonymized data that has already been incorporated into
        aggregated research datasets cannot be extracted, as it is no longer connected to your identity.
      </p>
      <p>
        If you wish to withdraw from research participation without deleting your account, you may contact us at the
        address below. We will exclude your data from future research analyses while preserving your platform access and
        progress.
      </p>

      <hr class="my-8!" />

      <h2
        class="scroll-mt-24"
        id="changes"
      >
        Changes to This Policy
      </h2>
      <p>
        We may update this Privacy Policy periodically to reflect changes in our practices, legal requirements, or
        platform features. When we make material changes, we will notify you through a notice on the platform at least
        14 days before the changes take effect.
      </p>
      <p>
        The effective date at the top of this policy indicates when it was last revised. Your continued use of AnimoRank
        after the effective date constitutes acceptance of the updated policy. If you do not agree with the changes, you
        may delete your account before they take effect.
      </p>

      <hr class="my-8!" />

      <h2
        class="scroll-mt-24"
        id="contact"
      >
        Contact Information
      </h2>
      <p>
        If you have questions about this Privacy Policy, wish to exercise your data rights, or need to contact us
        regarding your information, please contact us at animorank@gmail.com.
      </p>
      <p>
        For research-related concerns or questions about how your data is used in academic studies, you may also contact
        the De La Salle University Research Ethics Committee through the Office of the Vice Chancellor for Research and
        Innovation.
      </p>
      <p>
        <strong>Your Rights:</strong> You have the right to request a copy of your data, correct inaccurate information, delete
        your account, withdraw from research participation, and understand how your information is being used. We will respond
        to all requests within 30 days.
      </p>
    </div>
  </main>
</div>
