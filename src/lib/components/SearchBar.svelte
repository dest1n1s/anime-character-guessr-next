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

	let searchResults = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let isLoadingMore = $state(false);
	let offset = $state(0);
	let hasMore = $state(true);
	let selectedSubject = $state<Subject | null>(null);
	let searchInput = $state<HTMLInputElement | null>(null);

	const INITIAL_LIMIT = 10;
	const MORE_LIMIT = 5;

	async function handleSearch(reset = false) {
		if (!searchQuery.trim()) return;

		const currentLimit = reset ? INITIAL_LIMIT : MORE_LIMIT;
		const currentOffset = reset ? 0 : offset;

		if (reset) {
			isSearching = true;
		} else {
			isLoadingMore = true;
		}

		try {
			const results = await searchCharacters(searchQuery.trim(), currentLimit, currentOffset);

			if (reset) {
				searchResults = results;
				offset = INITIAL_LIMIT;
			} else {
				searchResults = [...searchResults, ...results];
				offset = currentOffset + MORE_LIMIT;
			}

			hasMore = results.length === currentLimit;
		} catch (error) {
			console.error('Search failed:', error);
			if (reset) {
				searchResults = [];
			}
		} finally {
			isSearching = false;
			isLoadingMore = false;
		}
	}

	// async function handleSubjectSearch() {
	// 	if (!searchQuery.trim()) return;

	// 	isSearching = true;

	// 	try {
	// 		const results = await searchSubjects(searchQuery.trim());
	// 		searchResults = results;
	// 		hasMore = false;
	// 	} catch (error) {
	// 		console.error('Subject search failed:', error);
	// 		searchResults = [];
	// 	} finally {
	// 		isSearching = false;
	// 	}
	// }

	async function handleSubjectSelect(subject: Subject) {
		isSearching = true;
		selectedSubject = subject;

		try {
			const characters = await getCharactersBySubjectId(subject.id);
			searchResults = characters;
		} catch (error) {
			console.error('Failed to fetch characters:', error);
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	function handleCharacterSelect(character: SearchResult) {
		onCharacterSelect(character);
	}

	const debouncedHandleSearch = debounce(handleSearch, 500);

	async function handleSearchQueryUpdate(v: string) {
		searchQuery = v;
		console.log(searchQuery);
		if (searchQuery.trim()) {
			await debouncedHandleSearch(true);
		}
	}
</script>

<div class="mb-8 flex justify-center">
	<Combobox.Root
		type="single"
		name="favoriteFruit"
		open={searchQuery !== ''}
		onOpenChange={(o) => {
			if (!o) {
				searchQuery = '';
				if (searchInput) {
					searchInput.value = '';
				}
			}
		}}
	>
		<div class="relative">
			<OrangeSlice class="text-muted-foreground absolute start-3 top-1/2 size-6 -translate-y-1/2" />
			<Combobox.Input
				bind:ref={searchInput}
				oninput={(e) => handleSearchQueryUpdate(e.currentTarget.value)}
				class="h-input rounded-9px border-border-input bg-background placeholder:text-foreground-alt/50 focus:ring-foreground focus:ring-offset-background inline-flex w-[296px] truncate border px-11 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
				placeholder="搜索角色..."
				aria-label="搜索角色"
			/>
			<Combobox.Trigger class="absolute end-3 top-1/2 size-6 -translate-y-1/2">
				<CaretUpDown class="text-muted-foreground size-6 cursor-pointer" />
			</Combobox.Trigger>
		</div>
		<Combobox.Portal>
			<Combobox.Content
				class="border-muted bg-background shadow-popover max-h-96 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] rounded-xl border py-1 outline-none"
				sideOffset={10}
			>
				<Combobox.ScrollUpButton class="flex w-full items-center justify-center">
					<CaretDoubleUp class="size-3" />
				</Combobox.ScrollUpButton>
				<Combobox.Viewport class="space-y-1 p-1">
					{#each searchResults as result}
						<button
							class="rounded-button data-[highlighted]:bg-muted hover:bg-muted flex h-10 w-full cursor-pointer select-none items-center gap-2 px-1 py-2 text-sm capitalize outline-none"
							onclick={(e) => {
								e.preventDefault();
								searchQuery = '';
								searchResults = [];
								offset = 0;
								hasMore = true;
								selectedSubject = null;
								if (searchInput) {
									searchInput.value = '';
								}
								handleCharacterSelect(result);
							}}
						>
							{#if result.icon}
								<img src={result.icon} alt={result.name} class="h-8 w-8 rounded-sm object-cover" />
							{:else}
								<div
									class="flex h-10 w-10 items-center justify-center rounded-sm bg-gray-100 text-xs text-gray-500"
								>
									无图片
								</div>
							{/if}
							<div class="font-medium">{result.name}</div>
						</button>
					{:else}
						{#if isSearching}
							<span class="block px-5 py-2 text-sm text-muted-foreground"> 搜索中... </span>
						{:else}
							<span class="block px-5 py-2 text-sm text-muted-foreground"> 未找到结果 </span>
						{/if}
					{/each}
					{#if hasMore}
						{#if !isSearching && !isLoadingMore}
							<button
								class="data-[highlighted]:bg-muted flex h-10 w-full cursor-pointer select-none items-center justify-center p-2 text-sm font-bold capitalize outline-none"
								onclick={() => handleSearch(false)}
							>
								更多
							</button>
						{:else if isLoadingMore}
							<span class="text-muted-foreground block px-5 py-2 text-sm"> 加载中... </span>
						{/if}
					{/if}
				</Combobox.Viewport>
				<Combobox.ScrollDownButton class="flex w-full items-center justify-center">
					<CaretDoubleDown class="size-3" />
				</Combobox.ScrollDownButton>
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>
