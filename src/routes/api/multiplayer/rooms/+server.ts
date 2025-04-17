import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms } from '$lib/server/gameStore';
import { generateRoomId, generateRoomName } from '$lib/server/utils';
import type { Room } from '$lib/types';

// Get all rooms
export const GET: RequestHandler = async () => {
	// Return a simplified list of rooms (without sensitive data)
	const roomList = Array.from(rooms.values()).map((room: Room) => ({
		id: room.id,
		name: room.name,
		playerCount: room.players.length,
		status: room.gameState.status,
		currentRound: room.currentRound,
		totalRounds: room.totalRounds
	}));

	return json({ rooms: roomList });
};

// Create a new room
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { hostName, settings } = await request.json();

		if (!hostName || typeof hostName !== 'string') {
			return json({ error: 'Invalid host name' }, { status: 400 });
		}

		if (!cookies.get('playerId')) {
			cookies.set('playerId', crypto.randomUUID(), {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}

		const hostId = cookies.get('playerId')!;

		// Generate a unique room ID
		const roomId = generateRoomId();

		// Create a new room
		const newRoom: Room = {
			id: roomId,
			name: generateRoomName(),
			host: hostId,
			players: [
				{
					id: hostId,
					name: hostName,
					isHost: true,
					isReady: false,
					score: 0,
					currentGuess: null,
					guessTime: null,
					guesses: []
				}
			],
			gameState: {
				status: 'waiting',
				roundStartTime: null,
				timeRemaining: null
			},
			settings: settings || {
				startYear: new Date().getFullYear() - 10,
				endYear: new Date().getFullYear(),
				topNSubjects: 50,
				metaTags: ['', '', ''],
				useIndex: false,
				indexId: null,
				addedSubjects: [],
				mainCharacterOnly: true,
				characterNum: 6,
				maxAttempts: 5,
				enableHints: false,
				includeGame: false,
				timeLimit: 60,
				subjectSearch: true
			},
			currentRound: 0,
			totalRounds: 5,
			answerCharacter: null
		};

		// Store the room
		rooms.set(roomId, newRoom);

		return json({
			roomId
		});
	} catch (error) {
		console.error('Error creating room:', error);
		return json({ error: 'Failed to create room' }, { status: 500 });
	}
};
