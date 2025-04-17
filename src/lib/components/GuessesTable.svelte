<script lang="ts">
	import type { GuessData } from '$lib/types';

	// Custom Tailwind style:
	// bg-striped - Add this class to your tailwind.config.js under extend.backgroundImage:
	// 'striped': 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200, 200, 200, 0.3) 4px, rgba(200, 200, 200, 0.3) 8px)'

	let { guesses = [] }: { guesses: GuessData[] } = $props();

	let clickedExpandTags = $state(new Set<string>());

	// Get gender emoji based on gender string
	function getGenderEmoji(gender: string): string {
		switch (gender) {
			case 'male':
				return '♂️';
			case 'female':
				return '♀️';
			default:
				return '❓';
		}
	}

	// Handle expand tag click
	function handleExpandTagClick(guessIndex: number, tagIndex: number): void {
		const key = `${guessIndex}-${tagIndex}`;
		clickedExpandTags = new Set(clickedExpandTags).add(key);
	}
</script>

<div class="overflow-x-auto rounded-lg bg-white shadow-sm">
	<table class="w-full border-collapse">
		<thead>
			<tr>
				<th class="w-20 bg-gray-100 p-3"></th>
				<th class="w-32 bg-gray-100 p-3">名字</th>
				<th class="w-16 bg-gray-100 p-3">性别</th>
				<th class="w-32 bg-gray-100 p-3">人气</th>
				<th class="w-32 bg-gray-100 p-3">
					<div>作品数</div>
					<div>最高分</div>
				</th>
				<th class="w-32 bg-gray-100 p-3">
					<div>最晚登场</div>
					<div>最早登场</div>
				</th>
				<th class="w-auto bg-gray-100 p-3">作品标签</th>
				<th class="w-48 bg-gray-100 p-3">共同出演</th>
			</tr>
		</thead>
		<tbody>
			{#each guesses as guess, guessIndex}
				<tr>
					<td class="border-b border-gray-100 p-3 text-center">
						{#if guess.icon}
							<img
								src={guess.icon}
								alt={guess.name}
								class="mx-auto h-12 w-12 rounded-md object-cover"
							/>
						{:else}
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-500"
							>
								无图片
							</div>
						{/if}
					</td>

					<td class="border-b border-gray-100 p-3">
						<div
							class={`flex flex-col rounded-md p-1 ${guess.isAnswer ? 'bg-green-100' : ''} items-center`}
						>
							<div class={`font-medium ${guess.isAnswer ? 'text-green-800' : ''}`}>
								{guess.name}
							</div>
							<div class={`text-sm ${guess.isAnswer ? 'text-green-700' : 'text-gray-500'}`}>
								{guess.nameCn}
							</div>
						</div>
					</td>

					<td class="border-b border-gray-100 p-3 text-center">
						<span
							class={`inline-flex items-center justify-center rounded-md px-3 py-2 ${
								guess.genderFeedback === 'yes' ? 'bg-green-100 text-green-800' : ''
							}`}
						>
							{getGenderEmoji(guess.gender)}
						</span>
					</td>

					<td class="border-b border-gray-100 p-3 text-center">
						<span
							class={`inline-flex items-center justify-center rounded-md px-3 py-2 ${
								guess.popularityFeedback === '='
									? 'bg-green-100 text-green-800'
									: guess.popularityFeedback === '+' || guess.popularityFeedback === '-'
										? 'bg-yellow-100 text-yellow-800'
										: ''
							}`}
						>
							{guess.popularity}
							{guess.popularityFeedback === '+' || guess.popularityFeedback === '++'
								? ' ↓'
								: guess.popularityFeedback === '-' || guess.popularityFeedback === '--'
									? ' ↑'
									: ''}
						</span>
					</td>

					<td class="border-b border-gray-100 p-3 text-center">
						<div class="flex flex-col gap-1">
							<div
								class={`rounded-md px-3 py-2 ${
									guess.appearancesCountFeedback === '='
										? 'bg-green-100 text-green-800'
										: guess.appearancesCountFeedback === '+' ||
											  guess.appearancesCountFeedback === '-'
											? 'bg-yellow-100 text-yellow-800'
											: guess.appearancesCountFeedback === '?'
												? 'bg-striped bg-gray-100 text-gray-500'
												: ''
								}`}
							>
								{guess.appearancesCount}
								{guess.appearancesCountFeedback === '+' || guess.appearancesCountFeedback === '++'
									? ' ↓'
									: guess.appearancesCountFeedback === '-' ||
										  guess.appearancesCountFeedback === '--'
										? ' ↑'
										: ''}
							</div>

							<div
								class={`rounded-md px-3 py-2 ${
									guess.ratingFeedback === '='
										? 'bg-green-100 text-green-800'
										: guess.ratingFeedback === '+' || guess.ratingFeedback === '-'
											? 'bg-yellow-100 text-yellow-800'
											: guess.ratingFeedback === '?'
												? 'bg-striped bg-gray-100 text-gray-500'
												: ''
								}`}
							>
								{guess.highestRating === -1 ? '无' : guess.highestRating}
								{guess.ratingFeedback === '+' || guess.ratingFeedback === '++'
									? ' ↓'
									: guess.ratingFeedback === '-' || guess.ratingFeedback === '--'
										? ' ↑'
										: ''}
							</div>
						</div>
					</td>

					<td class="border-b border-gray-100 p-3 text-center">
						<div class="flex flex-col gap-1">
							<div
								class={`rounded-md px-3 py-2 ${
									guess.latestAppearanceFeedback === '='
										? 'bg-green-100 text-green-800'
										: guess.latestAppearanceFeedback === '+' ||
											  guess.latestAppearanceFeedback === '-'
											? 'bg-yellow-100 text-yellow-800'
											: guess.latestAppearanceFeedback === '?'
												? 'bg-striped bg-gray-100 text-gray-500'
												: ''
								}`}
							>
								{guess.latestAppearance === -1 ? '无' : guess.latestAppearance}
								{guess.latestAppearanceFeedback === '+' || guess.latestAppearanceFeedback === '++'
									? ' ↓'
									: guess.latestAppearanceFeedback === '-' ||
										  guess.latestAppearanceFeedback === '--'
										? ' ↑'
										: ''}
							</div>

							<div
								class={`rounded-md px-3 py-2 ${
									guess.earliestAppearanceFeedback === '='
										? 'bg-green-100 text-green-800'
										: guess.earliestAppearanceFeedback === '+' ||
											  guess.earliestAppearanceFeedback === '-'
											? 'bg-yellow-100 text-yellow-800'
											: guess.earliestAppearanceFeedback === '?'
												? 'bg-striped bg-gray-100 text-gray-500'
												: ''
								}`}
							>
								{guess.earliestAppearance === -1 ? '无' : guess.earliestAppearance}
								{guess.earliestAppearanceFeedback === '+' ||
								guess.earliestAppearanceFeedback === '++'
									? ' ↓'
									: guess.earliestAppearanceFeedback === '-' ||
										  guess.earliestAppearanceFeedback === '--'
										? ' ↑'
										: ''}
							</div>
						</div>
					</td>

					<td class="border-b border-gray-100 p-3">
						<div class="flex flex-wrap justify-center gap-1 p-1">
							{#each guess.metaTags as tag, tagIndex}
								{#if tag === '展开'}
									{@const tagKey = `${guessIndex}-${tagIndex}`}
									{#if !clickedExpandTags.has(tagKey)}
										<button
											class="text-primary-600 cursor-pointer rounded-md bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200"
											onclick={() => handleExpandTagClick(guessIndex, tagIndex)}
										>
											{tag}
										</button>
									{/if}
								{:else}
									<button
										class={`rounded-md px-2 py-1 text-sm ${
											guess.sharedMetaTags.includes(tag)
												? 'bg-green-100 text-green-800'
												: 'bg-gray-100 text-gray-600'
										}`}
									>
										{tag}
									</button>
								{/if}
							{/each}
						</div>
					</td>

					<td class="border-b border-gray-100 p-3 text-center">
						<span
							class={`inline-block rounded-md px-3 py-2 ${
								guess.sharedAppearances.count > 0 ? 'bg-green-100 text-green-800' : ''
							}`}
						>
							{guess.sharedAppearances.first}
							{guess.sharedAppearances.count > 1 ? ` +${guess.sharedAppearances.count - 1}` : ''}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
