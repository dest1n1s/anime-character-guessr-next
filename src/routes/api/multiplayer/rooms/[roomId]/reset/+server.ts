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
			return json({ error: 'Only the host can reset the room' }, { status: 403 });
		}

		// Save the current settings before reset
		const currentSettings = room.settings;

		// Reset the room state
		room.gameState.status = 'waiting';
		room.gameState.roundStartTime = null;
		room.gameState.timeRemaining = null;
		room.currentRound = 0;
		room.answerCharacter = null;

		// Preserve the settings
		room.settings = currentSettings;

		// Reset all players
		room.players.forEach((p) => {
			p.score = 0;
			p.currentGuess = null;
			p.guessTime = null;
			p.guesses = [];
			p.isReady = false;
			// Keep the host's ready status as true
			if (p.id === room.host) {
				p.isReady = true;
				p.isHost = true;
			}
		});

		// Notify all clients about the reset
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error resetting room:', error);
		return json({ error: 'Failed to reset the room' }, { status: 500 });
	}
};
