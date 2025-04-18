import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent } from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';
import { getCharacterAppearances, getRandomCharacter } from '$lib/api';

export const POST: RequestHandler = async ({ fetch, params, cookies, request }) => {
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
			return json({ error: 'Only the host can start the game or next round' }, { status: 403 });
		}

		// Handle different game states
		if (room.gameState.status === 'waiting') {
			// Starting a new game

			// Check if there are at least 2 players in the room
			if (room.players.length < 2) {
				return json({ error: 'Need at least 2 players to start' }, { status: 400 });
			}

			// Check if all players are ready
			const allReady = room.players.every((p) => p.isHost || p.isReady);
			if (!allReady) {
				return json({ error: 'Not all players are ready' }, { status: 400 });
			}

			// Initialize game state
			room.gameState.status = 'playing';
			room.currentRound = 1;
			room.totalRounds = room.settings.totalRounds;

			// Reset all player scores for a new game
			room.players.forEach((p) => {
				p.score = 0;
				p.currentGuess = null;
				p.guessTime = null;
				p.guesses = [];
			});

			// Notify about game start
			addRoomEvent(roomId, {
				type: 'gameStart',
				data: {
					round: room.currentRound,
					totalRounds: room.totalRounds
				}
			});
		} else if (room.gameState.status === 'roundEnd') {
			// Starting the next round
			room.totalRounds = room.settings.totalRounds;

			// Check if there are more rounds to play
			if (room.currentRound >= room.totalRounds) {
				return json({ error: 'All rounds have been played' }, { status: 400 });
			}

			// Increment round counter
			room.currentRound += 1;

			// Reset all player guesses for the new round
			room.players.forEach((p) => {
				p.currentGuess = null;
				p.guessTime = null;
				p.guesses = [];
			});
		} else {
			// Invalid game state for this operation
			return json(
				{ error: `Cannot start when game is in ${room.gameState.status} state` },
				{ status: 400 }
			);
		}

		// Common code for both starting a game and next round

		// Get a random character for the round
		const character = await getRandomCharacter(room.settings, fetch);
		const appearances = await getCharacterAppearances(character.id, room.settings, fetch);
		room.answerCharacter = { ...character, ...appearances };

		// Set round start time and time remaining
		const now = Date.now();
		room.gameState.status = 'playing';
		room.gameState.roundStartTime = now;
		room.gameState.timeRemaining = room.settings.timeLimit;

		// Notify about round start
		addRoomEvent(roomId, {
			type: 'roundStart',
			data: {
				round: room.currentRound,
				totalRounds: room.totalRounds,
				timeLimit: room.settings.timeLimit,
				maxAttempts: room.settings.maxAttempts
			}
		});

		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room: room
			}
		});

		// Start a timer to update the time remaining
		const timerId = setInterval(() => {
			if (!rooms.has(roomId)) {
				clearInterval(timerId);
				return;
			}

			const currentRoom = rooms.get(roomId)!;

			// Update time remaining
			if (currentRoom.gameState.roundStartTime && currentRoom.gameState.status === 'playing') {
				const elapsed = Math.floor((Date.now() - currentRoom.gameState.roundStartTime) / 1000);
				const remaining = Math.max(0, (currentRoom.settings.timeLimit || 60) - elapsed);
				currentRoom.gameState.timeRemaining = remaining;

				// If time is up, end the round
				if (remaining === 0) {
					currentRoom.gameState.status = 'roundEnd';
					addRoomEvent(roomId, {
						type: 'roundEnd',
						data: {
							answer: currentRoom.answerCharacter,
							winner: null, // No winner for this round (time up)
							currentRound: currentRoom.currentRound,
							totalRounds: currentRoom.totalRounds
						}
					});
					clearInterval(timerId);
				}

				addRoomEvent(roomId, {
					type: 'roomUpdate',
					data: {
						room: currentRoom
					}
				});
			}
		}, 1000);

		return json({ success: true });
	} catch (error) {
		console.error('Error starting game or next round:', error);
		return json({ error: 'Failed to start' }, { status: 500 });
	}
};
