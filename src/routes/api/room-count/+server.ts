import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  // In the real implementation, this would fetch actual room count from a database
  // For now, we'll just return a fixed number
  return json({
    count: 42
  });
}; 