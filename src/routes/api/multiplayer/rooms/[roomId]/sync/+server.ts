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

		// Check if the player is in the room
		const player = room.players.find((p) => p.id === playerId);
		if (!player) {
			return json({ error: 'Player not in room' }, { status: 403 });
		}

		// Send a roomUpdate event targeted to this player
		// Using a targetPlayer property allows the client to know it's specifically for them
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room,
				source: 'manual_sync',
				targetPlayer: playerId
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error syncing room:', error);
		return json({ error: 'Failed to sync room data' }, { status: 500 });
	}
};
