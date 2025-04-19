import { writable, derived } from 'svelte/store';
import type { GameSettings, Character, GuessData, Hints, CharacterWithAppearances } from './types';

// Default game settings
export const defaultGameSettings: GameSettings = {
	startYear: new Date().getFullYear() - 10,
	endYear: new Date().getFullYear(),
	topNSubjects: 50,
	metaTags: ['', '', ''],
	useIndex: false,
	indexId: null,
	addedSubjects: [],
	mainCharacterOnly: true,
	characterNum: 6,
	maxAttempts: 10,
	enableHints: true,
	includeGame: false,
	timeLimit: null,
	subjectSearch: true,
	totalRounds: 5,
	streamerMode: false
};

// Game settings store
export const gameSettings = writable<GameSettings>(defaultGameSettings);

// Current game state
export const answerCharacter = writable<CharacterWithAppearances | null>(null);
export const guesses = writable<GuessData[]>([]);
export const guessesLeft = writable<number>(10);
export const gameEnd = writable<boolean>(false);
export const isGuessing = writable<boolean>(false);
export const hints = writable<Hints>({ first: null, second: null });
export const currentTimeLimit = writable<number | null>(null);
export const shouldResetTimer = writable<boolean>(false);
export const currentSubjectSearch = writable<boolean>(true);

// Derived store for the game result
export const gameResult = derived(
	[gameEnd, guesses, answerCharacter],
	([$gameEnd, $guesses, $answerCharacter]) => {
		if (!$gameEnd || !$answerCharacter) return null;

		// Check if the last guess was correct
		const lastGuess = $guesses[$guesses.length - 1];
		if (lastGuess && lastGuess.isAnswer) {
			return 'win';
		}

		return 'lose';
	}
);

// Game management functions
export function resetGame(): void {
	guesses.set([]);
	gameEnd.set(false);
	isGuessing.set(false);
	answerCharacter.set(null);
	shouldResetTimer.set(false);
	hints.set({ first: null, second: null });
}

// Function to initialize guesses left based on settings
export function initGuessesLeft(maxAttempts: number): void {
	guessesLeft.set(maxAttempts);
}
