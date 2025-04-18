<script lang="ts">
	import type { Player, GuessData } from '$lib/types';

	// Accept players array as prop
	let { players = [], currentPlayerId = '' }: { players: Player[]; currentPlayerId: string } =
		$props();

	// Sort players by score in descending order
	let sortedPlayers = $derived([...players].sort((a, b) => b.score - a.score));

	// Function to determine if a guess is correct (isAnswer is true)
	function isCorrectGuess(guess: GuessData): boolean {
		return guess.isAnswer === true;
	}
</script>

<div class="overflow-hidden rounded-lg bg-white shadow-sm">
	<div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
		<h3 class="text-base font-medium text-gray-700">所有玩家的猜测</h3>
		<p class="text-sm text-gray-500">本轮各玩家的猜测情况</p>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse">
			<thead>
				<tr>
					<th class="w-48 bg-gray-100 p-3 text-left">玩家</th>
					<th class="bg-gray-100 p-3">猜测</th>
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
