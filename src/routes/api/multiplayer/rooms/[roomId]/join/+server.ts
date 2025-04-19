import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent, removePlayerFromAllRooms } from '$lib/server/gameStore';
import { isValidRoomId, generatePlayerName } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const roomId = params.roomId || '';
		if (!cookies.get('playerId')) {
			cookies.set('playerId', crypto.randomUUID(), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: false
			});
		}

		const playerId = cookies.get('playerId') || '';

		if (!roomId || !isValidRoomId(roomId)) {
			return json({ error: 'Invalid room ID' }, { status: 400 });
		}

		// Get request body
		const { playerName } = await request.json();

		// Check if the room exists
		const room = rooms.get(roomId);
		if (!room) {
			return json({ error: 'Room not found' }, { status: 404 });
		}

		// Check if the game is already in progress
		if (room.gameState.status !== 'waiting') {
			return json({ error: 'Game already in progress' }, { status: 400 });
		}

		// Check if the room is full (max 8 players)
		if (room.players.length >= 8) {
			return json({ error: 'Room is full' }, { status: 400 });
		}

		const name =
			playerName && typeof playerName === 'string' && playerName.trim()
				? playerName.trim().slice(0, 20) // Limit name length
				: generatePlayerName();

		if (!room.players.find((p) => p.id === playerId)) {
			removePlayerFromAllRooms(playerId);

			// Add the player to the room
			room.players.push({
				id: playerId,
				name,
				isHost: false,
				isReady: false,
				score: 0,
				currentGuess: null,
				guessTime: null,
				guesses: []
			});

			// Notify all clients in the room
			addRoomEvent(roomId, {
				type: 'playerJoined',
				data: {
					player: {
						id: playerId,
						name,
						isHost: false,
						isReady: false,
						score: 0
					}
				}
			});
		}

		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room: room
			}
		});

		return json({
			playerId,
			room: {
				id: room.id,
				name: room.name,
				players: room.players.map((p) => ({
					id: p.id,
					name: p.name,
					isHost: p.isHost,
					isReady: p.isReady,
					score: p.score
				})),
				gameState: room.gameState,
				currentRound: room.currentRound,
				totalRounds: room.totalRounds
			}
		});
	} catch (error) {
		console.error('Error joining room:', error);
		return json({ error: 'Failed to join room' }, { status: 500 });
	}
};
