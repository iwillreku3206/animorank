<script lang="ts">
  import dropdown from '$lib/assets/dropdown.svg';
  import edit from '$lib/assets/edit.svg';
  import del from '$lib/assets/delete.svg';
  import close from '$lib/assets/close.svg';
  import done from '$lib/assets/done.svg';
  import link from '$lib/assets/link.svg';
  import statistics from '$lib/assets/statistics.svg';
  import global from '$lib/assets/global.svg';
  import hidden from '$lib/assets/hidden.svg';
  import lock from '$lib/assets/lock.svg';
  import visible from '$lib/assets/visible.svg';
  import type { ProblemSet } from './+page.server';
  import { createProblem } from './api';
  import { goto } from '$app/navigation';

  let { pset }: { pset: ProblemSet } = $props();
  let togglebttn = $state(false);
  let openEdit = $state(false);
  let loading = $state(false);
  let linkFeedback = $state(false);
  let disableAddProblem = $state(false);

  const linkFeedbackHandler = (event: MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText('http://localhost:5173/pset/' + pset.id);
    linkFeedback = true;
    setTimeout(() => {
      linkFeedback = false;
    }, 2000);
  };

  const createProblemHandler = async () => {
    disableAddProblem = true;
    try {
      const id = await createProblem(pset.id);
      if (id) {
        goto(`/edit/${id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      disableAddProblem = false;
    }
  };

  const toggleVisibility = async (id: string, value: boolean) => {
    await fetch(`/api/problem/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ visible: value }),
      headers: {
        'content-type': 'application/json'
      }
    });

    pset.problems[pset.problems.findIndex((x) => x.id === id)].visible = value;
  };
</script>

{#if openEdit && !loading}
  <div class="w-full mt-8 min-h-72 p-3 bg-[#1F1F1F] rounded flex flex-wrap">
    <div class="w-full flex justify-between">
      <h2 class="text-2xl mb-4 w-full">{pset.title}</h2>
      {#if !pset}
        <img
          src={lock}
          alt="lock"
          class="h-6 cursor-pointer"
        />
      {/if}
    </div>
    <div class="px-3 pb-10 w-full">
      {pset.description}
    </div>
    <div class="flex justify-between w-full flex-wrap">
      <div class={pset.global ? 'mt-5 mb-5 w-ful w-full' : 'mt-5 mb-5 w-ful md:w-[600px]'}>
        <div class="flex align-middle justify-between border-b border-borderColor p-3">
          <div class="text-xl">Problems</div>
          <div class="flex align-middle">
            <button
              onclick={createProblemHandler}
              class="btn btn-xs ml-2 mt-1 bg-[#006239] border-0 hover:bg-[#004327]"
              disabled={disableAddProblem}
            >
              Add Problem
            </button>
          </div>
        </div>
        <div>
          {#each pset.problems as problem}
            <div class="flex justify-between p-2 align-middle text-center">
              <a
                href="/edit/{problem.id}"
                class="mt-auto mb-auto ml-4">{problem.name}</a
              >
              <div class="flex">
                <div class="grid place-items-center">
                  <div
                    class="tooltip tooltip-bottom m-0 p-0"
                    data-tip={problem.visible ? 'Visible to students' : 'Hidden to students'}
                  >
                    <label class="swap swap-rotate">
                      <input
                        type="checkbox"
                        bind:checked={problem.visible}
                        onclick={() => toggleVisibility(problem.id, !problem.visible)}
                      />
                      <img
                        src={hidden}
                        alt="hidden"
                        class="h-9 cursor-pointer swap-off"
                      />
                      <img
                        src={visible}
                        alt="visible"
                        class="h-9 cursor-pointer swap-on"
                      />
                    </label>
                  </div>
                </div>
                <!-- <button class="btn btn-s ml-2 bg-[#121212] border-0 hover:bg-[#090909]">
									<img src={edit} alt="edit" class="h-4 cursor-pointer" />
								</button> -->
                {#if !pset.global}
                  <button class="btn btn-s ml-2 bg-[#121212] border-0 hover:bg-[#090909]">
                    <img
                      src={statistics}
                      alt="statistics"
                      class="h-5 cursor-pointer"
                    />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
      {#if !pset.global}
        <div class="mt-5 mb-5 w-full md:w-[600px]">
          <div class="flex align-middle justify-between border-b border-borderColor p-3">
            <div class="text-xl">Students</div>
          </div>
          <div>
            <h3 class="p-3">Pending</h3>
            <div class="flex justify-between p-2 align-middle text-center">
              <h3 class="mt-auto mb-auto ml-4">paulivanenclonar@gmail.com</h3>
              <button class="btn btn-s bg-[#006239] border-0 hover:bg-[#004327]">
                <img
                  src={done}
                  alt="edit"
                  class="h-6 cursor-pointer"
                />
              </button>
            </div>
            <div class="flex justify-between p-2 align-middle text-center">
              <h3 class="mt-auto mb-auto ml-4">paul_enclonar@dlsu.edu.ph</h3>
              <button class="btn btn-s bg-[#006239] border-0 hover:bg-[#004327]">
                <img
                  src={done}
                  alt="edit"
                  class="h-6 cursor-pointer"
                />
              </button>
            </div>
            <h3 class="p-3">Current</h3>
            <div class="flex justify-between p-2 align-middle text-center">
              <h3 class="mt-auto mb-auto ml-4">paulivanenclonar@gmail.com</h3>
              <button class="btn btn-error btn-s ml-2">
                <img
                  src={del}
                  alt="delete"
                  class="h-4 cursor-pointer"
                />
              </button>
            </div>
            <div class="flex justify-between p-2 align-middle text-center">
              <h3 class="mt-auto mb-auto ml-4">paul_enclonar@dlsu.edu.ph</h3>
              <button class="btn btn-error btn-s ml-2">
                <img
                  src={del}
                  alt="delete"
                  class="h-4 cursor-pointer"
                />
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
    <div class="flex justify-end w-full mt-8 sm:mt-20">
      <button
        class="btn btn-s mr-2 bg-[#121212] border-0 hover:bg-[#090909]"
        onclick={() => (openEdit = false)}
      >
        <img
          src={close}
          alt="edit"
          class="h-6 cursor-pointer"
        />
      </button>
      <button
        class="btn btn-s bg-[#006239] border-0 hover:bg-[#004327]"
        onclick={() => {
          openEdit = false;
        }}
      >
        <img
          src={done}
          alt="edit"
          class="h-6 cursor-pointer"
        />
      </button>
    </div>
  </div>
{:else if loading}
  <div
    class="mt-8 min-h-72 w-96 sm:mr-5 p-3 bg-[#1F1F1F] rounded cursor-pointer grid place-items-center"
  >
    <span class="loading loading-spinner loading-md"></span>
  </div>
{:else}
  <div
    role="button"
    tabindex="0"
    onclick={() => (openEdit = true)}
    onkeydown={(event) => event.key == 'Enter' && (openEdit = true)}
    class="mt-8 min-h-72 w-96 sm:mr-5 p-3 bg-[#1F1F1F] rounded cursor-pointer flex flex-col justify-between"
  >
    <div class="flex justify-between w-full">
      <h2 class="text-2xl mb-4">{pset.title}</h2>
      {#if !pset.global}
        <div class="grid place-items-center">
          <div
            class="tooltip tooltip-bottom pb-2"
            data-tip="Private"
          >
            <img
              src={lock}
              alt="lock"
              class="h-6 cursor-pointer"
            />
          </div>
        </div>
      {:else}
        <div class="grid place-items-center">
          <div
            class="tooltip tooltip-bottom pb-2"
            data-tip="Global"
          >
            <img
              src={global}
              alt="global"
              class="h-6 cursor-pointer"
            />
          </div>
        </div>
      {/if}
    </div>
    <div class="px-4 pb-10">
      {pset.description}
    </div>
    <div class="flex justify-end">
      {#if linkFeedback}
        <div
          class="tooltip tooltip-open mr-2"
          data-tip="Link copied to clipboard"
        >
          <button class="btn btn-s bg-[#121212] border-0 hover:bg-[#090909]">
            <img
              src={link}
              alt="edit"
              class="h-6 cursor-pointer"
            />
          </button>
        </div>
      {:else}
        <button
          class="btn btn-s bg-[#121212] border-0 mr-2 hover:bg-[#090909]"
          onclick={linkFeedbackHandler}
        >
          <img
            src={link}
            alt="edit"
            class="h-6 cursor-pointer"
          />
        </button>
      {/if}

      <button
        class="btn btn-s bg-[#121212] border-0 hover:bg-[#090909]"
        onclick={(event) => {
          event.stopPropagation();
          openEdit = true;
        }}
      >
        <img
          src={edit}
          alt="edit"
          class="h-6 cursor-pointer"
        />
      </button>
    </div>
  </div>
{/if}
