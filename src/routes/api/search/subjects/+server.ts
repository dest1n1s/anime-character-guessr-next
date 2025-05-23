import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { Subject } from '$lib/types';
import { getCache, setCache, CACHE_TIMES } from '$lib/server/redis';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { keyword } = await request.json();

		if (!keyword || typeof keyword !== 'string') {
			return json({ error: 'Invalid keyword' }, { status: 400 });
		}

		// Create cache key for subject search
		const cacheKey = `search:subjects:${keyword}`;

		// Check cache first
		const cachedResults = await getCache<{ results: Subject[] }>(cacheKey);
		if (cachedResults) {
			console.log(`Cache hit for subject search: ${keyword}`);
			return json(cachedResults);
		}

		// Cache miss, fetch from API
		console.log(`Cache miss for subject search: ${keyword}, fetching from API`);

		// Make request to Bangumi API
		const response = await axios.get(
			`https://api.bgm.tv/search/subject/${encodeURIComponent(keyword.trim())}?type=2&responseGroup=small&max_results=10`,
			{
				headers: {
					Accept: 'application/json',
					'User-Agent': 'AnimeCharacterGuessr/1.0'
				}
			}
		);

		// Check if the response is html
		if (typeof response.data === 'string') {
			return json({ results: [] });
		}

		// Map the response to our format
		const results: Subject[] = response.data.list.map((subject: any) => ({
			id: subject.id,
			name: subject.name,
			name_cn: subject.name_cn || subject.name,
			type: getSubjectType(subject.type),
			image: subject.images?.common
		}));

		const responseData = { results };

		// Cache the search results
		await setCache(cacheKey, responseData, CACHE_TIMES.SEARCH_RESULTS);

		return json(responseData);
	} catch (error) {
		console.error('Search subjects error:', error);
		return json({ error: 'Failed to search subjects' }, { status: 500 });
	}
};

// Helper function to convert Bangumi subject type to human-readable format
function getSubjectType(type: number): string {
	switch (type) {
		case 1:
			return '书籍';
		case 2:
			return '动画';
		case 3:
			return '音乐';
		case 4:
			return '游戏';
		case 6:
			return '真人';
		default:
			return '其他';
	}
}
