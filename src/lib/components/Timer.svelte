<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  let { timeLimit, onTimeUp, isActive = true, reset = false } = $props();
  
  let timeLeft = $state(timeLimit);
  let endTime = $state<number | null>(null);
  let interval = $state<ReturnType<typeof setInterval> | null>(null);
  
  // Format time in MM:SS
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Initialize or reset end time
  $effect(() => {
    if (reset || !endTime || timeLeft !== timeLimit) {
      endTime = Date.now() + timeLimit * 1000;
      timeLeft = timeLimit;
    }
  });
  
  // Setup and cleanup interval
  $effect(() => {
    if (isActive && endTime) {
      setupInterval();
    }
  });
  
  function setupInterval() {
    // Clear any existing interval
    if (interval) {
      clearInterval(interval);
    }
    
    // Set a new interval
    interval = setInterval(() => {
      if (!endTime) return;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      timeLeft = remaining;
      
      if (remaining === 0) {
        if (interval) clearInterval(interval);
        onTimeUp();
      }
    }, 1000);
  }
  
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="my-2 text-center text-2xl font-bold text-gray-800">
  {#if timeLimit}
    <span class="inline-block rounded-full bg-white/90 px-4 py-2 shadow-xs backdrop-blur-xs">
      {formatTime(timeLeft)}
    </span>
  {/if}
</div> 