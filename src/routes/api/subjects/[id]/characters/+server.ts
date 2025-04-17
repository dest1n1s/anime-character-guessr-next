import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { SearchResult } from '$lib/types';
import { getCache, setCache, CACHE_TIMES } from '$lib/server/redis';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const subjectId = params.id;

		if (!subjectId || isNaN(Number(subjectId))) {
			return json({ error: 'Invalid subject ID' }, { status: 400 });
		}

		// Create cache key for subject characters
		const cacheKey = `subject:${subjectId}:characters`;

		// Check cache first
		const cachedCharacters = await getCache<{ characters: SearchResult[] }>(cacheKey);
		if (cachedCharacters) {
			console.log(`Cache hit for subject characters: ${subjectId}`);
			return json(cachedCharacters);
		}

		// Cache miss, fetch from API
		console.log(`Cache miss for subject characters: ${subjectId}, fetching from API`);

		// Make request to Bangumi API
		const response = await axios.get(`https://api.bgm.tv/v0/subjects/${subjectId}/characters`, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'AnimeCharacterGuessr/1.0'
			}
		});

		// Map the response to our format
		const characters: SearchResult[] = response.data
			.map((character: any) => {
				return {
					id: character.id,
					name: character.name,
					nameCn:
						character.infobox?.find((item: any) => item.key === '简体中文名')?.value ||
						character.name,
					icon: character.images?.grid || null,
					image: character.images?.medium || null
				};
			})
			.filter((character: SearchResult) => character.name && character.id); // Filter out incomplete characters

		const responseData = { characters };

		// Cache the characters
		await setCache(cacheKey, responseData, CACHE_TIMES.SUBJECT_CHARACTERS);

		return json(responseData);
	} catch (error) {
		console.error('Get characters error:', error);
		return json({ error: 'Failed to get characters' }, { status: 500 });
	}
};
