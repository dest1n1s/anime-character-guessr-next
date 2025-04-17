import type { Room, Player, GameEvent } from '$lib/types';

// In-memory storage for active game rooms
export const rooms = new Map<string, Room>();

// Game events for each room
export const roomEvents = new Map<string, GameEvent[]>();

// List of event emitters for each room
// This will store functions that emit events to clients
type EventEmitter = (roomId: string, event: GameEvent) => void;
export const roomEmitters = new Set<EventEmitter>();

// Maximum number of events to keep per room
const MAX_EVENTS_PER_ROOM = 100;

/**
 * Register an event emitter function
 */
export function registerEmitter(emitter: EventEmitter) {
	roomEmitters.add(emitter);
	return () => {
		roomEmitters.delete(emitter);
	};
}

/**
 * Add a new event to a room
 */
export function addRoomEvent(roomId: string, event: Omit<GameEvent, 'timestamp'>) {
	if (!roomEvents.has(roomId)) {
		roomEvents.set(roomId, []);
	}

	const events = roomEvents.get(roomId)!;
	const newEvent: GameEvent = {
		...event,
		timestamp: Date.now()
	};

	events.push(newEvent);

	// Keep only the latest MAX_EVENTS_PER_ROOM events
	if (events.length > MAX_EVENTS_PER_ROOM) {
		events.splice(0, events.length - MAX_EVENTS_PER_ROOM);
	}

	// Notify all clients in the room
	broadcastToRoom(roomId, newEvent);
}

/**
 * Broadcast an event to all clients in a room
 */
export function broadcastToRoom(roomId: string, event: GameEvent) {
	// Notify all registered emitters about this event
	for (const emitter of roomEmitters) {
		try {
			emitter(roomId, event);
		} catch (error) {
			console.error(`Error broadcasting event:`, error);
		}
	}
}

/**
 * Remove a player from a room
 */
export function removePlayerFromRoom(roomId: string, playerId: string) {
	const room = rooms.get(roomId);
	if (!room) return;

	const playerIndex = room.players.findIndex((p) => p.id === playerId);
	if (playerIndex === -1) return;

	const player = room.players[playerIndex];
	room.players.splice(playerIndex, 1);

	// If no players left, delete the room
	if (room.players.length === 0) {
		rooms.delete(roomId);
		roomEvents.delete(roomId);
		return;
	}

	// If the host left, assign a new host
	if (player.isHost && room.players.length > 0) {
		room.players[0].isHost = true;
		room.host = room.players[0].id;
	}

	// Notify all clients in the room
	addRoomEvent(roomId, {
		type: 'playerLeft',
		data: {
			playerId,
			playerName: player.name
		}
	});
}

// Clean up inactive rooms every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_ROOM_AGE = 3 * 60 * 60 * 1000; // 3 hours

setInterval(() => {
	const now = Date.now();

	for (const [roomId, room] of rooms.entries()) {
		// Check if the room has any events in the last MAX_ROOM_AGE
		const events = roomEvents.get(roomId) || [];
		const lastEventTime = events.length > 0 ? events[events.length - 1].timestamp : 0;

		if (now - lastEventTime > MAX_ROOM_AGE) {
			console.log(`Cleaning up inactive room: ${roomId}`);
			rooms.delete(roomId);
			roomEvents.delete(roomId);
		}
	}
}, CLEANUP_INTERVAL);

/**
 * Broadcast an error event to a specific player or all players in a room
 */
export function broadcastErrorToRoom(
	roomId: string,
	errorMessage: string,
	options: {
		playerId?: string; // If provided, only this player will receive the error
		errorCode?: string; // Optional error code for programmatic handling
		redirect?: string; // Optional redirect URL
		details?: any; // Optional additional details
	} = {}
) {
	// Create the error event
	const errorEvent: GameEvent = {
		type: 'error',
		data: {
			message: errorMessage,
			code: options.errorCode,
			redirect: options.redirect,
			details: options.details
		},
		timestamp: Date.now()
	};

	// Store the error in room events if it's a room-wide error
	if (!options.playerId) {
		// Add to room events history
		if (!roomEvents.has(roomId)) {
			roomEvents.set(roomId, []);
		}

		const events = roomEvents.get(roomId)!;
		events.push(errorEvent);

		// Keep only the latest MAX_EVENTS_PER_ROOM events
		if (events.length > MAX_EVENTS_PER_ROOM) {
			events.splice(0, events.length - MAX_EVENTS_PER_ROOM);
		}
	}

	// Broadcast the error to all room emitters
	for (const emitter of roomEmitters) {
		try {
			// Only send to specific player if specified
			if (options.playerId) {
				// We need to check if this emitter is for the target player
				// This is implementation-dependent - might need to modify the emitter
				// registration to include player ID information
				emitter(roomId, errorEvent);
			} else {
				// Broadcast to all players in the room
				emitter(roomId, errorEvent);
			}
		} catch (error) {
			console.error(`Error broadcasting error event:`, error);
		}
	}
}
