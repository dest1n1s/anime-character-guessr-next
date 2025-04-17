import type {
	Character,
	CharacterAppearances,
	Subject,
	GameSettings,
	Feedback,
	SearchResult,
	CharacterWithAppearances
} from './types';
/**
 * Search for characters by keyword
 */
export async function searchCharacters(
	keyword: string,
	limit: number = 10,
	offset: number = 0,
	fetch = globalThis.fetch
): Promise<SearchResult[]> {
	const response = await fetch('/api/search/characters', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			keyword,
			limit,
			offset
		})
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Failed to search characters');
	}

	return data.results;
}

/**
 * Search for subjects (anime/manga) by keyword
 */
export async function searchSubjects(
	keyword: string,
	fetch = globalThis.fetch
): Promise<Subject[]> {
	const response = await fetch('/api/search/subjects', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ keyword })
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Failed to search subjects');
	}

	return data.results;
}

/**
 * Get characters from a specific subject
 */
export async function getCharactersBySubjectId(
	subjectId: number,
	fetch = globalThis.fetch
): Promise<SearchResult[]> {
	const response = await fetch(`/api/subjects/${subjectId}/characters`);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Failed to get characters');
	}

	return data.characters;
}

/**
 * Get a random character based on game settings
 */
export async function getRandomCharacter(
	settings: GameSettings,
	fetch = globalThis.fetch
): Promise<Character> {
	const response = await fetch('/api/characters/random', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(settings)
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Failed to get random character');
	}

	return data.character;
}

/**
 * Get character appearances based on game settings
 */
export async function getCharacterAppearances(
	characterId: number,
	settings: GameSettings,
	fetch = globalThis.fetch
): Promise<CharacterAppearances> {
	const response = await fetch(`/api/characters/${characterId}/appearances`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(settings)
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Failed to get character appearances');
	}

	return data;
}

/**
 * Get character details
 */
export async function getCharacterDetails(
	characterId: number,
	fetch = globalThis.fetch
): Promise<Character> {
	const response = await fetch(`/api/characters/${characterId}`);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Failed to get character details');
	}

	return data;
}

/**
 * Generate feedback for a guess
 */
export function generateFeedback(
	guess: CharacterWithAppearances,
	answer: CharacterWithAppearances
): Feedback {
	// Get a formatted response from the server
	return {
		gender: {
			feedback: guess.gender === answer.gender ? 'yes' : 'no'
		},
		popularityFeedback: getPopularityFeedback(guess.popularity, answer.popularity),
		appearancesCountFeedback: getAppearancesCountFeedback(guess.appearances.length, answer),
		latestAppearanceFeedback: getYearFeedback(guess.latestAppearance, 'latest', answer),
		earliestAppearanceFeedback: getYearFeedback(guess.earliestAppearance, 'earliest', answer),
		ratingFeedback: getRatingFeedback(guess.highestRating, answer),
		sharedAppearances: getSharedAppearances(guess, answer),
		sharedMetaTags: getSharedMetaTags(guess, answer)
	};
}

// Helper functions for feedback generation
function getPopularityFeedback(guessPopularity?: number, answerPopularity?: number): string {
	if (!guessPopularity || !answerPopularity) return '?';
	const diff = Math.abs(guessPopularity - answerPopularity);
	const percentage = diff / answerPopularity;

	if (guessPopularity === answerPopularity) return '=';
	if (percentage <= 0.1) return guessPopularity > answerPopularity ? '+' : '-';
	return guessPopularity > answerPopularity ? '++' : '--';
}

function getAppearancesCountFeedback(guessCount: number, answer: CharacterWithAppearances): string {
	// If we can't determine the answer's appearance count, return unknown
	if (!answer.appearances) {
		return '?';
	}

	const answerCount = answer.appearances.length;

	// Exact match
	if (guessCount === answerCount) {
		return '=';
	}

	// Calculate the difference percentage
	const diff = Math.abs(guessCount - answerCount);
	const percentage = answerCount > 0 ? diff / answerCount : 1;

	// Within 20% difference
	if (percentage <= 0.2) {
		return guessCount > answerCount ? '+' : '-';
	}

	// Greater difference
	return guessCount > answerCount ? '++' : '--';
}

function getYearFeedback(
	guessYear: number,
	type: 'latest' | 'earliest',
	answer: CharacterWithAppearances
): string {
	// If we can't determine the answer's year, return unknown
	if (!answer[`${type}Appearance`]) {
		return '?';
	}

	const answerYear = answer[`${type}Appearance`];

	// Exact match
	if (guessYear === answerYear) {
		return '=';
	}

	// Calculate the difference
	const diff = Math.abs(guessYear - answerYear);

	// Within 3 years
	if (diff <= 3) {
		return guessYear > answerYear ? '+' : '-';
	}

	// Greater difference
	return guessYear > answerYear ? '++' : '--';
}

function getRatingFeedback(guessRating: number, answer: CharacterWithAppearances): string {
	// If we can't determine the answer's rating, return unknown
	if (!answer.highestRating) {
		return '?';
	}

	const answerRating = answer.highestRating;

	// If either rating is invalid (-1), return unknown
	if (guessRating === -1 || answerRating === -1) {
		return '?';
	}

	// Exact match
	if (Math.abs(guessRating - answerRating) < 0.1) {
		return '=';
	}

	// Calculate the difference
	const diff = Math.abs(guessRating - answerRating);

	// Within 0.5 points
	if (diff <= 0.5) {
		return guessRating > answerRating ? '+' : '-';
	}

	// Greater difference
	return guessRating > answerRating ? '++' : '--';
}

function getSharedAppearances(
	guess: CharacterWithAppearances,
	answer: CharacterWithAppearances
): { first: string; count: number } {
	// If we don't have the answer character's appearances data
	if (!answer.appearances) {
		return { first: '', count: 0 };
	}

	// Get the appearance IDs for both characters
	const guessAppearanceIds = guess.appearances.map((a) => a.id);
	const answerAppearanceIds = answer.appearances.map((a) => a.id);

	// Find shared appearance IDs
	const sharedIds = guessAppearanceIds.filter((id) => answerAppearanceIds.includes(id));

	// If no shared appearances, return empty result
	if (sharedIds.length === 0) {
		return { first: '', count: 0 };
	}

	// Find the first shared appearance name
	const firstSharedId = sharedIds[0];
	const firstSharedAppearance = guess.appearances.find((a) => a.id === firstSharedId);

	return {
		first: firstSharedAppearance?.name || '',
		count: sharedIds.length
	};
}

function getSharedMetaTags(
	guess: CharacterWithAppearances,
	answer: CharacterWithAppearances
): string[] {
	if (!guess.metaTags || !answer.metaTags) {
		return [];
	}

	// Convert tags to lowercase for case-insensitive comparison
	const lowerGuessTags = guess.metaTags.map((tag) => tag.toLowerCase());
	const lowerAnswerTags = answer.metaTags.map((tag) => tag.toLowerCase());

	// Find shared tags
	const shared = lowerGuessTags.filter((tag) => lowerAnswerTags.includes(tag));

	// If there are many shared tags, we want to return the original tag strings
	// with proper capitalization, not the lowercase versions
	return shared.map((sharedTag) => {
		const index = lowerGuessTags.indexOf(sharedTag);
		return guess.metaTags[index];
	});
}

/**
 * Submit character tags for a character
 */
export async function submitCharacterTags(
	characterId: number,
	tags: string[],
	fetch = globalThis.fetch
): Promise<void> {
	const response = await fetch('/api/character-tags', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			characterId,
			tags
		})
	});

	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.message || 'Failed to submit character tags');
	}
}

/**
 * Submit tags (alias for submitCharacterTags)
 */
export async function submitTags(
	characterId: number,
	tags: string[],
	fetch = globalThis.fetch
): Promise<void> {
	return submitCharacterTags(characterId, tags, fetch);
}

/**
 * Propose custom tags for a character
 */
export async function proposeCustomTags(
	characterId: number,
	tags: string[],
	fetch = globalThis.fetch
): Promise<void> {
	const response = await fetch('/api/propose-tags', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			characterId,
			tags
		})
	});

	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.message || 'Failed to propose custom tags');
	}
}
