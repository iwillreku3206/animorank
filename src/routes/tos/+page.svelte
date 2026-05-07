<script lang="ts">
  import { enhance } from '$app/forms';

  let showModal = $state(false);
  let isConfirmed = $state(false);
</script>

<div class="max-w-2xl mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">Terms of Service</h1>

  <div class="prose dark:prose-invert mb-8 p-4 border rounded">
    <p><strong>1. Acceptance of Terms</strong></p>
    <p>
      By accessing or using AnimoRank (the “Platform”), you agree to be bound by these Terms of
      Service (“Terms”). If you do not agree to these Terms, you may not use the Platform. You must
      be at least 18 years of age to use this Platform.
    </p>
    <p><strong>2. Data Collection and Interaction Logging</strong></p>
    <p>
      By using the Platform, you explicitly consent to the collection and logging of your
      interactions with the Platform, which includes but is not limited to:
    </p>
    <ul>
      <li>
        <p>
          <strong>Code compilations:</strong> all code you write, submit, or execute on the Platform
        </p>
      </li>
      <li>
        <p><strong>Session activity:</strong> pages visited, problems attempted, time spent</p>
      </li>
      <li>
        <p>
          <strong>Test results:</strong> outputs, errors, and performance metrics from your code runs
        </p>
      </li>
      <li><p><strong>Behavioral data:</strong> coding logs and feature usage</p></li>
      <li>
        <p>
          <strong>Device and technical data:</strong> browser type, IP address, and operating system
        </p>
      </li>
    </ul>
    <p>
      This data is used for purposes including platform improvement and research purposes. All data
      will be anonymized prior to any kind of analysis or study. Research findings from aggregated
      and anonymized data may be published in academic conferences and journals. If done so, none of
      the data will be personally identifiable to any individual. Your data will not be sold or
      shared to third parties without your explicit consent.
    </p>
    <p>
      By continuing to use the Platform, you acknowledge that you have read and understood this
      logging practice.
    </p>
    <p><strong>3. Acceptable Use</strong></p>
    <p>You agree not to:</p>
    <ul>
      <li>
        <p>
          Use automated scripts, bots, or tools designed to attack, exploit, or disrupt the
          Platform&#39;s infrastructure or judging systems
        </p>
      </li>
      <li>
        <p>
          Upload or execute malicious code, including malware, ransomware, or denial-of-service
          payloads
        </p>
      </li>
      <li><p>Attempt to access other users&#39; submissions, accounts, or private data</p></li>
      <li><p>Harass, threaten, or harm other users through any feature of the Platform</p></li>
    </ul>
    <p>Violations may result in your account being banned.</p>
    <p><strong>4. Disclaimers and Liability</strong></p>
    <p>
      The Platform is provided &quot;as is&quot; without warranties of any kind, express or implied.
      While all efforts have been made for quality control, we do not warrant that the Platform will
      be uninterrupted or error-free, or that any problem and its test cases are complete and
      correct. Use of the Platform for any high-stakes purpose is at your own risk.
    </p>
    <p>
      The developers of AnimoRank and the problem contributors shall not be liable for any indirect,
      incidental, special, consequential, or punitive damages arising from your use of (or inability
      to use) the Platform.
    </p>
    <p><strong>5. Termination</strong></p>
    <p>
      We may suspend or terminate your access at any time, with or without notice, for conduct that
      we determine violates these Terms or is harmful to other users, the Platform, or third
      parties. Upon termination, your right to use the Platform ceases immediately.
    </p>
    <p><strong>6. Changes to These Terms</strong></p>
    <p>
      We may update these Terms at any time. If we make material changes, you will be notified
      through a prominent notice on the Platform. Your continued use of the Platform after the
      effective date of revised Terms constitutes your acceptance of the changes.
    </p>
    <p>
      You have the right to revoke your acceptance of the terms of service at any time through the
      Platform itself. If you revoke your acceptance of the terms, all your data will also be
      deleted.
    </p>
    <p><strong>7. Contact</strong></p>
    <p>If you have questions about these Terms, please contact us at: animorank@gmail.com.</p>
  </div>

  <form
    method="POST"
    action="?/accept"
    use:enhance
    class="flex gap-4"
  >
    <button
      name="accept"
      type="submit"
      class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
    >
      Accept
    </button>
    <button
      type="button"
      onclick={() => (showModal = true)}
      class="bg-gray-300 text-black px-6 py-2 rounded hover:bg-gray-400 transition"
    >
      Decline
    </button>
  </form>

  {#if showModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
        <h2 class="text-xl font-bold mb-4">Confirm Account Deletion</h2>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          You have declined the Terms of Service. If you do not accept them, you will not be able to
          use AnimoRank. Are you sure you want to delete your account? This action cannot be undone.
        </p>

        <label class="flex items-start gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            bind:checked={isConfirmed}
            class="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span
            class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
          >
            Yes. I confirm I want to delete my account.
          </span>
        </label>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            onclick={() => {
              showModal = false;
              isConfirmed = false;
            }}
            class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <form
            method="POST"
            action="?/deleteAccount"
            use:enhance
          >
            <button
              type="submit"
              disabled={!isConfirmed}
              class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Delete Account
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>
