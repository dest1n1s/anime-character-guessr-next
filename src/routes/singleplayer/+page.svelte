<script lang="ts">
	import { onMount } from 'svelte';
	import {
		gameSettings,
		answerCharacter,
		guesses,
		guessesLeft,
		gameEnd,
		isGuessing,
		hints,
		currentTimeLimit,
		shouldResetTimer,
		currentSubjectSearch,
		resetGame,
		initGuessesLeft,
		gameResult
	} from '$lib/store';
	import { getRandomCharacter, getCharacterAppearances, generateFeedback } from '$lib/api';
	import type { Character, SearchResult, GameSettings } from '$lib/types';

	// Components
	import SearchBar from '$lib/components/SearchBar.svelte';
	import GuessesTable from '$lib/components/GuessesTable.svelte';
	import SettingsPopup from '$lib/components/SettingsPopup.svelte';
	import HelpPopup from '$lib/components/HelpPopup.svelte';
	import GameEndPopup from '$lib/components/GameEndPopup.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import GameInfo from '$lib/components/GameInfo.svelte';
	import Timer from '$lib/components/Timer.svelte';
	import { browser } from '$app/environment';

	// Local state
	let showSettingsPopup = $state(false);
	let showHelpPopup = $state(false);
	let showGameEndPopup = $state(false);
	let timeUpFlag = false;

	// Game initialization
	onMount(async () => {
		const storageGameSettings = localStorage.getItem('gameSettings');

		if (storageGameSettings) {
			$gameSettings = JSON.parse(storageGameSettings);
		}

		try {
			await initializeGame();
		} catch (error) {
			console.error('Failed to initialize game:', error);
			alert('游戏初始化失败，请刷新页面重试');
		}
	});

	// Initialize a new game with current settings
	async function initializeGame() {
		resetGame();

		// Reset game state
		$guessesLeft = $gameSettings.maxAttempts;
		$currentTimeLimit = $gameSettings.timeLimit;
		$currentSubjectSearch = $gameSettings.subjectSearch;

		// Get a random character based on settings
		const character = await getRandomCharacter($gameSettings);
		const appearances = await getCharacterAppearances(character.id, $gameSettings);
		$answerCharacter = { ...character, ...appearances };

		// Prepare hints if enabled
		if ($gameSettings.enableHints && character.summary) {
			// Split summary into sentences using Chinese punctuation
			const sentences = character.summary.split(/[。、，。！？ ""]/).filter((s) => s.trim());

			let hintTexts = ['🚫提示未启用', '🚫提示未启用'];

			if (sentences.length > 0) {
				// Randomly select 2 sentences if available
				const selectedIndices = new Set<number>();
				while (selectedIndices.size < Math.min(2, sentences.length)) {
					selectedIndices.add(Math.floor(Math.random() * sentences.length));
				}
				hintTexts = Array.from(selectedIndices).map((i) => '……' + sentences[i].trim() + '……');
			}

			$hints = {
				first: hintTexts[0],
				second: hintTexts[1]
			};
		} else {
			$hints = {
				first: '🚫提示未启用',
				second: '🚫提示未启用'
			};
		}
	}

	// Handle character selection from search
	async function handleCharacterSelect(character: SearchResult) {
		if ($isGuessing || !$answerCharacter) return;

		$isGuessing = true;
		$shouldResetTimer = true;

		try {
			// Special easter eggs
			if (character.id === 56822 || character.id === 56823) {
				alert('有点意思');
			}

			// Get character appearances
			const appearances = await getCharacterAppearances(character.id, $gameSettings);

			const isCorrect = character.id === $answerCharacter.id;
			$guessesLeft = $guessesLeft - 1;

			if (isCorrect) {
				// Correct guess
				$guesses = [
					...$guesses,
					{
						icon: character.icon,
						name: character.name,
						nameCn: character.nameCn,
						gender: character.gender || '',
						genderFeedback: 'yes',
						latestAppearance: appearances.latestAppearance,
						latestAppearanceFeedback: '=',
						earliestAppearance: appearances.earliestAppearance,
						earliestAppearanceFeedback: '=',
						highestRating: appearances.highestRating,
						ratingFeedback: '=',
						appearancesCount: appearances.appearances.length,
						appearancesCountFeedback: '=',
						popularity: character.popularity || -1,
						popularityFeedback: '=',
						sharedAppearances: {
							first: appearances.appearances.length > 0 ? appearances.appearances[0].name : '',
							count: appearances.appearances.length
						},
						metaTags: appearances.metaTags,
						sharedMetaTags: appearances.metaTags,
						isAnswer: true
					}
				];

				$gameEnd = true;
				alert('熟悉这个角色吗？欢迎贡献标签');
				showGameEndPopup = true;
			} else if ($guessesLeft <= 0) {
				// Out of guesses
				const feedback = generateFeedback({ ...character, ...appearances }, $answerCharacter);
				$guesses = [
					...$guesses,
					{
						icon: character.icon,
						name: character.name,
						nameCn: character.nameCn,
						gender: character.gender || '',
						genderFeedback: feedback.gender.feedback,
						latestAppearance: appearances.latestAppearance,
						latestAppearanceFeedback: feedback.latestAppearanceFeedback,
						earliestAppearance: appearances.earliestAppearance,
						earliestAppearanceFeedback: feedback.earliestAppearanceFeedback,
						highestRating: appearances.highestRating,
						ratingFeedback: feedback.ratingFeedback,
						appearancesCount: appearances.appearances.length,
						appearancesCountFeedback: feedback.appearancesCountFeedback,
						popularity: character.popularity || -1,
						popularityFeedback: feedback.popularityFeedback,
						sharedAppearances: feedback.sharedAppearances,
						metaTags: appearances.metaTags,
						sharedMetaTags: feedback.sharedMetaTags,
						isAnswer: false
					}
				];

				$gameEnd = true;
				// alert('认识这个角色吗？欢迎贡献标签');
				showGameEndPopup = true;
			} else {
				// Incorrect guess but still have attempts left
				const feedback = generateFeedback({ ...character, ...appearances }, $answerCharacter);
				$guesses = [
					...$guesses,
					{
						icon: character.icon,
						name: character.name,
						nameCn: character.nameCn,
						gender: character.gender || '',
						genderFeedback: feedback.gender.feedback,
						latestAppearance: appearances.latestAppearance,
						latestAppearanceFeedback: feedback.latestAppearanceFeedback,
						earliestAppearance: appearances.earliestAppearance,
						earliestAppearanceFeedback: feedback.earliestAppearanceFeedback,
						highestRating: appearances.highestRating,
						ratingFeedback: feedback.ratingFeedback,
						appearancesCount: appearances.appearances.length,
						appearancesCountFeedback: feedback.appearancesCountFeedback,
						popularity: character.popularity || -1,
						popularityFeedback: feedback.popularityFeedback,
						sharedAppearances: feedback.sharedAppearances,
						metaTags: appearances.metaTags,
						sharedMetaTags: feedback.sharedMetaTags,
						isAnswer: false
					}
				];
			}
		} catch (error) {
			console.error('Error processing guess:', error);
			alert('出错了，请重试');
		} finally {
			$isGuessing = false;
			$shouldResetTimer = false;
		}
	}

	// Handle time up event
	function handleTimeUp() {
		if (timeUpFlag) return; // prevent multiple triggers
		timeUpFlag = true;

		$guessesLeft = $guessesLeft - 1;
		if ($guessesLeft <= 0) {
			$gameEnd = true;
			showGameEndPopup = true;
		}

		$shouldResetTimer = true;
		setTimeout(() => {
			$shouldResetTimer = false;
			timeUpFlag = false;
		}, 100);
	}

	// Handle setting changes
	function handleSettingsChange(setting: string, value: any) {
		$gameSettings = {
			...$gameSettings,
			[setting]: value
		};

		if (browser) {
			localStorage.setItem('gameSettings', JSON.stringify($gameSettings));
		}
	}

	// Handle game restart with new settings
	async function handleRestartWithSettings() {
		showSettingsPopup = false;
		await initializeGame();
	}
</script>

<svelte:head>
	<title>单人游戏 | 动漫角色猜猜乐</title>
</svelte:head>

<div class="relative min-h-screen bg-gray-50 px-4 py-16">
	<div class="mx-auto max-w-7xl">
		<div class="absolute right-4 top-4 z-10">
			<SocialLinks
				onSettingsClick={() => (showSettingsPopup = true)}
				onHelpClick={() => (showHelpPopup = true)}
			/>
		</div>

		<div class="pt-16">
			<SearchBar
				onCharacterSelect={handleCharacterSelect}
				isGuessing={$isGuessing}
				gameEnd={$gameEnd}
				subjectSearch={$currentSubjectSearch}
			/>
		</div>

		{#if $currentTimeLimit}
			<Timer
				timeLimit={$currentTimeLimit}
				onTimeUp={handleTimeUp}
				isActive={!$gameEnd && !$isGuessing}
				reset={$shouldResetTimer}
			/>
		{/if}

		<GameInfo
			gameEnd={$gameEnd}
			guessesLeft={$guessesLeft}
			onRestart={handleRestartWithSettings}
			answerCharacter={$answerCharacter}
			hints={$hints}
		/>

		<div class="mt-4">
			<GuessesTable guesses={$guesses} />
		</div>
	</div>
</div>

{#if showSettingsPopup}
	<SettingsPopup
		gameSettings={$gameSettings}
		onSettingsChange={handleSettingsChange}
		onClose={() => (showSettingsPopup = false)}
		onRestart={handleRestartWithSettings}
	/>
{/if}

{#if showHelpPopup}
	<HelpPopup onClose={() => (showHelpPopup = false)} />
{/if}

{#if showGameEndPopup && $answerCharacter}
	<GameEndPopup
		result={$gameResult || 'lose'}
		answer={$answerCharacter}
		onClose={() => (showGameEndPopup = false)}
	/>
{/if}
