<script lang="ts">
	import type { Player, GuessData } from '$lib/types';

	// Accept players array as prop and gameStatus to determine display mode
	let {
		players = [],
		currentPlayerId = '',
		gameStatus = 'playing'
	}: {
		players: Player[];
		currentPlayerId: string;
		gameStatus: 'playing' | 'roundEnd' | 'waiting' | 'gameEnd';
	} = $props();

	// Sort players by score in descending order
	let sortedPlayers = $derived([...players].sort((a, b) => b.score - a.score));

	// Function to determine if a guess is correct (isAnswer is true)
	function isCorrectGuess(guess: GuessData): boolean {
		return guess.isAnswer === true;
	}

	// Function to count how many shared tags a guess has
	function countSharedTags(guess: GuessData): number {
		return guess.sharedMetaTags?.length || 0;
	}

	// Function to count the number of matching properties in a guess
	function countMatchingProperties(guess: GuessData): number {
		let count = 0;

		// Gender match
		if (guess.genderFeedback === 'yes') count++;

		// Shared appearances
		if (guess.sharedAppearances?.count > 0) count++;

		// Shared meta tags
		if (guess.sharedMetaTags?.length > 0) count++;

		// Popularity
		if (guess.popularityFeedback === '=') count++;

		// Rating
		if (guess.ratingFeedback === '=') count++;

		// Latest appearance year
		if (guess.latestAppearanceFeedback === '=') count++;

		// Earliest appearance year
		if (guess.earliestAppearanceFeedback === '=') count++;

		// Appearances count
		if (guess.appearancesCountFeedback === '=') count++;

		return count;
	}

	// Function to get appropriate color class based on match count
	function getMatchCountColorClass(count: number): string {
		if (count >= 4) return 'bg-green-100 text-green-800';
		if (count >= 2) return 'bg-yellow-100 text-yellow-800';
		return 'bg-gray-100 text-gray-800';
	}

	// Function to determine if a player is currently guessing (has submitted guesses this round)
	function isPlayerGuessing(player: Player): boolean {
		return player.guesses && player.guesses.length > 0;
	}

	function isEndGame(gameStatus: string): boolean {
		return gameStatus === 'roundEnd' || gameStatus === 'gameEnd';
	}
</script>

<div class="overflow-hidden rounded-lg bg-white shadow-sm">
	<div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
		<h3 class="text-base font-medium text-gray-700">
			{isEndGame(gameStatus) ? '所有玩家的猜测' : '玩家猜测状态'}
		</h3>
		<p class="text-sm text-gray-500">
			{isEndGame(gameStatus) ? '本轮各玩家的猜测情况' : '正在进行中的猜测情况'}
		</p>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse">
			<thead>
				<tr>
					<th class="w-48 bg-gray-100 p-3 text-left">玩家</th>
					<th class="bg-gray-100 p-3">
						{isEndGame(gameStatus) ? '猜测' : '猜测状态'}
					</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedPlayers as player}
					<tr class={player.id === currentPlayerId ? 'bg-blue-50' : ''}>
						<td class="border-b border-gray-100 p-3 pl-4 align-top">
							<div class="font-medium">
								{player.name}
								{#if player.isHost}
									<span class="ml-1 text-xs text-blue-600">(房主)</span>
								{/if}
							</div>
							<div class="text-sm text-gray-500">
								得分: {player.score}
							</div>
							<div class="text-sm text-gray-500">
								{player.guesses?.length || 0} 次猜测
							</div>
						</td>
						<td class="border-b border-gray-100 p-3">
							{#if player.guesses && player.guesses.length > 0}
								{#if isEndGame(gameStatus)}
									<!-- Show detailed guess information at round end -->
									<div class="flex flex-wrap gap-2">
										{#each player.guesses as guess, index}
											<div
												class={`relative flex flex-col items-center rounded-md border p-2 ${
													isCorrectGuess(guess)
														? 'border-green-300 bg-green-100'
														: 'border-gray-200 bg-gray-50'
												}`}
												style="min-width: 80px;"
											>
												{#if isCorrectGuess(guess)}
													<div
														class="absolute -top-1 -right-1 rounded-full bg-green-500 p-0.5 text-white"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="h-4 w-4"
															viewBox="0 0 20 20"
															fill="currentColor"
														>
															<path
																fill-rule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clip-rule="evenodd"
															/>
														</svg>
													</div>
												{/if}

												<div class="text-xs text-gray-500">#{index + 1}</div>

												{#if guess.icon}
													<img
														src={guess.icon}
														alt={guess.name}
														class="my-1 h-12 w-12 rounded-md object-cover"
													/>
												{:else}
													<div
														class="my-1 flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-500"
													>
														无图片
													</div>
												{/if}

												<div
													class={`text-center text-sm font-medium ${isCorrectGuess(guess) ? 'text-green-800' : ''}`}
												>
													{guess.name}
												</div>
												<div
													class={`text-center text-xs ${isCorrectGuess(guess) ? 'text-green-700' : 'text-gray-500'}`}
												>
													{guess.nameCn}
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<!-- Show vague information during active rounds -->
									<div class="flex flex-wrap gap-2">
										{#each player.guesses as guess, index}
											{@const matchCount = countMatchingProperties(guess)}
											<div
												class="flex flex-col items-center rounded-md border border-gray-200 bg-gray-50 p-2"
												style="min-width: 120px; max-width: 140px;"
											>
												<div class="text-xs text-gray-500">#{index + 1}</div>

												<!-- Mystery character icon -->
												<div
													class="my-1 flex h-12 w-12 items-center justify-center rounded-md bg-gray-200 text-gray-500"
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
															d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												</div>

												<!-- Overall match indicator -->
												<div class="mb-2 w-full text-center">
													<div
														class={`rounded-md px-2 py-1 text-xs font-medium ${getMatchCountColorClass(matchCount)}`}
													>
														匹配度: {matchCount}/8
													</div>
												</div>

												<!-- Match categories -->
												<div class="mb-2 grid w-full grid-cols-2 gap-x-2 gap-y-1">
													<!-- Gender match -->
													<div class="flex items-center gap-1">
														<span
															class={`inline-flex h-2 w-2 rounded-full ${guess.genderFeedback === 'yes' ? 'bg-green-500' : 'bg-gray-300'}`}
														></span>
														<span class="text-[10px] text-gray-500">性别</span>
													</div>

													<!-- Popularity match -->
													<div class="flex items-center gap-1">
														<span
															class={`inline-flex h-2 w-2 rounded-full ${guess.popularityFeedback === '=' ? 'bg-green-500' : 'bg-gray-300'}`}
														></span>
														<span class="text-[10px] text-gray-500">人气</span>
													</div>

													<!-- Rating match -->
													<div class="flex items-center gap-1">
														<span
															class={`inline-flex h-2 w-2 rounded-full ${guess.ratingFeedback === '=' ? 'bg-green-500' : 'bg-gray-300'}`}
														></span>
														<span class="text-[10px] text-gray-500">评分</span>
													</div>

													<!-- Appearances count match -->
													<div class="flex items-center gap-1">
														<span
															class={`inline-flex h-2 w-2 rounded-full ${guess.appearancesCountFeedback === '=' ? 'bg-green-500' : 'bg-gray-300'}`}
														></span>
														<span class="text-[10px] text-gray-500">作品数</span>
													</div>

													<!-- Latest appearance year match -->
													<div class="flex items-center gap-1">
														<span
															class={`inline-flex h-2 w-2 rounded-full ${guess.latestAppearanceFeedback === '=' ? 'bg-green-500' : 'bg-gray-300'}`}
														></span>
														<span class="text-[10px] text-gray-500">最新年份</span>
													</div>

													<!-- Earliest appearance year match -->
													<div class="flex items-center gap-1">
														<span
															class={`inline-flex h-2 w-2 rounded-full ${guess.earliestAppearanceFeedback === '=' ? 'bg-green-500' : 'bg-gray-300'}`}
														></span>
														<span class="text-[10px] text-gray-500">最早年份</span>
													</div>
												</div>

												<!-- Tags match and shared appearances with count -->
												<div class="flex w-full justify-between gap-1">
													<!-- Tags match with count -->
													<div class="flex-1 text-center">
														<span
															class={`block rounded-full px-1 py-0.5 text-xs font-medium ${
																countSharedTags(guess) > 0
																	? 'bg-green-100 text-green-800'
																	: 'bg-gray-100 text-gray-600'
															}`}
														>
															标签: {countSharedTags(guess)}/{guess.metaTags?.length || 0}
														</span>
													</div>

													<!-- Shared appearances -->
													<div class="flex-1 text-center">
														<span
															class={`block rounded-full px-1 py-0.5 text-xs font-medium ${
																guess.sharedAppearances?.count > 0
																	? 'bg-green-100 text-green-800'
																	: 'bg-gray-100 text-gray-600'
															}`}
														>
															共演: {guess.sharedAppearances?.count || 0}
														</span>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{:else}
								<div class="py-2 text-sm text-gray-500 italic">此玩家本轮未进行猜测</div>
							{/if}
						</td>
					</tr>
				{/each}

				{#if players.length === 0}
					<tr>
						<td colspan="2" class="border-b border-gray-100 p-6 text-center text-gray-500">
							没有玩家进行猜测
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
