import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms, removePlayerFromAllRooms } from '$lib/server/gameStore';
import { generateRoomId, generateRoomName } from '$lib/server/utils';
import type { Room } from '$lib/types';

// Get all rooms
export const GET: RequestHandler = async () => {
	// Return a simplified list of rooms (without sensitive data)
	// Filter out private rooms
	const roomList = Array.from(rooms.values())
		.filter((room: Room) => !room.private)
		.map((room: Room) => ({
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
		const { hostName, settings, roomName, isPrivate } = await request.json();

		if (!hostName || typeof hostName !== 'string') {
			return json({ error: 'Invalid host name' }, { status: 400 });
		}

		// Validate roomName if provided
		if (roomName !== undefined && (typeof roomName !== 'string' || roomName.trim() === '')) {
			return json({ error: 'Invalid room name' }, { status: 400 });
		}

		// Validate isPrivate if provided
		if (isPrivate !== undefined && typeof isPrivate !== 'boolean') {
			return json({ error: 'Invalid private flag' }, { status: 400 });
		}

		if (!cookies.get('playerId')) {
			cookies.set('playerId', crypto.randomUUID(), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: false
			});
		}

		const hostId = cookies.get('playerId')!;

		// Generate a unique room ID
		const roomId = generateRoomId();

		// Remove player from all rooms
		removePlayerFromAllRooms(hostId);

		// Create a new room
		const newRoom: Room = {
			id: roomId,
			name: roomName?.trim() || generateRoomName(),
			host: hostId,
			private: isPrivate === true,
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
