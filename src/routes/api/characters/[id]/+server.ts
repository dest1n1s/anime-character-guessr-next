import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { Character } from '$lib/types';
import { getCache, setCache, CACHE_TIMES } from '$lib/server/redis';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const characterId = parseInt(params.id || '0');

		if (isNaN(characterId) || characterId <= 0) {
			return json({ error: 'Invalid character ID' }, { status: 400 });
		}

		// Check cache first
		const cacheKey = `character:${characterId}`;
		const cachedCharacter = await getCache<Character>(cacheKey);

		if (cachedCharacter) {
			console.log(`Cache hit for character ${characterId}`);
			return json(cachedCharacter);
		}

		// Cache miss, fetch from API
		console.log(`Cache miss for character ${characterId}, fetching from API`);

		// Make request to Bangumi API
		const response = await axios.get(`https://api.bgm.tv/v0/characters/${characterId}`, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'AnimeCharacterGuessr/1.0'
			}
		});

		const characterData = response.data;

		// Extract tags from the response
		const characterTags = characterData.tags?.map((tag: any) => tag.name) || [];

		const nameCn =
			characterData.infobox?.find((item: any) => item.key === '简体中文名')?.value ||
			characterData.name;

		// Map the data to our Character type
		const character: Character = {
			id: characterData.id,
			name: characterData.name,
			nameCn: nameCn,
			icon: characterData.images?.grid || null,
			image: characterData.images?.medium || null,
			gender: characterData.gender || '?',
			popularity: characterData.stat?.collects || 0,
			summary: characterData.summary || '',
			tags: characterTags
		};

		// Cache the character data
		await setCache(cacheKey, character, CACHE_TIMES.CHARACTER);

		return json(character);
	} catch (error) {
		console.error('Get character details error:', error);
		return json({ error: 'Failed to get character details' }, { status: 500 });
	}
};
