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

		// Check if the game is already in progress
		if (room.gameState.status !== 'waiting') {
			return json({ error: 'Game already in progress' }, { status: 400 });
		}

		// Find the player in the room
		const player = room.players.find((p) => p.id === playerId);
		if (!player) {
			return json({ error: 'Player not in room' }, { status: 403 });
		}

		// Update player ready status
		player.isReady = false;

		// Notify all clients in the room
		addRoomEvent(roomId, {
			type: 'playerUnready',
			data: {
				playerId,
				playerName: player.name
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error setting player unready:', error);
		return json({ error: 'Failed to set player unready' }, { status: 500 });
	}
};
