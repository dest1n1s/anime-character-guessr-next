import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { Subject } from '$lib/types';
import { getCache, setCache, CACHE_TIMES } from '$lib/server/redis';

function processSubject(data: any): Subject {
	return {
		id: data.id,
		name: data.name,
		name_cn: data.name_cn || data.name,
		image: data.images.common,
		type: data.type || 0
	};
}

export const GET: RequestHandler = async ({ params }) => {
	try {
		const subjectId = params.id;

		if (!subjectId || isNaN(Number(subjectId))) {
			return json({ error: 'Invalid subject ID' }, { status: 400 });
		}

		// Create cache key for subject details
		const cacheKey = `subject:${subjectId}`;

		// Check cache first
		const cachedSubject = await getCache<Subject>(cacheKey);
		if (cachedSubject) {
			console.log(`Cache hit for subject: ${subjectId}`);
			return json(cachedSubject);
		}

		// Cache miss, fetch from API
		console.log(`Cache miss for subject: ${subjectId}, fetching from API`);

		// Make request to Bangumi API
		const response = await axios.get(`https://api.bgm.tv/v0/subjects/${subjectId}`, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'AnimeCharacterGuessr/1.0'
			}
		});

		const subject = processSubject(response.data);

		// Cache the subject details
		await setCache(cacheKey, subject, CACHE_TIMES.SUBJECT_DETAILS);

		return json(subject);
	} catch (error) {
		console.error('Get subject error:', error);
		return json({ error: 'Failed to get subject details' }, { status: 500 });
	}
};
