<script lang="ts">
	import { onMount } from 'svelte';
	import type { GameSettings, Subject } from '$lib/types';
	import { searchSubjects } from '$lib/api';

	interface Props {
		gameSettings: GameSettings;
		onSettingsChange: (setting: string, value: any) => void;
		onClose: () => void;
		onRestart: () => void;
		hideRestart?: boolean;
	}

	let { gameSettings, onSettingsChange, onClose, onRestart, hideRestart = false }: Props = $props();

	let searchQuery = $state('');
	let searchResults: Subject[] = $state([]);
	let isSearching = $state(false);
	let showConfirmation = $state(false);
	let settingToChange = $state<{ key: string; value: any } | null>(null);

	// Handle setting changes
	function handleNumberChange(setting: string, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value);
		if (!isNaN(value)) {
			if (hideRestart) {
				// If we're in an active game, show confirmation before changing
				settingToChange = { key: setting, value };
				showConfirmation = true;
			} else {
				// Direct change for non-active games
				onSettingsChange(setting, value);
			}
		}
	}

	function handleBooleanChange(setting: string, event: Event) {
		const target = event.target as HTMLInputElement;
		if (hideRestart) {
			// If we're in an active game, show confirmation before changing
			settingToChange = { key: setting, value: target.checked };
			showConfirmation = true;
		} else {
			// Direct change for non-active games
			onSettingsChange(setting, target.checked);
		}
	}

	// Confirm the setting change in active game
	function confirmSettingChange() {
		if (settingToChange) {
			onSettingsChange(settingToChange.key, settingToChange.value);
			showConfirmation = false;
			settingToChange = null;
		}
	}

	// Cancel the setting change
	function cancelSettingChange() {
		showConfirmation = false;
		settingToChange = null;
	}

	// Search for subjects
	async function handleSearch() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		try {
			const results = await searchSubjects(searchQuery.trim());
			searchResults = results;
		} catch (error) {
			console.error('Subject search failed:', error);
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	// Handle adding a subject to the settings
	function handleAddSubject(subject: Subject) {
		if (!gameSettings.addedSubjects.some((s) => s.id === subject.id)) {
			onSettingsChange('addedSubjects', [...gameSettings.addedSubjects, subject]);
		}
		searchResults = [];
		searchQuery = '';
	}

	// Handle removing a subject from the settings
	function handleRemoveSubject(id: number) {
		onSettingsChange(
			'addedSubjects',
			gameSettings.addedSubjects.filter((s) => s.id !== id)
		);
	}

	// Apply preset settings
	function applyPreset(preset: 'easy' | 'medium' | 'hard') {
		// For active games, show confirmation before applying preset
		if (hideRestart) {
			settingToChange = { key: 'preset', value: preset };
			showConfirmation = true;
			return;
		}

		// Apply preset directly for non-active games
		switch (preset) {
			case 'easy':
				onSettingsChange('startYear', new Date().getFullYear() - 10);
				onSettingsChange('topNSubjects', 100);
				onSettingsChange('maxAttempts', 7);
				onSettingsChange('enableHints', true);
				onSettingsChange('timeLimit', 600);
				onSettingsChange('totalRounds', 5);
				break;
			case 'medium':
				onSettingsChange('startYear', new Date().getFullYear() - 20);
				onSettingsChange('topNSubjects', 200);
				onSettingsChange('maxAttempts', 7);
				onSettingsChange('enableHints', true);
				onSettingsChange('timeLimit', 600);
				onSettingsChange('totalRounds', 7);
				break;
			case 'hard':
				onSettingsChange('startYear', 2000);
				onSettingsChange('topNSubjects', 400);
				onSettingsChange('maxAttempts', 8);
				onSettingsChange('enableHints', false);
				onSettingsChange('timeLimit', 600);
				onSettingsChange('totalRounds', 10);
				break;
		}
	}

	// Apply preset with confirmation for active game
	function applyPresetSettings(preset: 'easy' | 'medium' | 'hard') {
		switch (preset) {
			case 'easy':
				onSettingsChange('startYear', new Date().getFullYear() - 10);
				onSettingsChange('topNSubjects', 100);
				onSettingsChange('maxAttempts', 7);
				onSettingsChange('enableHints', true);
				onSettingsChange('timeLimit', 600);
				onSettingsChange('totalRounds', 5);
				break;
			case 'medium':
				onSettingsChange('startYear', new Date().getFullYear() - 20);
				onSettingsChange('topNSubjects', 200);
				onSettingsChange('maxAttempts', 7);
				onSettingsChange('enableHints', true);
				onSettingsChange('timeLimit', 600);
				onSettingsChange('totalRounds', 7);
				break;
			case 'hard':
				onSettingsChange('startYear', 2000);
				onSettingsChange('topNSubjects', 400);
				onSettingsChange('maxAttempts', 8);
				onSettingsChange('enableHints', false);
				onSettingsChange('timeLimit', 600);
				onSettingsChange('totalRounds', 10);
				break;
		}
		showConfirmation = false;
		settingToChange = null;
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
	<div
		class="relative max-h-[90vh] w-[95vw] max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
	>
		<button
			class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
			onclick={onClose}
			aria-label="关闭"
		>
			×
		</button>

		<div class="mb-4 border-b border-gray-200 pb-2">
			<h2 class="text-2xl font-bold text-gray-800">游戏设置</h2>
			{#if hideRestart}
				<p class="mt-1 text-sm text-gray-600">修改设置将在下一回合生效。当前回合的设置保持不变。</p>
			{/if}
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-4 rounded-lg bg-gray-50 p-4">
				<h3 class="text-lg font-semibold text-gray-800">预设难度</h3>
				<div class="flex gap-2">
					<button
						class="rounded-lg bg-green-100 px-4 py-2 text-green-800 hover:bg-green-200"
						onclick={() => applyPreset('easy')}
					>
						简单
					</button>
					<button
						class="rounded-lg bg-blue-100 px-4 py-2 text-blue-800 hover:bg-blue-200"
						onclick={() => applyPreset('medium')}
					>
						普通
					</button>
					<button
						class="rounded-lg bg-red-100 px-4 py-2 text-red-800 hover:bg-red-200"
						onclick={() => applyPreset('hard')}
					>
						困难
					</button>
				</div>

				<h3 class="mt-4 text-lg font-semibold text-gray-800">角色数据范围</h3>
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<label for="startYear" class="text-sm font-medium text-gray-700"> 开始年份: </label>
						<input
							id="startYear"
							type="number"
							min="1990"
							max={new Date().getFullYear()}
							value={gameSettings.startYear}
							onchange={(e) => handleNumberChange('startYear', e)}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center justify-between">
						<label for="endYear" class="text-sm font-medium text-gray-700"> 结束年份: </label>
						<input
							id="endYear"
							type="number"
							min="1990"
							max={new Date().getFullYear()}
							value={gameSettings.endYear}
							onchange={(e) => handleNumberChange('endYear', e)}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center justify-between">
						<label for="topNSubjects" class="text-sm font-medium text-gray-700">
							只包含热门作品:
						</label>
						<input
							id="topNSubjects"
							type="number"
							min="10"
							max="200"
							value={gameSettings.topNSubjects}
							onchange={(e) => handleNumberChange('topNSubjects', e)}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center justify-between">
						<label for="characterNum" class="text-sm font-medium text-gray-700">
							每作品角色数限制:
						</label>
						<input
							id="characterNum"
							type="number"
							min="1"
							max="20"
							value={gameSettings.characterNum}
							onchange={(e) => handleNumberChange('characterNum', e)}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center">
						<input
							type="checkbox"
							id="mainCharacterOnly"
							checked={gameSettings.mainCharacterOnly}
							onchange={(e) => handleBooleanChange('mainCharacterOnly', e)}
							class="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded-sm border-gray-300"
						/>
						<label for="mainCharacterOnly" class="text-sm font-medium text-gray-700">
							只包含主角
						</label>
					</div>

					<!-- <div class="flex items-center">
						<input
							type="checkbox"
							id="includeGame"
							checked={gameSettings.includeGame}
							onchange={(e) => handleBooleanChange('includeGame', e)}
							class="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded-sm border-gray-300"
						/>
						<label for="includeGame" class="text-sm font-medium text-gray-700">包含游戏角色</label>
					</div> -->
				</div>
			</div>

			<div class="space-y-4 rounded-lg bg-gray-50 p-4">
				<h3 class="text-lg font-semibold text-gray-800">游戏规则</h3>
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<label for="totalRounds" class="text-sm font-medium text-gray-700">总回合数:</label>
						<input
							id="totalRounds"
							type="number"
							min="1"
							max="20"
							value={gameSettings.totalRounds || 5}
							onchange={(e) => handleNumberChange('totalRounds', e)}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center justify-between">
						<label for="maxAttempts" class="text-sm font-medium text-gray-700">最大猜测次数:</label>
						<input
							id="maxAttempts"
							type="number"
							min="1"
							max="20"
							value={gameSettings.maxAttempts}
							onchange={(e) => handleNumberChange('maxAttempts', e)}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center justify-between">
						<label for="timeLimit" class="text-sm font-medium text-gray-700">时间限制 (秒):</label>
						<input
							id="timeLimit"
							type="number"
							min="0"
							max="600"
							value={gameSettings.timeLimit === null ? 0 : gameSettings.timeLimit}
							onchange={(e) => {
								const value = parseInt((e.target as HTMLInputElement).value);
								if (hideRestart) {
									// If we're in an active game, show confirmation before changing
									settingToChange = { key: 'timeLimit', value: value <= 0 ? null : value };
									showConfirmation = true;
								} else {
									// Direct change for non-active games
									onSettingsChange('timeLimit', value <= 0 ? null : value);
								}
							}}
							class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
						/>
					</div>

					<div class="flex items-center">
						<input
							type="checkbox"
							id="streamerMode"
							checked={gameSettings.streamerMode}
							onchange={(e) => handleBooleanChange('streamerMode', e)}
							class="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded-sm border-gray-300"
						/>
						<label for="streamerMode" class="text-sm font-medium text-gray-700">
							主播模式 (隐藏其他玩家名称)
						</label>
					</div>

					<!-- <div class="flex items-center">
						<input
							type="checkbox"
							id="subjectSearch"
							checked={gameSettings.subjectSearch}
							onchange={(e) => handleBooleanChange('subjectSearch', e)}
							class="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded-sm border-gray-300"
						/>
						<label for="subjectSearch" class="text-sm font-medium text-gray-700"
							>允许通过作品搜索</label
						>
					</div>

					<h3 class="mt-4 text-lg font-semibold text-gray-800">添加特定作品</h3>
					<div class="space-y-2">
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="搜索作品名称..."
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
							/>
							<button
								class="bg-primary-600 hover:bg-primary-700 rounded-md px-3 py-2 text-sm text-white"
								onclick={handleSearch}
								disabled={!searchQuery.trim() || isSearching}
							>
								{isSearching ? '搜索中...' : '搜索'}
							</button>
						</div>

						{#if searchResults.length > 0}
							<div class="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
								{#each searchResults as subject}
									<button
										class="flex cursor-pointer items-center justify-between border-b border-gray-100 p-2 hover:bg-gray-50"
										onclick={() => handleAddSubject(subject)}
									>
										<div>
											<div class="font-medium">{subject.name}</div>
											<div class="text-sm text-gray-500">{subject.name_cn}</div>
										</div>
										<div class="text-primary-600 text-xs">{subject.type}</div>
									</button>
								{/each}
							</div>
						{/if}

						{#if gameSettings.addedSubjects.length > 0}
							<div class="mt-3">
								<h4 class="mb-2 text-sm font-medium text-gray-700">已添加作品:</h4>
								<div class="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
									{#each gameSettings.addedSubjects as subject}
										<div class="flex items-center justify-between border-b border-gray-100 p-2">
											<div>
												<div class="font-medium">{subject.name}</div>
												<div class="text-sm text-gray-500">{subject.name_cn}</div>
											</div>
											<button
												class="rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
												onclick={() => handleRemoveSubject(subject.id)}
												aria-label="移除"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="h-4 w-4"
												>
													<path
														fill-rule="evenodd"
														d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div> -->
				</div>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			{#if !hideRestart}
				<button
					class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
					onclick={onRestart}
				>
					应用并重新开始
				</button>
			{/if}
			<button
				class="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
				onclick={onClose}
			>
				关闭
			</button>
		</div>
	</div>
</div>

<!-- Confirmation dialog for setting changes in active games -->
{#if showConfirmation}
	<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
		<div class="w-[95vw] max-w-md rounded-lg bg-white p-6 shadow-xl">
			<h3 class="text-lg font-semibold text-gray-800">确认更改设置</h3>
			<p class="mt-2 text-gray-600">你确定要更改这个设置吗？更改将在当前回合结束后生效。</p>
			<div class="mt-4 flex justify-end gap-3">
				<button
					class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
					onclick={cancelSettingChange}
				>
					取消
				</button>
				<button
					class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					onclick={settingToChange?.key === 'preset'
						? () => applyPresetSettings(settingToChange?.value)
						: confirmSettingChange}
				>
					确认更改
				</button>
			</div>
		</div>
	</div>
{/if}
