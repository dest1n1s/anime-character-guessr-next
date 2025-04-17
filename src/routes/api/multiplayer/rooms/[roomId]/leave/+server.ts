import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import {
	rooms,
	removePlayerFromRoom,
	broadcastErrorToRoom,
	addRoomEvent
} from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';

// Track players who are refreshing to avoid removing them
const refreshingPlayers: Map<
	string,
	{ timestamp: number; timeoutId: ReturnType<typeof setTimeout> }
> = new Map();

export const POST: RequestHandler = async ({ params, cookies, request }) => {
	try {
		const roomId = params.roomId || '';
		const playerId = cookies.get('playerId');

		// Check if this is a refresh or a genuine leave
		let isRefresh = false;

		// Try to parse body if possible to check for refresh param
		try {
			const contentType = request.headers.get('content-type') || '';

			if (contentType.includes('application/json')) {
				// Handle JSON format
				const json = await request.json();
				isRefresh = json.refresh === true;
			} else {
				// Handle plain text format (used by sendBeacon)
				const text = await request.text();
				isRefresh = text.includes('refresh=true');
			}
		} catch (e) {
			// If we can't parse body, default to not refresh
			console.log('Could not parse request body, assuming not a refresh');
		}

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

		// Handle differently based on whether this is a refresh or a genuine leave
		if (isRefresh) {
			// This is just a page refresh, don't remove the player yet
			const playerKey = `${roomId}:${playerId}`;
			console.log(`Player ${playerId} is refreshing in room ${roomId}`);

			// Clear any existing refresh timeout
			if (refreshingPlayers.has(playerKey)) {
				clearTimeout(refreshingPlayers.get(playerKey)!.timeoutId);
			}

			// Set a short timeout to remove the player if they don't reconnect
			// This is a fallback in case the reconnection detection doesn't work
			const timeoutId = setTimeout(() => {
				console.log(`Refresh timeout expired for ${playerId} in room ${roomId}`);
				refreshingPlayers.delete(playerKey);

				// Only remove if they haven't reconnected
				const currentRoom = rooms.get(roomId);
				if (currentRoom && currentRoom.players.find((p) => p.id === playerId)) {
					// Double check that they're not connected via the events endpoint
					// This check is handled by the events endpoint's reconnect system
				}
			}, 30000); // 30 seconds should be plenty for a refresh

			// Track this refreshing player
			refreshingPlayers.set(playerKey, {
				timestamp: Date.now(),
				timeoutId
			});

			return json({ success: true, refreshing: true });
		} else {
			// This is an actual leave request

			// Store player information before removal to use in notifications
			const wasHost = player.isHost;
			const playerName = player.name;

			// Remove the player from the room
			removePlayerFromRoom(roomId, playerId);

			// Check if room still exists (it might be deleted if it was empty)
			if (rooms.has(roomId)) {
				// Send a notification to remaining players
				if (wasHost) {
					// If the host left, notify about host reassignment
					broadcastErrorToRoom(roomId, `房主 ${playerName} 离开了房间。新的房主已被指定。`, {
						errorCode: 'host_left'
					});
				}

				// For the player who left, confirm their successful departure
				addRoomEvent(roomId, {
					type: 'playerLeft',
					data: {
						playerId,
						playerName
					}
				});
			}

			return json({ success: true, refreshing: false });
		}
	} catch (error) {
		console.error('Error leaving room:', error);
		return json({ error: 'Failed to leave room' }, { status: 500 });
	}
};
