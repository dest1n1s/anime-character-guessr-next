import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { SearchResult } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { keyword, limit = 10, offset = 0 } = await request.json();

		if (!keyword || typeof keyword !== 'string') {
			return json({ error: 'Invalid keyword' }, { status: 400 });
		}

		// Make request to Bangumi API
		const response = await axios.post(
			`https://api.bgm.tv/v0/search/characters?limit=${limit}&offset=${offset}`,
			{ keyword: keyword.trim() },
			{
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'User-Agent': 'AnimeCharacterGuessr/1.0'
				}
			}
		);

		// Map the response to our format
		const results: SearchResult[] = response.data.data.map((character: any) => ({
			id: character.id,
			icon: character.images?.grid || null,
			image: character.images?.medium || null,
			name: character.name,
			nameCn:
				character.infobox.find((item: any) => item.key === '简体中文名')?.value || character.name,
			gender: character.gender || '?',
			popularity: character.stat.collects
		}));

		return json({ results });
	} catch (error) {
		console.error('Search characters error:', error);
		return json({ error: 'Failed to search characters' }, { status: 500 });
	}
};
