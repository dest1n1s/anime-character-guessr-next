import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent } from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';
import type { GameSettings } from '$lib/types';

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
			return json({ error: 'Only the host can update room settings' }, { status: 403 });
		}

		// Parse request body
		const requestData = await request.json();
		const { key, value } = requestData;

		if (!key) {
			return json({ error: 'Setting key is required' }, { status: 400 });
		}

		// Handle special case for preset application
		if (key === 'preset') {
			// Preset values are handled on the client side
			return json({ success: true });
		}

		// Validate setting key (only allow updating specific settings)
		const allowedSettings = [
			'startYear',
			'endYear',
			'topNSubjects',
			'mainCharacterOnly',
			'characterNum',
			'maxAttempts',
			'enableHints',
			'includeGame',
			'timeLimit',
			'subjectSearch',
			'totalRounds'
		];

		if (!allowedSettings.includes(key)) {
			return json({ error: 'Invalid setting key' }, { status: 400 });
		}

		// Update the setting
		// Need to typecast to avoid TypeScript errors
		(room.settings as any)[key] = value;

		// Broadcast the updated room to all players
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room,
				updatedSetting: key,
				source: 'settings_update'
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error updating room settings:', error);
		return json({ error: 'Failed to update room settings' }, { status: 500 });
	}
};
