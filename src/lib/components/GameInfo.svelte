<script lang="ts">
  import type { Character, Hints } from '$lib/types';
  
  let { gameEnd, guessesLeft, onRestart, answerCharacter = null, hints } = $props();
  
  // Calculate when to show hints based on guesses left
  const showFirstHint = $derived(guessesLeft <= 5);
  const showSecondHint = $derived(guessesLeft <= 2);
</script>

<div class="mb-4 text-right">
  {#if gameEnd}
    <button 
      class="rounded-lg bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700"
      onclick={onRestart}
    >
      再玩一次
    </button>
  {:else}
    <div class="flex flex-col items-end gap-2">
      <span class="text-lg font-medium text-gray-600">剩余次数: {guessesLeft}</span>
      
      {#if showFirstHint}
        <div class="rounded-lg bg-white px-4 py-2 shadow-xs">
          <span class="mr-2 font-medium text-gray-500">提示 1:</span>
          <span class="text-gray-800">{hints.first}</span>
        </div>
      {/if}
      
      {#if showSecondHint}
        <div class="rounded-lg bg-white px-4 py-2 shadow-xs">
          <span class="mr-2 font-medium text-gray-500">提示 2:</span>
          <span class="text-gray-800">{hints.second}</span>
        </div>
      {/if}
    </div>
  {/if}
</div> 