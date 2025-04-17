import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent } from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, cookies }) => {
	try {
		const roomId = params.roomId || '';
		const playerId = cookies.get('playerId');

		// Validate inputs
		if (!roomId || !isValidRoomId(roomId)) {
			return json({ error: 'Invalid room ID' }, { status: 400 });
		}

		if (!playerId) {
			return json({ error: 'Missing player ID' }, { status: 400 });
		}

		// Check if the room exists
		const room = rooms.get(roomId);
		if (!room) {
			return json({ error: 'Room not found' }, { status: 404 });
		}

		// Check if the player is the host
		if (room.host !== playerId) {
			return json({ error: 'Only the host can end the game' }, { status: 403 });
		}

		// End the game
		room.gameState.status = 'gameEnd';

		// Find the player with the highest score
		const highestScore = Math.max(...room.players.map((p) => p.score));
		const winners = room.players.filter((p) => p.score === highestScore);

		// Notify all clients about the game end
		addRoomEvent(roomId, {
			type: 'gameEnd',
			data: {
				winner: winners.length === 1 ? winners[0].id : null, // null for tie
				winners: winners.map((p) => ({ id: p.id, name: p.name, score: p.score })),
				scores: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
				totalRounds: room.totalRounds,
				completedRounds: room.currentRound
			}
		});

		// Send room update to refresh
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error ending game:', error);
		return json({ error: 'Failed to end the game' }, { status: 500 });
	}
};
