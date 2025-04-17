<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { SearchResult, Subject } from '$lib/types';
	import {
		searchCharacters,
		searchSubjects,
		getCharactersBySubjectId,
		getCharacterDetails
	} from '$lib/api';
	import { Combobox } from 'bits-ui';
	import CaretUpDown from 'phosphor-svelte/lib/CaretUpDown';
	import Check from 'phosphor-svelte/lib/Check';
	import OrangeSlice from 'phosphor-svelte/lib/OrangeSlice';
	import CaretDoubleUp from 'phosphor-svelte/lib/CaretDoubleUp';
	import CaretDoubleDown from 'phosphor-svelte/lib/CaretDoubleDown';
	import { debounce } from 'ts-debounce';

	let searchQuery = $state('');
	let { onCharacterSelect, isGuessing = false, gameEnd = false, subjectSearch = true } = $props();

	let characterResults = $state<SearchResult[]>([]);
	let subjectResults = $state<Subject[]>([]);
	let isSearching = $state(false);
	let isLoadingMore = $state(false);
	let offset = $state(0);
	let hasMore = $state(true);
	let selectedSubject = $state<Subject | null>(null);
	let searchInput = $state<HTMLInputElement | null>(null);
	let subjectCharacters = $state<SearchResult[]>([]);
	let filteredSubjectCharacters = $state<SearchResult[]>([]);

	const INITIAL_LIMIT = 10;
	const MORE_LIMIT = 5;

	async function handleSearch(reset = false) {
		if (!searchQuery.trim()) return;

		// If we have a selected subject, just filter the characters
		if (selectedSubject) {
			filterSubjectCharacters();
			return;
		}

		const currentLimit = reset ? INITIAL_LIMIT : MORE_LIMIT;
		const currentOffset = reset ? 0 : offset;

		if (reset) {
			isSearching = true;
		} else {
			isLoadingMore = true;
		}

		try {
			// Search for both characters and subjects simultaneously
			const [charactersPromise, subjectsPromise] = [
				searchCharacters(searchQuery.trim(), currentLimit, currentOffset),
				subjectSearch ? searchSubjects(searchQuery.trim()) : Promise.resolve([])
			];

			await Promise.all([
				charactersPromise
					.then((characters) => {
						console.log(characters);
						if (reset) {
							characterResults = characters;
							offset = INITIAL_LIMIT;
						} else {
							characterResults = [...characterResults, ...characters];
							offset = currentOffset + MORE_LIMIT;
						}
						hasMore = characters.length === currentLimit;
					})
					.catch((error) => {
						console.error('Failed to fetch characters:', error);
						if (reset) {
							characterResults = [];
						}
					}),
				subjectsPromise
					.then((subjects) => {
						if (reset) {
							subjectResults = subjects;
						}
					})
					.catch((error) => {
						console.error('Failed to fetch subjects:', error);
						if (reset) {
							subjectResults = [];
						}
					})
			]);
		} catch (error) {
			console.error('Search failed:', error);
			if (reset) {
				characterResults = [];
				subjectResults = [];
			}
		} finally {
			isSearching = false;
			isLoadingMore = false;
		}
	}

	async function handleSubjectSelect(subject: Subject) {
		isSearching = true;
		selectedSubject = subject;

		// Clear the current search query and update the input field
		if (searchInput) {
			searchInput.value = `@${subject.name}`;
			searchQuery = `@${subject.name}`;
		}

		try {
			// Fetch characters for the selected subject
			const characters = await getCharactersBySubjectId(subject.id);
			subjectCharacters = characters;
			filteredSubjectCharacters = [...characters];

			// Clear other search results
			characterResults = [];
			subjectResults = [];
		} catch (error) {
			console.error('Failed to fetch characters:', error);
			subjectCharacters = [];
			filteredSubjectCharacters = [];
		} finally {
			isSearching = false;
		}
	}

	function filterSubjectCharacters() {
		if (!selectedSubject || !searchQuery) return;

		// Extract the filter query (remove the @subject part)
		const filterQuery = searchQuery.replace(`@${selectedSubject.name}`, '').trim();

		if (!filterQuery) {
			// If no filter query, show all characters
			filteredSubjectCharacters = [...subjectCharacters];
			return;
		}

		// Filter characters based on the query
		filteredSubjectCharacters = subjectCharacters.filter((character) => {
			return (
				character.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
				character.nameCn.toLowerCase().includes(filterQuery.toLowerCase())
			);
		});
	}

	function handleCharacterSelect(character: SearchResult) {
		onCharacterSelect(character.id);

		// Reset the subject selection
		selectedSubject = null;
		subjectCharacters = [];
		filteredSubjectCharacters = [];
	}

	function handleClearSelectedSubject() {
		selectedSubject = null;
		subjectCharacters = [];
		filteredSubjectCharacters = [];
		searchQuery = '';
		if (searchInput) {
			searchInput.value = '';
		}
	}

	const debouncedHandleSearch = debounce(handleSearch, 500);

	async function handleSearchQueryUpdate(v: string) {
		searchQuery = v;

		// If we have a selected subject, just filter the results
		if (selectedSubject) {
			// Check if the user has removed the @subject tag
			if (!v.includes(`@${selectedSubject.name}`)) {
				handleClearSelectedSubject();
				if (v.trim()) {
					isSearching = true;
					await debouncedHandleSearch(true);
				}
			} else {
				filterSubjectCharacters();
			}
			return;
		}

		// Normal search
		isSearching = true;
		if (searchQuery.trim()) {
			await debouncedHandleSearch(true);
		}
	}
</script>

<div class="mb-8 flex justify-center">
	<Combobox.Root
		type="single"
		name="character-search"
		open={searchQuery !== ''}
		onOpenChange={(o) => {
			if (!o) {
				searchQuery = '';
				if (searchInput) {
					searchInput.value = '';
				}
				if (selectedSubject) {
					handleClearSelectedSubject();
				}
			}
		}}
	>
		<div class="relative">
			<img
				src="https://bangumi.tv/img/favicon.ico"
				alt="Bangumi"
				class="absolute start-3 top-1/2 size-6 -translate-y-1/2"
			/>
			<Combobox.Input
				bind:ref={searchInput}
				oninput={(e) => handleSearchQueryUpdate(e.currentTarget.value)}
				class="h-input rounded-9px border-border-input bg-background placeholder:text-foreground-alt/50 focus:ring-foreground focus:ring-offset-background inline-flex w-[384px] truncate border px-11 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
				placeholder={selectedSubject
					? `搜索 @${selectedSubject.name} 中的角色...`
					: '搜索角色和作品...'}
				aria-label="搜索角色和作品"
			/>
			{#if selectedSubject}
				<button
					class="text-muted-foreground hover:text-foreground absolute end-12 top-1/2 -translate-y-1/2 text-sm"
					onclick={handleClearSelectedSubject}
				>
					清除
				</button>
			{/if}
			<Combobox.Trigger class="absolute end-3 top-1/2 size-6 -translate-y-1/2">
				<CaretUpDown class="text-muted-foreground size-6 cursor-pointer" />
			</Combobox.Trigger>
		</div>
		<Combobox.Portal>
			<Combobox.Content
				class="border-muted bg-background shadow-popover max-h-96 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] border py-0 outline-none"
				sideOffset={10}
			>
				<Combobox.ScrollUpButton
					class="flex w-full items-center justify-center border-b border-gray-100 py-1"
				>
					<CaretDoubleUp class="size-3" />
				</Combobox.ScrollUpButton>
				<Combobox.Viewport class="divide-y divide-gray-100">
					{#if selectedSubject}
						<!-- Show characters from selected subject -->
						<div class="text-muted-foreground bg-gray-50 px-4 py-2 text-sm font-semibold">
							@{selectedSubject.name} 中的角色
						</div>
						{#each filteredSubjectCharacters as character}
							<button
								class="data-[highlighted]:bg-muted hover:bg-muted flex w-full cursor-pointer select-none items-center gap-3 px-4 py-3 text-sm outline-none"
								onclick={(e) => {
									e.preventDefault();
									searchQuery = '';
									if (searchInput) {
										searchInput.value = '';
									}
									handleCharacterSelect(character);
								}}
							>
								{#if character.icon}
									<img src={character.icon} alt={character.name} class="h-12 w-12 object-cover" />
								{:else}
									<div
										class="flex h-12 w-12 items-center justify-center bg-gray-100 text-xs text-gray-500"
									>
										无图片
									</div>
								{/if}
								<div class="flex flex-col text-left">
									<div class="text-base font-medium">
										{character.name}
									</div>
									<div class="text-sm text-gray-500">{character.nameCn}</div>
								</div>
							</button>
						{:else}
							<div class="px-4 py-3 text-sm text-muted-foreground">
								{#if isSearching}
									搜索中...
								{:else}
									未找到结果
								{/if}
							</div>
						{/each}
					{:else}
						<!-- Show characters group -->
						{#if characterResults.length > 0 || isSearching}
							<div class="text-muted-foreground bg-gray-50 px-4 py-2 text-sm font-semibold">
								角色
							</div>
						{/if}
						{#each characterResults as character}
							<button
								class="data-[highlighted]:bg-muted hover:bg-muted flex w-full cursor-pointer select-none items-center gap-3 px-4 py-3 text-sm outline-none"
								onclick={(e) => {
									e.preventDefault();
									searchQuery = '';
									if (searchInput) {
										searchInput.value = '';
									}
									handleCharacterSelect(character);
								}}
							>
								{#if character.icon}
									<img src={character.icon} alt={character.name} class="h-12 w-12 object-cover" />
								{:else}
									<div
										class="flex h-12 w-12 items-center justify-center bg-gray-100 text-xs text-gray-500"
									>
										无图片
									</div>
								{/if}
								<div class="flex flex-col text-left">
									<div class="text-base font-medium">
										{character.name}
									</div>
									<div class="text-sm text-gray-500">{character.nameCn}</div>
								</div>
							</button>
						{:else}
							{#if !subjectResults.length}
								{#if isSearching}
									<div class="px-4 py-3 text-sm text-muted-foreground">搜索中...</div>
								{:else if searchQuery}
									<div class="px-4 py-3 text-sm text-muted-foreground">未找到结果</div>
								{/if}
							{/if}
						{/each}

						{#if hasMore && characterResults.length > 0}
							{#if !isSearching && !isLoadingMore}
								<button
									class="data-[highlighted]:bg-muted hover:bg-muted flex h-10 w-full cursor-pointer select-none items-center justify-center px-4 py-3 text-sm font-bold outline-none"
									onclick={() => handleSearch(false)}
								>
									更多角色
								</button>
							{:else if isLoadingMore}
								<div class="text-muted-foreground px-4 py-3 text-sm">加载中...</div>
							{/if}
						{/if}

						<!-- Show subjects group if we have results -->
						{#if subjectResults.length > 0}
							<div class="text-muted-foreground bg-gray-50 px-4 py-2 text-sm font-semibold">
								作品
							</div>
							{#each subjectResults as subject}
								<button
									class="data-[highlighted]:bg-muted hover:bg-muted flex w-full cursor-pointer select-none items-center gap-3 px-4 py-3 text-sm outline-none"
									onclick={(e) => {
										e.preventDefault();
										handleSubjectSelect(subject);
									}}
								>
									{#if subject.image}
										<img src={subject.image} alt={subject.name} class="h-12 w-12 object-cover" />
									{:else}
										<div
											class="flex h-12 w-12 items-center justify-center bg-gray-100 text-xs text-gray-500"
										>
											无图片
										</div>
									{/if}
									<div class="flex flex-col text-left">
										<div class="text-base font-medium">{subject.name}</div>
										<div class="text-sm text-gray-500">{subject.name_cn}</div>
									</div>
								</button>
							{/each}
						{/if}
					{/if}
				</Combobox.Viewport>
				<Combobox.ScrollDownButton
					class="flex w-full items-center justify-center border-t border-gray-100 py-1"
				>
					<CaretDoubleDown class="size-3" />
				</Combobox.ScrollDownButton>
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>
