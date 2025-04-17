import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import type { SearchResult } from '$lib/types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const subjectId = params.id;
    
    if (!subjectId || isNaN(Number(subjectId))) {
      return json({ error: 'Invalid subject ID' }, { status: 400 });
    }
    
    // Make request to Bangumi API
    const response = await axios.get(
      `https://api.bgm.tv/v0/subjects/${subjectId}/characters`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AnimeCharacterGuessr/1.0'
        }
      }
    );
    
    // Map the response to our format
    const characters: SearchResult[] = response.data.data.map((item: any) => {
      const character = item.character;
      return {
        id: character.id,
        name: character.name,
        nameCn: character.name_cn || character.name,
        image: character.images?.grid || null,
        gender: character.gender || '?'
      };
    }).filter((character: SearchResult) => character.name && character.id); // Filter out incomplete characters
    
    return json({ characters });
  } catch (error) {
    console.error('Get characters error:', error);
    return json({ error: 'Failed to get characters' }, { status: 500 });
  }
}; 