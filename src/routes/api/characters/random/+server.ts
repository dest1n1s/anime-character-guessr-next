import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { Character, GameSettings, Subject } from '$lib/types';

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
			const indexResponse = await axios.get(`https://api.bgm.tv/v0/indices/${settings.indexId}`, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'AnimeCharacterGuessr/1.0'
				}
			});

			// Get total from index info
			total = indexResponse.data.total + settings.addedSubjects.length;

			// Get a random offset within the total number of subjects
			randomOffset = Math.floor(Math.random() * total);

			if (randomOffset >= indexResponse.data.total) {
				// Select from added subjects
				randomOffset = randomOffset - indexResponse.data.total;
				subject = settings.addedSubjects[randomOffset];
			} else {
				// Fetch one subject from the index at the random offset
				const subjectResponse = await axios.get(
					`https://api.bgm.tv/v0/indices/${settings.indexId}/subjects?limit=1&offset=${randomOffset}`,
					{
						headers: {
							Accept: 'application/json',
							'User-Agent': 'AnimeCharacterGuessr/1.0'
						}
					}
				);

				if (
					!subjectResponse.data ||
					!subjectResponse.data.data ||
					subjectResponse.data.data.length === 0
				) {
					throw new Error('No subjects found in index');
				}

				subject = subjectResponse.data.data[0];
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
			// Fetch one subject at the random offset using POST search API
			const response = await axios.post(
				`https://api.bgm.tv/v0/search/subjects?limit=1&offset=${randomOffset}`,
				{
					sort: 'heat',
					filter: {
						type: [2], // Anime type
						air_date: [`>=${settings.startYear}-01-01`, `<${minDate}`],
						meta_tags: settings.metaTags.filter((tag) => tag !== '')
					}
				},
				{
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						'User-Agent': 'AnimeCharacterGuessr/1.0'
					}
				}
			);

			if (!response.data || !response.data.data || response.data.data.length === 0) {
				return json({ error: 'Failed to fetch subject at random offset' }, { status: 400 });
			}

			subject = response.data.data[0];
		}
	}

	// Get characters for the selected subject
	const charactersResponse = await axios.get(
		`https://api.bgm.tv/v0/subjects/${subject.id}/characters`,
		{
			headers: {
				Accept: 'application/json',
				'User-Agent': 'AnimeCharacterGuessr/1.0'
			}
		}
	);

	// Filter and select characters based on mainCharacterOnly setting
	let filteredCharacters;
	if (settings.mainCharacterOnly) {
		filteredCharacters = charactersResponse.data.filter((c: any) => c.relation === '主角');
	} else {
		// Get both main and supporting characters but limit to characterNum
		filteredCharacters = charactersResponse.data
			.filter((c: any) => c.relation === '主角' || c.relation === '配角')
			.slice(0, settings.characterNum);
	}

	if (filteredCharacters.length === 0) {
		return json({ error: 'No characters found for this anime' }, { status: 404 });
	}

	// Randomly select one character from the filtered characters
	const randomCharacterIndex = Math.floor(Math.random() * filteredCharacters.length);
	const selectedCharacter = filteredCharacters[randomCharacterIndex];

	// Get additional character details
	let characterDetail = selectedCharacter;
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
	} catch (error) {
		console.warn(`Failed to get detailed info for character ${selectedCharacter.id}:`, error);
		// Continue with the basic character data we already have
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
