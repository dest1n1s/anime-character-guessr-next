<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Character } from '$lib/types';
	import TagContributionPopup from './TagContributionPopup.svelte';

	let { result, answer, onClose } = $props();

	const dispatch = createEventDispatcher();
	let showTagPopup = $state(false);
</script>

{#if showTagPopup}
	<TagContributionPopup
		character={answer}
		onClose={() => {
			showTagPopup = false;
			onClose();
		}}
	/>
{:else}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div
			class="relative max-h-[90vh] w-[90vw] max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
		>
			<button
				class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
				onclick={onClose}
				aria-label="关闭"
			>
				×
			</button>

			<div class="mb-4 border-b border-gray-200 pb-2">
				<h2 class="text-2xl font-bold text-gray-800">
					{result === 'win' ? '🎉 给你猜对了，有点东西' : '😢 已经结束咧'}
				</h2>
			</div>

			<div class="answer-character">
				<div class="flex flex-col gap-4 md:flex-row">
					<div class="shrink-0">
						<img
							src={answer.image || '/images/no-image.jpg'}
							alt={answer.name}
							class="w-56 rounded-lg object-cover shadow-md"
						/>
					</div>

					<div class="flex-1">
						<div class="mb-3 flex items-start justify-between">
							<a
								href={`https://bgm.tv/character/${answer.id}`}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-primary-600 group text-gray-800"
							>
								<div class="group-hover:text-primary-600 text-2xl font-bold">{answer.name}</div>
								<div class="group-hover:text-primary-500 text-lg text-gray-600">
									{answer.nameCn}
								</div>
							</a>

							<div class="flex items-center gap-2">
								<button
									class="group flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-white transition-colors hover:bg-blue-600"
									onclick={() => (showTagPopup = true)}
								>
									贡献标签
								</button>
							</div>
						</div>

						{#if answer.summary}
							<div class="mt-4 rounded-lg bg-gray-50 p-4">
								<div class="prose prose-sm prose-gray max-h-52 overflow-y-auto text-gray-700">
									{answer.summary}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
