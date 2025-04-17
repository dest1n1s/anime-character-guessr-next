import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { characterId, tags } = await request.json();
    
    if (!characterId || !tags || !Array.isArray(tags)) {
      return json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    // Validate each tag
    if (tags.some(tag => typeof tag !== 'string' || tag.length > 8 || tag.length < 1)) {
      return json({ error: 'Invalid tag format' }, { status: 400 });
    }
    
    // In a real implementation, we would store these custom tag proposals in a moderation queue
    // For the prototype, we'll just log them and respond with success
    console.log(`Proposed custom tags for character ${characterId}:`, tags);
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return json({ success: true, message: 'Custom tags proposed successfully' });
  } catch (error) {
    console.error('Custom tags proposal error:', error);
    return json({ error: 'Failed to propose custom tags' }, { status: 500 });
  }
}; 