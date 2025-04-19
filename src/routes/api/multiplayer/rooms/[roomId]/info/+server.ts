import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent } from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, cookies, request }) => {
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

		// Check if the player is in the room and is the host
		const player = room.players.find((p) => p.id === playerId);
		if (!player) {
			return json({ error: 'Player not in room' }, { status: 403 });
		}

		if (!player.isHost) {
			return json({ error: 'Only the host can update room information' }, { status: 403 });
		}

		// Parse request body
		const { name, isPrivate } = await request.json();

		// Validate inputs
		if (name !== undefined) {
			if (typeof name !== 'string' || name.trim() === '') {
				return json({ error: 'Invalid room name' }, { status: 400 });
			}
			room.name = name.trim().slice(0, 50); // Limit name length
		}

		if (isPrivate !== undefined) {
			if (typeof isPrivate !== 'boolean') {
				return json({ error: 'Invalid privacy setting' }, { status: 400 });
			}
			room.private = isPrivate;
		}

		// Notify all clients in the room about the update
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room: room
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error updating room information:', error);
		return json({ error: 'Failed to update room information' }, { status: 500 });
	}
};
