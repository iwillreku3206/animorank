<script lang="ts">
  /** @type {{openSettings: any, user: any}} */
  // eslint-disable-next-line no-useless-assignment
  let { openSettings = $bindable(), user }: { openSettings: boolean; user: User } = $props();
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import type { User } from '@auth/sveltekit';
  import { signOut } from '@auth/sveltekit/client';

  const logout = async () => {
    signOut();
  };

  const about = () => {
    openSettings = false;
    goto('/about');
  };
</script>

<div class="fixed grid place-items-center w-full h-full z-20">
  <button
    onclick={() => {
      openSettings = false;
    }}
    class="absolute w-full h-full bg-black opacity-80"
    aria-label="Close"
  >
  </button>
  <div class="w-96 p-8 flex flex-col justify-center items-center z-30">
    <div class="grid place-items-center w-48 h-48 bg-gray-100 rounded-full mb-2 overflow-hidden">
      <img
        src={user.image}
        alt="profile"
        class="w-full h-full rounded-full"
      />
    </div>
    <h2 class="mb-10">{user.email}</h2>
    <button
      class="mb-2 underline cursor-pointer"
      onclick={logout}>Logout</button
    >
    <button
      class="mb-2 underline cursor-pointer"
      onclick={about}>About</button
    >
    <form
      method="POST"
      action="/tos/?/revoke"
      use:enhance={() => {
        openSettings = false;
      }}
    >
      <button
        type="submit"
        class="mb-2 underline cursor-pointer">Review TOS</button
      >
    </form>
    <a
      class="mb-2 underline cursor-pointer"
      href="https://forms.gle/uDpnjEoYkyjHZsWVA"
      target="_blank">Feedback</a
    >
    <button
      class="btn mt-4 btn-square btn-ghost"
      onclick={() => (openSettings = false)}
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</div>
