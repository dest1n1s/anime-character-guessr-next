import {
	rooms,
	roomEvents,
	registerEmitter,
	removePlayerFromRoom,
	broadcastErrorToRoom
} from '$lib/server/gameStore';
import { isValidRoomId } from '$lib/server/utils';
import type { RequestHandler } from '@sveltejs/kit';
import { produce } from 'sveltekit-sse';

// Use a module-level Map to track connected clients across all SSE connections
const connectedClients: Map<string, { roomId: string; playerId: string; lastActive: number }> =
	new Map();

// Track recent disconnects to handle browser refreshes better
const recentDisconnects: Map<
	string,
	{ timestamp: number; reconnectTimer: ReturnType<typeof setTimeout> }
> = new Map();

export const POST: RequestHandler = async ({ params, cookies, getClientAddress }) => {
	const roomId = params.roomId || '';
	const playerId = cookies.get('playerId');

	// Validate the room ID and player ID
	if (!roomId || !isValidRoomId(roomId)) {
		return produce(
			function startErrorStream({ emit, lock }) {
				console.log(`Invalid room ID attempted: ${roomId}`);

				// Send an error event
				const errorEvent = {
					type: 'error',
					data: {
						message: '房间 ID 无效，请检查您的链接。',
						redirect: '/multiplayer'
					},
					timestamp: Date.now()
				};

				emit('message', JSON.stringify(errorEvent));

				// Close the connection after a short delay
				setTimeout(() => {
					lock.set(false);
				}, 2000);

				return function stop() {
					// No cleanup needed for this short-lived connection
				};
			},
			{
				ping: 5000
			}
		);
	}

	if (!playerId) {
		return produce(
			function startErrorStream({ emit, lock }) {
				console.log(`Missing player ID attempted connection to room ${roomId}`);

				// Send an error event
				const errorEvent = {
					type: 'error',
					data: {
						message: '未找到玩家 ID，请返回主页重新加入游戏。',
						redirect: '/multiplayer'
					},
					timestamp: Date.now()
				};

				emit('message', JSON.stringify(errorEvent));

				// Close the connection after a short delay
				setTimeout(() => {
					lock.set(false);
				}, 2000);

				return function stop() {
					// No cleanup needed for this short-lived connection
				};
			},
			{
				ping: 5000
			}
		);
	}

	// Check if the room exists
	const room = rooms.get(roomId);
	if (!room) {
		return produce(
			function startErrorStream({ emit, lock }) {
				console.log(`Room not found for ID: ${roomId}`);

				// Send an error event
				const errorEvent = {
					type: 'error',
					data: {
						message: '未找到该房间，可能已被删除或过期。',
						redirect: '/multiplayer'
					},
					timestamp: Date.now()
				};

				emit('message', JSON.stringify(errorEvent));

				// Close the connection after a short delay
				setTimeout(() => {
					lock.set(false);
				}, 2000);

				return function stop() {
					// No cleanup needed for this short-lived connection
				};
			},
			{
				ping: 5000
			}
		);
	}

	// Check if the player is in the room
	const player = room.players.find((p) => p.id === playerId);
	if (!player) {
		// If the player is not in the room but has a valid player ID, we might want
		// to send them a helpful error via SSE before disconnecting
		return produce(
			function startErrorStream({ emit, lock }) {
				console.log(
					`Player ${playerId} attempted to connect to room ${roomId} but is not in the room`
				);

				// Send an error event
				const errorEvent = {
					type: 'error',
					data: {
						message: '你不在此房间内。可能是房间已被删除或你被移出了房间。',
						redirect: '/multiplayer?roomId=' + roomId
					},
					timestamp: Date.now()
				};

				emit('message', JSON.stringify(errorEvent));

				// Close the connection after a short delay
				setTimeout(() => {
					lock.set(false);
				}, 2000);

				return function stop() {
					// No cleanup needed for this short-lived connection
				};
			},
			{
				ping: 5000
			}
		);
	}

	// Create a unique client ID for tracking connections
	const clientId = crypto.randomUUID();
	const clientAddress = getClientAddress();

	// Check if this player recently disconnected (likely a refresh)
	const playerKey = `${roomId}:${playerId}`;
	if (recentDisconnects.has(playerKey)) {
		// Clear the reconnect timer since the player is reconnecting
		clearTimeout(recentDisconnects.get(playerKey)!.reconnectTimer);
		recentDisconnects.delete(playerKey);
		console.log(`Player ${playerId} reconnected to room ${roomId} (likely a refresh)`);
	}

	return produce(
		function start({ emit, lock }) {
			console.log(
				`Client ${clientId} (${clientAddress}) connected to room ${roomId} as player ${playerId}`
			);

			// Register this client in our connection tracking
			connectedClients.set(clientId, {
				roomId,
				playerId,
				lastActive: Date.now()
			});

			// Send initial room state
			const initialEvent = {
				type: 'roomUpdate',
				data: {
					room
				},
				timestamp: Date.now()
			};

			emit('message', JSON.stringify(initialEvent));

			// Send recent events
			const events = roomEvents.get(roomId) || [];
			for (const event of events.slice(-10)) {
				// Send the last 10 events
				emit('message', JSON.stringify(event));
			}

			// Register an emitter function to receive room events
			const unregister = registerEmitter((eventRoomId, event) => {
				// Only handle events for this room
				if (eventRoomId === roomId) {
					// For error events, only send if they are for all players or specifically this player
					if (event.type === 'error' && event.data.playerId && event.data.playerId !== playerId) {
						return; // Skip this error, it's for another player
					}

					const { error } = emit('message', JSON.stringify(event));
					if (error) {
						// Client disconnected, clean up
						connectedClients.delete(clientId);
						// Signal to stop the stream
						lock.set(false);
					}
				}
			});

			// Return cleanup function when connection closes
			return function stop() {
				console.log(`Client ${clientId} disconnected from room ${roomId}`);
				connectedClients.delete(clientId);
				unregister(); // Unregister the emitter

				// Create a key for tracking this player's disconnect
				const playerKey = `${roomId}:${playerId}`;

				// Check if player has any other active connections
				let playerHasConnection = false;
				connectedClients.forEach((client) => {
					if (client.playerId === playerId && client.roomId === roomId) {
						playerHasConnection = true;
					}
				});

				// If player has no other connections, schedule removal with a timeout
				if (!playerHasConnection) {
					console.log(`Starting reconnect timer for ${playerId} in room ${roomId}`);

					// Create a two-phase timeout:
					// 1. Short timeout (5 seconds) for normal browser refreshes
					// 2. Longer timeout (additional 25 seconds) for network issues

					// Store the player in recent disconnects with a reconnect timer
					const reconnectTimer = setTimeout(() => {
						// If we reach this point, the player hasn't reconnected within 5 seconds
						console.log(
							`Short timeout expired for ${playerId}, waiting longer for potential reconnect`
						);

						// Set a longer timeout for network issues (additional 25 seconds)
						const finalTimer = setTimeout(() => {
							// Remove from recent disconnects since we're handling it now
							recentDisconnects.delete(playerKey);

							// Final check if player is still in the room but has no active connections
							const room = rooms.get(roomId);
							if (room && room.players.find((p) => p.id === playerId)) {
								// Double-check no connections exist (in case map was modified between timeouts)
								let stillHasConnection = false;
								connectedClients.forEach((client) => {
									if (client.playerId === playerId && client.roomId === roomId) {
										stillHasConnection = true;
									}
								});

								if (!stillHasConnection) {
									console.log(
										`Removing inactive player ${playerId} from room ${roomId} after timeout`
									);
									removePlayerFromRoom(roomId, playerId);

									// Broadcast a system message about the automatic removal
									if (room.players.length > 0) {
										broadcastErrorToRoom(roomId, `${player.name} 因长时间未连接而被移出房间`, {
											errorCode: 'player_timeout'
										});
									}
								}
							}
						}, 25000); // Additional 25 seconds for network issues (total 30 seconds)

						// Update the timer reference
						recentDisconnects.set(playerKey, {
							timestamp: Date.now(),
							reconnectTimer: finalTimer
						});
					}, 5000); // Initial 5 seconds for browser refreshes

					// Store the initial timer
					recentDisconnects.set(playerKey, {
						timestamp: Date.now(),
						reconnectTimer
					});
				}
			};
		},
		{
			// Configure ping mechanism to detect disconnections
			ping: 30000, // Ping every 30 seconds
			stop() {
				console.log(`Connection to ${clientId} stopped.`);
				// Any additional cleanup can go here
			}
		}
	);
};
