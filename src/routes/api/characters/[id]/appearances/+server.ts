import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { Appearance, CharacterAppearances, GameSettings } from '$lib/types';
import camelcaseKeys from 'camelcase-keys';
import { getCache, setCache, CACHE_TIMES } from '$lib/server/redis';
import { getCharacterMoegirlTags } from '$lib/server/db';

// Types
type SubjectResponse = {
	staff: string;
	name: string;
	nameCn: string;
	image: string;
	type: number;
	id: number;
};

type PersonResponse = {
	name: string;
	subjectType: number;
	// Add other fields as needed
};

type SubjectDetails = {
	name: string;
	year: number | null;
	rating: number;
	ratingCount: number;
	tags: string[];
	metaTags: string[];
};

// Constants
const API_BASE_URL = 'https://api.bgm.tv/v0';
const API_HEADERS = {
	Accept: 'application/json',
	'User-Agent': 'AnimeCharacterGuessr/1.0'
};
const FILTERED_CHARACTER_IDS = [56822, 56823, 17529, 10956];

// Main handler
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const characterId = parseInt(params.id || '0');
		const settings: GameSettings = await request.json();

		if (isNaN(characterId) || characterId <= 0) {
			return json({ error: 'Invalid character ID' }, { status: 400 });
		}

		// Create a cache key that includes essential settings
		// This ensures different settings get different cache entries
		const settingsHash = JSON.stringify({
			startYear: settings.startYear,
			endYear: settings.endYear,
			metaTags: settings.metaTags,
			includeGame: settings.includeGame
		});
		const cacheKey = `appearances:${characterId}:${Buffer.from(settingsHash).toString('base64')}`;

		// Check cache first
		const cachedAppearances = await getCache<CharacterAppearances>(cacheKey);
		if (cachedAppearances) {
			console.log(`Cache hit for appearances of character ${characterId}`);
			return json(cachedAppearances);
		}

		// Cache miss, fetch from API
		console.log(`Cache miss for appearances of character ${characterId}, fetching from API`);

		// Fetch character data
		const [subjectsResponse, personsResponse] = await fetchCharacterData(characterId);

		// Process the character appearances
		if (!subjectsResponse || !subjectsResponse.length) {
			const emptyResponse = createEmptyResponse();
			await setCache(cacheKey, emptyResponse, CACHE_TIMES.CHARACTER_APPEARANCES);
			return json(emptyResponse);
		}

		const filteredAppearances = filterAppearancesBySettings(subjectsResponse, settings);

		if (filteredAppearances.length === 0) {
			const emptyResponse = createEmptyResponse();
			await setCache(cacheKey, emptyResponse, CACHE_TIMES.CHARACTER_APPEARANCES);
			return json(emptyResponse);
		}

		// Process appearances and collect metadata
		const result = await processAppearances(
			filteredAppearances,
			settings,
			characterId,
			personsResponse
		);

		// Cache the result
		await setCache(cacheKey, result, CACHE_TIMES.CHARACTER_APPEARANCES);

		return json(result);
	} catch (error) {
		console.error('Character appearances error:', error);
		return json({ error: 'Failed to get character appearances' }, { status: 500 });
	}
};

// Helper functions
async function fetchCharacterData(
	characterId: number
): Promise<[SubjectResponse[], PersonResponse[]]> {
	// Cache keys for subjects and persons
	const subjectsCacheKey = `character:${characterId}:subjects`;
	const personsCacheKey = `character:${characterId}:persons`;

	// Try to get subjects from cache
	const cachedSubjects = await getCache<SubjectResponse[]>(subjectsCacheKey);
	const cachedPersons = await getCache<PersonResponse[]>(personsCacheKey);

	if (cachedSubjects && cachedPersons) {
		return [cachedSubjects, cachedPersons];
	}

	// Fetch from API for any missing data
	const [subjectsResponse, personsResponse] = await Promise.all([
		cachedSubjects
			? Promise.resolve(cachedSubjects)
			: axios
					.get(`${API_BASE_URL}/characters/${characterId}/subjects`, {
						headers: API_HEADERS
					})
					.then((response) => {
						const data = camelcaseKeys(response.data);
						setCache(subjectsCacheKey, data, CACHE_TIMES.CHARACTER_APPEARANCES);
						return data;
					}),
		cachedPersons
			? Promise.resolve(cachedPersons)
			: axios
					.get(`${API_BASE_URL}/characters/${characterId}/persons`, {
						headers: API_HEADERS
					})
					.then((response) => {
						const data = camelcaseKeys(response.data);
						setCache(personsCacheKey, data, CACHE_TIMES.CHARACTER_APPEARANCES);
						return data;
					})
	]);

	return [subjectsResponse, personsResponse];
}

function filterAppearancesBySettings(
	appearances: SubjectResponse[],
	settings: GameSettings
): SubjectResponse[] {
	if (settings.includeGame) {
		return appearances.filter(
			(appearance) =>
				(appearance.staff === '主角' || appearance.staff === '配角') &&
				(appearance.type === 2 || appearance.type === 4)
		);
	} else {
		return appearances.filter(
			(appearance) =>
				(appearance.staff === '主角' || appearance.staff === '配角') && appearance.type === 2
		);
	}
}

function createEmptyResponse(): CharacterAppearances {
	return {
		appearances: [],
		latestAppearance: -1,
		earliestAppearance: -1,
		highestRating: -1,
		metaTags: []
	};
}

async function processAppearances(
	filteredAppearances: SubjectResponse[],
	settings: GameSettings,
	characterId: number,
	personsResponse: PersonResponse[]
): Promise<CharacterAppearances> {
	// Process appearances and collect details
	const appearanceDetailsPromises = filteredAppearances.map(async (appearance) => {
		try {
			const details = await getSubjectDetails(appearance.id);

			// Return null for invalid appearances
			if (!details || details.year === null) return null;

			// Filter by meta tags if specified in settings
			if (
				!settings.metaTags
					.filter((tag) => tag !== '')
					.every((tag) => details.metaTags.includes(tag))
			) {
				return null;
			}

			return {
				appearance: {
					id: appearance.id,
					name: details.name,
					year: details.year,
					rating: details.rating
				},
				details
			};
		} catch (error) {
			console.error(`Failed to get details for subject ${appearance.id}:`, error);
			return null;
		}
	});

	const appearanceResults = await Promise.all(appearanceDetailsPromises);
	const validResults = appearanceResults.filter(
		(result): result is NonNullable<typeof result> => result !== null
	);

	// Extract just the appearance objects for the final result
	const validAppearances = validResults
		.map((result) => result.appearance)
		.sort((a, b) => b.rating - a.rating);

	// Calculate statistics from valid results
	const years = validResults.map((result) => result.details.year!);
	const latestAppearance = years.length > 0 ? Math.max(...years) : -1;
	const earliestAppearance = years.length > 0 ? Math.min(...years) : -1;

	const ratings = validResults.map((result) => result.details.rating);
	const highestRating = ratings.length > 0 ? Math.max(...ratings) : -1;

	// Find the appearance with highest rating count and get its tags
	const highestRatingCountResult = validResults.reduce(
		(highest, current) =>
			current.details.ratingCount > highest.details.ratingCount ? current : highest,
		validResults[0] || { details: { ratingCount: -1, tags: [] } }
	);

	// Collect all meta tags
	let allMetaTags = new Set<string>();

	// Add meta tags from all valid appearances
	validResults.forEach((result) => {
		result.details.metaTags.forEach((tag) => allMetaTags.add(tag));
	});

	// Add tags from the highest rating count appearance
	if (highestRatingCountResult && highestRatingCountResult.details.tags) {
		highestRatingCountResult.details.tags.forEach((tag) => allMetaTags.add(tag));
	}

	// Add voice actor tags if applicable
	if (!FILTERED_CHARACTER_IDS.includes(characterId)) {
		allMetaTags = addVoiceActorTags(personsResponse, allMetaTags);
	}

	const moegirlTags = await getCharacterMoegirlTags(characterId);
	console.log(`Moegirl tags for character ${characterId}:`, moegirlTags);
	moegirlTags.forEach((tag) => allMetaTags.add(tag));

	return {
		appearances: validAppearances,
		latestAppearance,
		earliestAppearance,
		highestRating,
		metaTags: Array.from(allMetaTags)
	};
}

function addVoiceActorTags(
	personsResponse: PersonResponse[],
	existingTags: Set<string>
): Set<string> {
	const newTags = new Set(existingTags);

	const animeVAs = personsResponse.filter(
		(person) => person.subjectType === 2 || person.subjectType === 4
	);

	animeVAs.forEach((person) => {
		newTags.add(person.name);
	});

	return newTags;
}

// Helper function to get subject details
async function getSubjectDetails(subjectId: number): Promise<SubjectDetails | null> {
	try {
		// Try to get from cache first
		const cacheKey = `subject:${subjectId}:details`;
		const cachedDetails = await getCache<SubjectDetails>(cacheKey);

		if (cachedDetails) {
			return cachedDetails;
		}

		// Cache miss, fetch from API
		const response = await axios.get(`${API_BASE_URL}/subjects/${subjectId}`, {
			headers: API_HEADERS
		});

		const data = camelcaseKeys(response.data);
		const tags = new Set<string>();

		if (data.type === 2) {
			data.tags
				.slice(0, 10)
				.filter((tag: any) => !tag.name.includes('20'))
				.forEach((tag: any) => tags.add(tag.name));
		}
		if (data.type === 4) {
			data.tags
				.slice(0, 5)
				.filter((tag: any) => !tag.name.includes('20'))
				.forEach((tag: any) => tags.add(tag.name));
		}

		const details: SubjectDetails = {
			name: data.name,
			year: data.date ? parseInt(data.date.split('-')[0]) : null,
			rating: data.rating?.score || 0,
			ratingCount: data.rating?.total || 0,
			tags: Array.from(tags),
			metaTags: data.metaTags || []
		};

		// Cache the details
		await setCache(cacheKey, details, CACHE_TIMES.SUBJECT_DETAILS);

		return details;
	} catch (error) {
		console.error(`Error fetching subject details for ${subjectId}:`, error);
		return null;
	}
}
