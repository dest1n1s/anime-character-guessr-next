import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { Character, GameSettings, Subject } from '$lib/types';
import { getCache, setCache, CACHE_TIMES } from '$lib/server/redis';

export const POST: RequestHandler = async ({ request }) => {
	const settings: GameSettings = await request.json();

	// Validate settings
	if (!settings) {
		return json({ error: 'Invalid settings' }, { status: 400 });
	}

	let subject;
	let total;
	let randomOffset;

	if (settings.useIndex && settings.indexId) {
		// Get index info first
		try {
			// Try to get index info from cache
			const indexCacheKey = `index:${settings.indexId}:info`;
			let indexData = await getCache<any>(indexCacheKey);

			if (!indexData) {
				// Cache miss, fetch from API
				console.log(`Cache miss for index info: ${settings.indexId}, fetching from API`);
				const indexResponse = await axios.get(`https://api.bgm.tv/v0/indices/${settings.indexId}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'AnimeCharacterGuessr/1.0'
					}
				});
				indexData = indexResponse.data;

				// Cache the index info
				await setCache(indexCacheKey, indexData, CACHE_TIMES.SUBJECT_DETAILS);
			} else {
				console.log(`Cache hit for index info: ${settings.indexId}`);
			}

			// Get total from index info
			total = indexData.total + settings.addedSubjects.length;

			// Get a random offset within the total number of subjects
			randomOffset = Math.floor(Math.random() * total);

			if (randomOffset >= indexData.total) {
				// Select from added subjects
				randomOffset = randomOffset - indexData.total;
				subject = settings.addedSubjects[randomOffset];
			} else {
				// Cache key for index subjects at this offset
				const subjectsCacheKey = `index:${settings.indexId}:subjects:offset:${randomOffset}:limit:1`;
				let subjectsData = await getCache<any>(subjectsCacheKey);

				if (!subjectsData) {
					// Cache miss, fetch from API
					console.log(`Cache miss for index subjects at offset ${randomOffset}, fetching from API`);
					const subjectResponse = await axios.get(
						`https://api.bgm.tv/v0/indices/${settings.indexId}/subjects?limit=1&offset=${randomOffset}`,
						{
							headers: {
								Accept: 'application/json',
								'User-Agent': 'AnimeCharacterGuessr/1.0'
							}
						}
					);
					subjectsData = subjectResponse.data;

					// Cache the subjects data
					await setCache(subjectsCacheKey, subjectsData, CACHE_TIMES.SUBJECT_DETAILS);
				} else {
					console.log(`Cache hit for index subjects at offset ${randomOffset}`);
				}

				if (!subjectsData || !subjectsData.data || subjectsData.data.length === 0) {
					throw new Error('No subjects found in index');
				}

				subject = subjectsData.data[0];
			}
		} catch (error) {
			console.error('Failed to fetch index:', error);
			// Fall back to non-index mode
			settings.useIndex = false;
		}
	}

	if (!settings.useIndex || !subject) {
		// Not using index or failed to get subject from index
		total = settings.topNSubjects + settings.addedSubjects.length;
		randomOffset = Math.floor(Math.random() * total);

		const endDate = new Date(`${settings.endYear + 1}-01-01`);
		const today = new Date();
		const minDate = new Date(Math.min(endDate.getTime(), today.getTime()))
			.toISOString()
			.split('T')[0];

		if (randomOffset >= settings.topNSubjects) {
			// Select from added subjects
			randomOffset = randomOffset - settings.topNSubjects;
			subject = settings.addedSubjects[randomOffset];
		} else {
			// Create a unique cache key for this search query
			// Note: We include randomOffset in the cache key to ensure random selection
			// even when using cached results
			const searchParams = {
				sort: 'heat',
				filter: {
					type: [2], // Anime type
					air_date: [`>=${settings.startYear}-01-01`, `<${minDate}`],
					meta_tags: settings.metaTags.filter((tag) => tag !== '')
				}
			};

			// Create a deterministic cache key from the search parameters
			const searchCacheKey = `search:subjects:${JSON.stringify(searchParams)}:offset:${randomOffset}:limit:1`;
			let searchData = await getCache<any>(searchCacheKey);

			if (!searchData) {
				// Cache miss, fetch from API
				console.log(`Cache miss for subject search at offset ${randomOffset}, fetching from API`);
				const response = await axios.post(
					`https://api.bgm.tv/v0/search/subjects?limit=1&offset=${randomOffset}`,
					searchParams,
					{
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'User-Agent': 'AnimeCharacterGuessr/1.0'
						}
					}
				);
				searchData = response.data;

				// Cache the search results
				await setCache(searchCacheKey, searchData, CACHE_TIMES.SEARCH_RESULTS);
			} else {
				console.log(`Cache hit for subject search at offset ${randomOffset}`);
			}

			if (!searchData || !searchData.data || searchData.data.length === 0) {
				return json({ error: 'Failed to fetch subject at random offset' }, { status: 400 });
			}

			subject = searchData.data[0];
		}
	}

	// Get characters for the selected subject from cache or API
	const charactersCacheKey = `subject:${subject.id}:characters:raw`;
	let charactersData = await getCache<any>(charactersCacheKey);

	if (!charactersData) {
		// Cache miss, fetch from API
		console.log(`Cache miss for subject characters (raw): ${subject.id}, fetching from API`);
		const charactersResponse = await axios.get(
			`https://api.bgm.tv/v0/subjects/${subject.id}/characters`,
			{
				headers: {
					Accept: 'application/json',
					'User-Agent': 'AnimeCharacterGuessr/1.0'
				}
			}
		);
		charactersData = charactersResponse.data;

		// Cache the characters data
		await setCache(charactersCacheKey, charactersData, CACHE_TIMES.SUBJECT_CHARACTERS);
	} else {
		console.log(`Cache hit for subject characters (raw): ${subject.id}`);
	}

	// Filter and select characters based on mainCharacterOnly setting
	let filteredCharacters;
	if (settings.mainCharacterOnly) {
		filteredCharacters = charactersData.filter((c: any) => c.relation === '主角');
	} else {
		// Get both main and supporting characters but limit to characterNum
		filteredCharacters = charactersData
			.filter((c: any) => c.relation === '主角' || c.relation === '配角')
			.slice(0, settings.characterNum);
	}

	if (filteredCharacters.length === 0) {
		return json({ error: 'No characters found for this anime' }, { status: 404 });
	}

	// Randomly select one character from the filtered characters
	// This random selection should always be performed at runtime
	const randomCharacterIndex = Math.floor(Math.random() * filteredCharacters.length);
	const selectedCharacter = filteredCharacters[randomCharacterIndex];

	// Get additional character details from cache or API
	const characterCacheKey = `character:${selectedCharacter.id}`;
	let characterDetail = await getCache<any>(characterCacheKey);

	if (!characterDetail) {
		// Cache miss, fetch from API
		console.log(`Cache miss for character details: ${selectedCharacter.id}, fetching from API`);
		try {
			const characterDetailResponse = await axios.get(
				`https://api.bgm.tv/v0/characters/${selectedCharacter.id}`,
				{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'AnimeCharacterGuessr/1.0'
					}
				}
			);
			characterDetail = characterDetailResponse.data;

			// Cache the character details
			await setCache(characterCacheKey, characterDetail, CACHE_TIMES.CHARACTER);
		} catch (error) {
			console.warn(`Failed to get detailed info for character ${selectedCharacter.id}:`, error);
			// Continue with the basic character data we already have
			characterDetail = selectedCharacter;
		}
	} else {
		console.log(`Cache hit for character details: ${selectedCharacter.id}`);
	}

	// Extract tags from the character detail
	const characterTags = characterDetail.tags?.map((tag: any) => tag.name) || [];

	const nameCn =
		characterDetail.infobox?.find((item: any) => item.key === '简体中文名')?.value ||
		characterDetail.name;

	// Format the character data
	const character: Character = {
		id: characterDetail.id,
		name: characterDetail.name,
		nameCn: nameCn,
		icon: characterDetail.images?.grid || null,
		image: characterDetail.images?.medium || null,
		gender: characterDetail.gender || '?',
		popularity: characterDetail.stat?.collects || 0,
		summary: characterDetail.summary || '',
		tags: characterTags
	};

	return json({ character });
};
