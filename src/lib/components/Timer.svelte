<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { timeLimit, onTimeUp, isActive = true } = $props();

	let timeLeft = $state(timeLimit);
	let endTime = $state<number | null>(null);
	let interval = $state<ReturnType<typeof setInterval> | null>(null);

	// Format time in MM:SS
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="my-2 text-center text-2xl font-bold text-gray-800">
	{#if timeLimit}
		<span class="shadow-xs backdrop-blur-xs inline-block rounded-full bg-white/90 px-4 py-2">
			{formatTime(timeLeft)}
		</span>
	{/if}
</div>
