import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rooms } from '$lib/server/gameStore';
import type { Room } from '$lib/types';

// Get the number of rooms
export const GET: RequestHandler = async () => {
	const roomList = Array.from(rooms.values()).map((room: Room) => ({
		id: room.id,
		name: room.name,
		playerCount: room.players.length,
		status: room.gameState.status,
		currentRound: room.currentRound,
		totalRounds: room.totalRounds
	}));

	return json({ count: roomList.length });
};
