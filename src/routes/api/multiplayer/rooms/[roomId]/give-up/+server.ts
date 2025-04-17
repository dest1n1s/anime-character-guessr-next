import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, addRoomEvent, broadcastErrorToRoom } from '$lib/server/gameStore';
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

		// Find the player in the room
		const player = room.players.find((p) => p.id === playerId);
		if (!player) {
			return json({ error: 'Player not in room' }, { status: 403 });
		}

		// Check if the game is in progress
		if (room.gameState.status !== 'playing') {
			return json({ error: 'Game is not in progress' }, { status: 400 });
		}

		// Check if the player has already given up
		if (player.guesses && player.guesses.length >= room.settings.maxAttempts) {
			return json({ error: 'You have already given up or used all your guesses' }, { status: 400 });
		}

		// Initialize guesses array if it doesn't exist
		if (!player.guesses) {
			player.guesses = [];
		}

		// Set player's guesses to max to indicate they've given up
		while (player.guesses.length < room.settings.maxAttempts) {
			// Add a placeholder "give up" guess
			player.guesses.push({
				icon: null,
				name: '放弃猜测',
				nameCn: '放弃猜测',
				gender: '',
				genderFeedback: '',
				latestAppearance: -1,
				latestAppearanceFeedback: '',
				earliestAppearance: -1,
				earliestAppearanceFeedback: '',
				highestRating: -1,
				ratingFeedback: '',
				appearancesCount: 0,
				appearancesCountFeedback: '',
				popularity: -1,
				popularityFeedback: '',
				sharedAppearances: {
					first: '',
					count: 0
				},
				metaTags: [],
				sharedMetaTags: [],
				isAnswer: false
			});
		}

		// Notify all clients that the player has given up
		addRoomEvent(roomId, {
			type: 'playerGuessed',
			data: {
				playerId,
				playerName: player.name,
				guess: player.guesses[player.guesses.length - 1],
				isCorrect: false,
				gaveUp: true,
				guessesRemaining: 0
			}
		});

		// Check if all players have used all their guesses or given up
		const allPlayersOutOfGuesses = room.players.every((p) => {
			return p.guesses && p.guesses.length >= room.settings.maxAttempts;
		});

		// End round if all players are out of guesses
		if (allPlayersOutOfGuesses) {
			room.gameState.status = 'roundEnd';

			addRoomEvent(roomId, {
				type: 'roundEnd',
				data: {
					answer: room.answerCharacter,
					winner: null, // No winner for this round
					currentRound: room.currentRound,
					totalRounds: room.totalRounds
				}
			});
		}

		// Send room update to refresh player states
		addRoomEvent(roomId, {
			type: 'roomUpdate',
			data: {
				room: room
			}
		});

		return json({
			success: true,
			message: '已放弃本回合',
			guessesRemaining: 0
		});
	} catch (error) {
		console.error('Error giving up:', error);
		return json({ error: 'Failed to give up' }, { status: 500 });
	}
};
