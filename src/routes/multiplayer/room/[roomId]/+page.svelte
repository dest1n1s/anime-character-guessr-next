<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Room, Player, GameEvent, Character, GuessData, GameSettings } from '$lib/types';
	import { source } from 'sveltekit-sse';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import GuessesTable from '$lib/components/GuessesTable.svelte';
	import AllGuessesTable from '$lib/components/AllGuessesTable.svelte';
	import GameEndPopup from '$lib/components/GameEndPopup.svelte';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import SettingsPopup from '$lib/components/SettingsPopup.svelte';
	import RoomInfoPopup from '$lib/components/RoomInfoPopup.svelte';
	import { defaultGameSettings, gameSettings } from '$lib/store';

	let { data } = $props();

	// Game state
	let room: Room | null = $state(null);
	let currentPlayer: Player | null = $state(null);
	let connection: ReturnType<typeof source> | null = $state(null);
	let guesses: GuessData[] = $derived((currentPlayer as unknown as Player)?.guesses || []);
	let answerCharacter: Character | null = $state(null);
	let isGuessing = $state(false);
	let showGameEndPopup = $state(false);
	let gameResult: 'win' | 'lose' = $state('lose');
	let isConnected = $state(false);
	let doReconnect = $state(true);
	let roundTimeLeft = $state(0);
	let errorMessage = $state('');
	let showSettingsPopup = $state(false);
	let showRoomInfoPopup = $state(false);
	let notifications: {
		message: string;
		id: number;
		type: 'join' | 'leave' | 'ready' | 'unready' | 'info' | 'error';
	}[] = $state([]);
	let notificationCounter = 0;
	let isSyncing = $state(false);

	// Sticky search bar state
	let searchBarElement: HTMLElement | null = $state(null);
	let searchBarSticky = $state(false);
	let searchBarHeight = $state(0);
	let searchBarOffsetTop = $state(0);

	// Function to update search bar measurements
	function updateSearchBarMeasurements() {
		if (!searchBarElement || !browser) return;

		// Get the current position of the search bar
		const rect = searchBarElement.getBoundingClientRect();
		searchBarOffsetTop = rect.top + window.scrollY;
		searchBarHeight = searchBarElement.offsetHeight;

		// Update sticky state based on current scroll position
		updateSearchBarStickyState();
	}

	// Function to update the sticky state based on scroll position
	function updateSearchBarStickyState() {
		if (!browser) return;
		searchBarSticky = window.scrollY > searchBarOffsetTop;
	}

	// Window event handlers
	function handleWindowScroll() {
		updateSearchBarStickyState();
	}

	function handleWindowResize() {
		updateSearchBarMeasurements();
	}

	// BeforeUnload handler
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (room) {
			// Try to notify the server that the player is leaving
			try {
				// Use sendBeacon which is designed for this use case and works better
				// than fetch for beforeunload events
				navigator.sendBeacon(
					`/api/multiplayer/rooms/${room.id}/leave`,
					'refresh=true' // Indicate this is a refresh, not a genuine leave
				);
			} catch (error) {
				console.error('Error sending leave beacon:', error);
			}
		}
	}

	function getPlayerDisplayName(player?: Player): string {
		const id = player?.id;
		if ($gameSettings.streamerMode && id !== data.playerId) {
			const index = room?.players.findIndex((p) => p.id === id);
			if (index !== undefined) {
				return `玩家 ${index + 1}`;
			} else {
				return '未知玩家';
			}
		}
		return player?.name || '未知玩家';
	}

	onMount(async () => {
		if (browser) {
			console.log('playerId', data.playerId);
			if (!data.playerId) {
				// No player ID, redirect to multiplayer page
				goto('/multiplayer');
				return;
			}

			// Connect to the SSE endpoint using sveltekit-sse
			connectToEventSource();

			// Initial setup with a small delay to ensure DOM is fully rendered
			setTimeout(updateSearchBarMeasurements, 500);

			// Also update measurements when room data changes
			$effect(() => {
				if (room) {
					setTimeout(updateSearchBarMeasurements, 300);
				}
			});
		}
	});

	onDestroy(() => {
		// Close the SSE connection
		if (connection) {
			connection.close();
		}
	});

	function connectToEventSource() {
		const roomId = $page.params.roomId;

		// Create a new SSE connection using sveltekit-sse
		connection = source(`/api/multiplayer/events/${roomId}`, {
			open() {
				console.log('SSE connection opened');
				isConnected = true;
			},
			error(error) {
				console.error('SSE error:', error);
				isConnected = false;
			},
			close({ connect }) {
				console.log('SSE connection closed.' + (doReconnect ? ' Attempting to reconnect...' : ''));
				isConnected = false;
				if (doReconnect) {
					// Attempt to reconnect after a delay
					setTimeout(() => {
						connect();
					}, 1000);
				}
			},
			cache: false
		});

		// Subscribe to 'message' events
		const messageStream = connection.select('message');

		// Parse JSON messages and handle them
		const events = messageStream.json((options) => {
			console.error('Error parsing JSON:', options.error);
			return null; // Return null or a default value on error
		});

		// Set up subscription to events
		events.subscribe((event: GameEvent | null) => {
			if (event) {
				handleGameEvent(event);
			}
		});
	}

	function handleGameEvent(event: GameEvent): void {
		console.log('Game event:', event);

		switch (event.type) {
			case 'roomUpdate':
				// Check if this is a response to a manual sync request
				if (event.data.source === 'manual_sync') {
					// Display a notification if the sync is specifically for this player or for all players
					if (!event.data.targetPlayer || event.data.targetPlayer === data.playerId) {
						// Update the syncing state
						isSyncing = false;

						// Show notification
						showNotification('房间数据已同步', 'info');
					}
				} else if (event.data.source === 'settings_update') {
					// Show a notification about the setting update
					const settingKey = event.data.updatedSetting;
					if (settingKey) {
						let settingName = '';
						switch (settingKey) {
							case 'totalRounds':
								settingName = '总回合数';
								break;
							case 'maxAttempts':
								settingName = '最大猜测次数';
								break;
							case 'timeLimit':
								settingName = '时间限制';
								break;
							case 'startYear':
								settingName = '开始年份';
								break;
							case 'endYear':
								settingName = '结束年份';
								break;
							case 'topNSubjects':
								settingName = '热门作品数';
								break;
							case 'characterNum':
								settingName = '每作品角色数';
								break;
							case 'mainCharacterOnly':
								settingName = '只包含主角';
								break;
							default:
								settingName = settingKey;
						}

						showNotification(`游戏设置已更新: ${settingName}`, 'info');
					} else {
						showNotification('游戏设置已更新', 'info');
					}
				}

				// Update room state based on the event data
				if (event.data.room) {
					room = event.data.room;

					// Make sure currentPlayer is updated
					currentPlayer = room?.players.find((p) => p.id === data.playerId) || null;

					// Update time remaining if available
					if (room && room.gameState.timeRemaining !== null) {
						roundTimeLeft = room.gameState.timeRemaining;
					}
				}
				break;

			case 'gameStart':
				// Game started, reset game state
				guesses = [];
				answerCharacter = null;
				showNotification(
					'游戏开始！每个玩家有 ' + room?.settings.maxAttempts + ' 次猜测机会',
					'info'
				);
				break;

			case 'roundStart':
				// New round started
				guesses = [];
				answerCharacter = null;
				roundTimeLeft = room?.gameState.timeRemaining || room?.settings.timeLimit || 60;
				showNotification(`第 ${event.data.round}/${event.data.totalRounds} 回合开始！`, 'info');
				break;

			case 'roundEnd':
				// Round ended
				answerCharacter = event.data.answer;
				showGameEndPopup = true;

				// Determine round result based on winner
				if (event.data.winner === data.playerId) {
					gameResult = 'win';
					showNotification('恭喜你猜对了！', 'ready');
				} else if (event.data.winner) {
					gameResult = 'lose';
					const winner = room?.players.find((p) => p.id === event.data.winner);
					// Someone else won the round
					showNotification(`${getPlayerDisplayName(winner)} 猜对了答案`, 'info');
				} else {
					gameResult = 'lose';
					// No winner (all out of guesses)
					showNotification('回合结束，没有玩家猜对答案', 'info');
				}

				// If current player is host, show button to start next round
				if (currentPlayer?.isHost) {
					if (room && room.currentRound >= room.totalRounds) {
						// All rounds completed, end the game
						endGame();
					}
				}
				break;

			case 'gameEnd':
				// Determine game result based on winner
				if (event.data.winner === data.playerId) {
					showNotification('恭喜你赢得了游戏！', 'ready');
				} else if (event.data.winner) {
					// Someone else won
					const winner = room?.players.find((p) => p.id === event.data.winner);
					showNotification(`${getPlayerDisplayName(winner)} 赢得了游戏！`, 'info');
				} else {
					showNotification('游戏结束，没有玩家获胜（平局）', 'info');
				}
				break;

			case 'playerGuessed':
				// Another player made a guess
				if (event.data.playerId !== data.playerId) {
					// Show notification that another player has guessed
					const remainingText =
						event.data.guessesRemaining !== undefined
							? `，剩余 ${event.data.guessesRemaining} 次猜测机会`
							: '';
					const player = room?.players.find((p) => p.id === event.data.playerId);
					showNotification(`${getPlayerDisplayName(player)} 进行了猜测${remainingText}`, 'info');
				} else {
					// This is our own guess, update our local guesses
					guesses = [...guesses, event.data.guess];
				}
				break;

			case 'playerJoined':
				// A new player has joined the room
				if (room && event.data.player) {
					// Make sure the player isn't already in our list
					if (!room.players.some((p) => p.id === event.data.player.id)) {
						room.players = [...room.players, event.data.player];

						// Show notification
						showNotification(`${getPlayerDisplayName(event.data.player)} 加入了房间`, 'join');
					}
				}
				break;

			case 'playerReady':
				// Update player ready status when a player gets ready
				if (room) {
					const player = room.players.find((p) => p.id === event.data.playerId);
					if (player) {
						player.isReady = true;

						// Show notification only if it's not the current player
						if (player.id !== data.playerId) {
							showNotification(`${getPlayerDisplayName(player)} 已准备`, 'ready');
						}
					}
				}
				break;

			case 'playerUnready':
				// Update player ready status when a player cancels ready
				if (room) {
					const player = room.players.find((p) => p.id === event.data.playerId);
					if (player) {
						player.isReady = false;

						// Show notification only if it's not the current player
						if (player.id !== data.playerId) {
							showNotification(`${getPlayerDisplayName(player)} 取消准备`, 'unready');
						}
					}
				}
				break;

			case 'playerLeft':
				// Handle a player leaving the room
				if (room && event.data.playerId) {
					// Find and remove the player from our list
					const playerIndex = room.players.findIndex((p) => p.id === event.data.playerId);
					if (playerIndex !== -1) {
						const playerName = getPlayerDisplayName(room.players[playerIndex]);
						room.players = room.players.filter((p) => p.id !== event.data.playerId);

						// Show notification
						showNotification(`${playerName} 离开了房间`, 'leave');
					}
				}
				break;

			case 'error':
				if (event.data.message) {
					showNotification(event.data.message, 'error');
				}

				if (event.data.redirect) {
					doReconnect = false;
					// Delay redirect to allow user to see the error message
					setTimeout(() => {
						goto(event.data.redirect);
					}, 2000);
				}
				break;
		}
	}

	// Function to start the next round (for host only)
	async function startNextRound() {
		if (!room || !currentPlayer?.isHost) return;

		try {
			const response = await fetch(`/api/multiplayer/rooms/${room.id}/play`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const data = await response.json();
				errorMessage = data.error || '开始下一回合失败，请稍后重试';
			} else {
				errorMessage = '';
			}
		} catch (error) {
			console.error('Error starting next round:', error);
			errorMessage = '开始下一回合失败，请稍后重试';
		}
	}

	// Function to end the game (for host only)
	async function endGame() {
		if (!room || !currentPlayer?.isHost) return;

		try {
			const response = await fetch(`/api/multiplayer/rooms/${room.id}/end-game`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const data = await response.json();
				errorMessage = data.error || '结束游戏失败，请稍后重试';
			} else {
				errorMessage = '';
			}
		} catch (error) {
			console.error('Error ending game:', error);
			errorMessage = '结束游戏失败，请稍后重试';
		}
	}

	// Function to handle giving up
	async function handleGiveUp() {
		if (!room || room.gameState.status !== 'playing') return;

		// Check if the player still has guesses left
		if (
			currentPlayer &&
			currentPlayer.guesses &&
			currentPlayer.guesses.length >= room.settings.maxAttempts
		) {
			showNotification('你已用完所有猜测机会', 'info');
			return;
		}

		// Ask for confirmation
		if (!confirm('确定要放弃本回合吗？这将消耗你所有的猜测机会。')) {
			return;
		}

		try {
			const response = await fetch(`/api/multiplayer/rooms/${room.id}/give-up`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const responseData = await response.json();

			if (response.ok) {
				showNotification('你已放弃本回合', 'info');
			} else {
				console.error('Give up error:', responseData.error);
				showNotification(responseData.error || '放弃失败', 'error');
			}
		} catch (error) {
			console.error('Error giving up:', error);
			showNotification('放弃失败，请重试', 'error');
		}
	}

	async function handleCharacterSelect(id: number) {
		if (isGuessing || !room || room.gameState.status !== 'playing') return;

		// Check if the player has used all their guesses
		if (
			currentPlayer &&
			currentPlayer.guesses &&
			currentPlayer.guesses.length >= room.settings.maxAttempts
		) {
			showNotification('你已用完所有猜测机会', 'info');
			return;
		}

		isGuessing = true;

		try {
			// Send guess to the server
			const response = await fetch(`/api/multiplayer/rooms/${room.id}/guess`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					characterId: id,
					playerId: data.playerId
				})
			});

			const responseData = await response.json();

			if (response.ok) {
				// The server will broadcast the guess event which will update the guesses
				// through the handleGameEvent function, so we don't need to add it manually
				// to the guesses array here

				// If this is the correct answer
				if (responseData.isCorrect) {
					showNotification('你猜对了！', 'ready');
					// If the game ends with this guess, the gameEnd event will handle it
				} else {
					// Wrong guess
					const remainingGuesses =
						room.settings.maxAttempts - (currentPlayer?.guesses?.length || 0);
					if (remainingGuesses > 0) {
						showNotification(`猜错了，你还有 ${remainingGuesses} 次猜测机会`, 'info');
					} else {
						showNotification('猜错了，你已用完所有猜测机会', 'info');
					}
				}
			} else {
				console.error('Guess error:', responseData.error);
				showNotification(responseData.error || '提交猜测失败', 'info');
			}
		} catch (error) {
			console.error('Error submitting guess:', error);
			showNotification('提交猜测失败，请重试', 'info');
		} finally {
			isGuessing = false;
		}
	}

	async function handleLeaveRoom() {
		try {
			if (room) {
				// Call the leave API before disconnecting
				await fetch(`/api/multiplayer/rooms/${room.id}/leave`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ refresh: false }) // Explicitly indicate this is not a refresh
				});
			}
		} catch (error) {
			console.error('Error leaving room:', error);
		} finally {
			doReconnect = false;
			// Close the SSE connection
			if (connection) {
				connection.close();
			}

			// Redirect to multiplayer page
			goto('/multiplayer');
		}
	}

	function handleCloseGameEnd() {
		showGameEndPopup = false;
	}

	function showNotification(
		message: string,
		type: 'join' | 'leave' | 'ready' | 'unready' | 'info' | 'error' = 'info'
	) {
		const notification = {
			message,
			id: notificationCounter++,
			type
		};
		notifications = [...notifications, notification];

		// Remove the notification after 5 seconds
		setTimeout(() => {
			notifications = notifications.filter((n) => n.id !== notification.id);
		}, 5000);
	}

	// Function to manually sync room data
	async function handleSyncRoom() {
		// Check if we're already syncing or if room is not available
		if (isSyncing || !room) return;

		// Set syncing state to show loading indicator
		isSyncing = true;

		// Send sync request to server
		fetch(`/api/multiplayer/rooms/${room.id}/sync`, {
			method: 'POST'
		})
			.then((response) => response.json())
			.then((data) => {
				if (!data.success) {
					// Handle errors
					showNotification(data.error || '同步失败', 'error');
					// Reset syncing state
					isSyncing = false;
				}
				// Success case is handled by the event stream
			})
			.catch((error) => {
				console.error('Sync error:', error);
				showNotification('同步请求失败', 'error');
				// Reset syncing state
				isSyncing = false;
			});
	}

	// Function to handle settings changes
	async function handleSettingsChange(settingKey: string, settingValue: any) {
		if (!room) return;

		try {
			// Update local store first for responsive UI
			if (room.settings && typeof settingKey === 'string') {
				// Create a new settings object with the updated property
				room.settings = {
					...room.settings,
					[settingKey]: settingValue
				};

				// Special case for totalRounds - update both properties
				if (settingKey === 'totalRounds') {
					room.totalRounds = settingValue;
				}

				// Update the global store settings
				gameSettings.update((currentSettings) => {
					return {
						...currentSettings,
						[settingKey]: settingValue
					};
				});

				// Save to localStorage for persistence between sessions
				if (browser) {
					// Get current settings from localStorage or use default
					const storedSettings = localStorage.getItem('gameSettings');
					const currentSettings = storedSettings ? JSON.parse(storedSettings) : defaultGameSettings;

					// Update the specific setting
					const updatedSettings = {
						...currentSettings,
						[settingKey]: settingValue
					};

					// Save back to localStorage
					localStorage.setItem('gameSettings', JSON.stringify(updatedSettings));
				}
			}

			// Then send to server
			const response = await fetch(`/api/multiplayer/rooms/${room.id}/settings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					key: settingKey,
					value: settingValue
				})
			});

			const data = await response.json();

			if (!response.ok) {
				console.error('Settings update error:', data.error);
				showNotification(data.error || '更新设置失败', 'error');
			}
		} catch (error) {
			console.error('Error updating settings:', error);
			showNotification('更新设置失败，请重试', 'error');
		}
	}

	// Handle settings button click
	function handleOpenSettings() {
		showSettingsPopup = true;
	}

	// Handle closing settings popup
	function handleCloseSettings() {
		showSettingsPopup = false;
	}

	// Handle room info button click
	function handleOpenRoomInfo() {
		showRoomInfoPopup = true;
	}

	// Handle closing room info popup
	function handleCloseRoomInfo() {
		showRoomInfoPopup = false;
	}

	// Function to handle room info changes
	async function handleRoomInfoChange(name: string, isPrivate: boolean) {
		if (!room) return;

		try {
			// Update local state first for responsive UI
			const oldName = room.name;
			const oldPrivate = room.private;

			// Only send request if values actually changed
			if (name === oldName && isPrivate === oldPrivate) {
				return;
			}

			// Update locally first
			room.name = name;
			room.private = isPrivate;

			// Send to server
			const response = await fetch(`/api/multiplayer/rooms/${room.id}/info`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name,
					isPrivate
				})
			});

			const data = await response.json();

			if (!response.ok) {
				// Revert changes on error
				room.name = oldName;
				room.private = oldPrivate;

				console.error('Room info update error:', data.error);
				showNotification(data.error || '更新房间信息失败', 'error');
			} else {
				showNotification('房间信息已更新', 'info');
			}
		} catch (error) {
			console.error('Error updating room info:', error);
			showNotification('更新房间信息失败，请重试', 'error');
		}
	}
</script>

<svelte:head>
	<title>游戏房间 - {room?.name || '加载中...'} | 动漫角色猜猜乐</title>
</svelte:head>

<div class="relative min-h-screen bg-linear-to-br from-gray-100 to-gray-200 p-6">
	<div class="absolute top-4 right-4 z-10">
		<SocialLinks
			onSettingsClick={currentPlayer?.isHost ? handleOpenSettings : () => {}}
			onHelpClick={() => {}}
		/>
	</div>

	<div class="mx-auto mt-16 max-w-7xl">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-800">房间：{room?.name || '加载中...'}</h1>
				<p class="text-gray-600">房间ID: {$page.params.roomId}</p>
			</div>

			<div class="flex items-center gap-3">
				<button
					class="cursor-pointer rounded-lg bg-blue-500 px-3 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
					onclick={handleSyncRoom}
					disabled={isSyncing}
				>
					<div class="flex items-center gap-1">
						{#if isSyncing}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-white"
							></div>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M21 2v6h-6"></path>
								<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
								<path d="M3 22v-6h6"></path>
								<path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
							</svg>
						{/if}
						同步
					</div>
				</button>

				{#if currentPlayer?.isHost}
					<button
						class="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
						onclick={handleOpenSettings}
					>
						设置
					</button>
					<button
						class="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
						onclick={handleOpenRoomInfo}
					>
						房间信息
					</button>
				{/if}

				<button
					class="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
					onclick={handleLeaveRoom}
				>
					离开房间
				</button>
			</div>
		</div>

		{#if !isConnected}
			<div class="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">连接中...请稍候</div>
		{/if}

		{#if room}
			<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
				<h2 class="mb-3 text-xl font-semibold text-gray-800">玩家 ({room.players.length}/8)</h2>

				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					{#each room.players as player}
						<div
							class="rounded-lg {player.id === data.playerId
								? 'border border-blue-200 bg-blue-50'
								: 'bg-gray-50'} p-3"
						>
							<div class="flex items-center justify-between">
								<span class="font-medium text-gray-800">{getPlayerDisplayName(player)}</span>
								{#if player.isHost}
									<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
										房主
									</span>
								{/if}
							</div>

							<div class="mt-1 text-sm text-gray-500">得分: {player.score}</div>

							{#if room.gameState.status === 'waiting'}
								<div class="mt-1 flex items-center">
									<span
										class={`h-2 w-2 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-gray-300'}`}
									></span>
									<span class="ml-1 text-xs text-gray-500"
										>{player.isReady ? '已准备' : '未准备'}</span
									>
								</div>
							{:else if room.gameState.status === 'playing'}
								<div class="mt-1 flex flex-col">
									<span class="text-xs text-gray-500">
										剩余猜测: {room.settings.maxAttempts - (player.guesses?.length || 0)}
									</span>
									{#if player.currentGuess}
										<span class="mt-1 text-xs text-blue-500">已提交猜测</span>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>

				{#if room.gameState.status === 'waiting' && currentPlayer && 'isHost' in currentPlayer && currentPlayer.isHost}
					<div class="mt-4 flex flex-col items-center">
						<button
							class="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
							onclick={async () => {
								try {
									if (room) {
										const response = await fetch(`/api/multiplayer/rooms/${room.id}/play`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json'
											}
										});

										if (!response.ok) {
											const data = await response.json();
											errorMessage = data.error || '开始游戏失败，请稍后重试';
										} else {
											errorMessage = '';
										}
									}
								} catch (error) {
									console.error('Error starting game:', error);
									errorMessage = '开始游戏失败，请稍后重试';
								}
							}}
							disabled={room.players.some((p) => !p.isHost && !p.isReady) ||
								room.players.length < 2}
						>
							开始游戏
						</button>
						{#if errorMessage}
							<p class="mt-2 text-sm text-red-600">{errorMessage}</p>
						{/if}
						{#if room.players.length < 2}
							<p class="mt-2 text-sm text-gray-600">需要至少2名玩家才能开始游戏</p>
						{:else if room.players.some((p) => !p.isHost && !p.isReady)}
							<p class="mt-2 text-sm text-gray-600">所有玩家准备就绪后才能开始游戏</p>
						{/if}
					</div>
				{:else if room.gameState.status === 'waiting' && currentPlayer && 'isReady' in currentPlayer && !currentPlayer.isReady}
					<div class="mt-4 flex flex-col items-center">
						<button
							class="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
							onclick={async () => {
								try {
									if (room) {
										const response = await fetch(`/api/multiplayer/rooms/${room.id}/ready`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json'
											}
										});

										if (!response.ok) {
											const data = await response.json();
											errorMessage = data.error || '准备失败，请稍后重试';
										} else {
											errorMessage = '';
										}
									}
								} catch (error) {
									console.error('Error marking ready:', error);
									errorMessage = '准备失败，请稍后重试';
								}
							}}
						>
							准备
						</button>
						{#if errorMessage}
							<p class="mt-2 text-sm text-red-600">{errorMessage}</p>
						{/if}
					</div>
				{:else if room.gameState.status === 'waiting' && currentPlayer && 'isReady' in currentPlayer && currentPlayer.isReady}
					<div class="mt-4 flex flex-col items-center">
						<button
							class="rounded-lg border border-blue-600 px-6 py-2 text-blue-600 transition-colors hover:bg-blue-50"
							onclick={async () => {
								try {
									if (room) {
										const response = await fetch(`/api/multiplayer/rooms/${room.id}/unready`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json'
											}
										});

										if (!response.ok) {
											const data = await response.json();
											errorMessage = data.error || '取消准备失败，请稍后重试';
										} else {
											errorMessage = '';
										}
									}
								} catch (error) {
									console.error('Error marking unready:', error);
									errorMessage = '取消准备失败，请稍后重试';
								}
							}}
						>
							取消准备
						</button>
						{#if errorMessage}
							<p class="mt-2 text-sm text-red-600">{errorMessage}</p>
						{/if}
					</div>
				{/if}
			</div>

			{#if room.gameState.status === 'playing'}
				<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-xl font-semibold text-gray-800">
								第 {room.currentRound}/{room.totalRounds} 回合
							</h2>
							<p class="text-gray-600">
								剩余猜测: {room.settings.maxAttempts -
									(currentPlayer && 'guesses' in currentPlayer ? currentPlayer.guesses.length : 0)} /
								{room.settings.maxAttempts}
							</p>
						</div>

						{#if roundTimeLeft > 0}
							<div class="rounded-full bg-blue-100 px-4 py-2 text-xl font-bold text-blue-800">
								{Math.floor(roundTimeLeft / 60)}:{(roundTimeLeft % 60).toString().padStart(2, '0')}
							</div>
						{/if}
					</div>

					<div class="mt-6" bind:this={searchBarElement}>
						<SearchBar
							onCharacterSelect={handleCharacterSelect}
							{isGuessing}
							gameEnd={room.gameState.status !== 'playing' ||
								(currentPlayer && 'guesses' in currentPlayer ? currentPlayer.guesses.length : 0) >=
									room.settings.maxAttempts}
							subjectSearch={true}
						/>

						{#if room.gameState.status === 'playing' && currentPlayer && 'guesses' in currentPlayer && currentPlayer.guesses.length < room.settings.maxAttempts}
							<div class="mt-4 flex justify-center">
								<button
									class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
									onclick={handleGiveUp}
								>
									放弃本回合
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Sticky search bar that appears when scrolling -->
				{#if searchBarSticky}
					<div
						class="fixed top-0 right-0 left-0 z-50 bg-white px-4 py-3 shadow-lg transition-all duration-300"
						style="transform: translateY({searchBarSticky
							? '0'
							: '-100%'}); opacity: {searchBarSticky ? '1' : '0'};"
						transition:fade={{ duration: 200 }}
					>
						<div class="mx-auto max-w-7xl">
							<div class="mb-2 flex items-center justify-between">
								<div class="text-sm font-medium text-gray-700">
									第 {room.currentRound}/{room.totalRounds} 回合 • 剩余猜测:
									{room.settings.maxAttempts -
										(currentPlayer && 'guesses' in currentPlayer
											? currentPlayer.guesses.length
											: 0)} /
									{room.settings.maxAttempts}
								</div>

								{#if roundTimeLeft > 0}
									<div class="rounded-full bg-blue-100 px-2 py-1 text-sm font-bold text-blue-800">
										{Math.floor(roundTimeLeft / 60)}:{(roundTimeLeft % 60)
											.toString()
											.padStart(2, '0')}
									</div>
								{/if}
							</div>

							<div class="flex items-center gap-3">
								<div class="flex-grow">
									<SearchBar
										onCharacterSelect={handleCharacterSelect}
										{isGuessing}
										gameEnd={room.gameState.status !== 'playing' ||
											(currentPlayer && 'guesses' in currentPlayer
												? currentPlayer.guesses.length
												: 0) >= room.settings.maxAttempts}
										subjectSearch={true}
									/>
								</div>

								{#if room.gameState.status === 'playing' && currentPlayer && 'guesses' in currentPlayer && currentPlayer.guesses.length < room.settings.maxAttempts}
									<div class="flex-shrink-0">
										<button
											class="rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
											onclick={handleGiveUp}
										>
											放弃本回合
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
					<!-- Add a spacer to prevent content jump when the bar becomes fixed -->
					<div style="height: {searchBarHeight}px;"></div>
				{/if}

				<!-- Display all players' guesses with limited info during gameplay -->
				<div class="mb-6">
					<AllGuessesTable
						players={room.players}
						currentPlayerId={data.playerId}
						gameStatus={room.gameState.status}
						getDisplayName={getPlayerDisplayName}
					/>
				</div>

				<!-- Display current player's guesses with detailed feedback -->
				{#if guesses.length > 0}
					<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
						<h3 class="mb-3 text-lg font-medium text-gray-700">你的猜测详情</h3>
						<GuessesTable {guesses} />
					</div>
				{/if}
			{:else if room.gameState.status === 'waiting'}
				<div class="rounded-lg bg-white p-6 shadow-md">
					<div class="text-center">
						<h2 class="text-xl font-semibold text-gray-800">等待游戏开始</h2>
						<p class="mt-2 text-gray-600">所有玩家准备就绪后，房主可以开始游戏</p>

						<div
							class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700"
						>
							<div class="flex items-center justify-between">
								<span>总回合数:</span>
								<span class="font-medium">{room.settings.totalRounds || room.totalRounds}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>每回合猜测次数:</span>
								<span class="font-medium">{room.settings.maxAttempts}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>时间限制:</span>
								<span class="font-medium">
									{room.settings.timeLimit
										? `${Math.floor(room.settings.timeLimit / 60)}分${room.settings.timeLimit % 60}秒`
										: '无限制'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span>角色年份范围:</span>
								<span class="font-medium">{room.settings.startYear}-{room.settings.endYear}</span>
							</div>
						</div>
					</div>
				</div>
			{:else if room.gameState.status === 'roundEnd'}
				<div class="rounded-lg bg-white p-6 shadow-md">
					<div class="text-center">
						<h2 class="text-xl font-semibold text-gray-800">回合结束</h2>
						<p class="mt-2 text-gray-600">
							当前回合: {room.currentRound}/{room.totalRounds}
						</p>

						{#if answerCharacter}
							<div class="mt-6 flex flex-col items-center">
								<h3 class="text-lg font-medium text-gray-700">答案是:</h3>
								<div class="mt-2 flex items-center space-x-4">
									{#if answerCharacter.icon}
										<img
											src={answerCharacter.icon}
											alt="角色"
											class="h-20 w-20 rounded-full object-cover"
										/>
									{/if}
									<div class="text-center">
										<div class="text-xl font-bold">{answerCharacter.name}</div>
										<div class="text-gray-600">{answerCharacter.nameCn}</div>
									</div>
								</div>
							</div>
						{/if}

						{#if currentPlayer && 'isHost' in currentPlayer && currentPlayer.isHost}
							<div class="mt-6">
								{#if room.currentRound < room.totalRounds}
									<button
										class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
										onclick={startNextRound}
									>
										开始下一回合
									</button>
								{:else}
									<button
										class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
										onclick={endGame}
									>
										结束游戏
									</button>
								{/if}
							</div>
							{#if errorMessage}
								<p class="mt-2 text-sm text-red-600">{errorMessage}</p>
							{/if}
						{:else}
							<p class="mt-4 text-gray-500 italic">等待房主开始下一回合...</p>
						{/if}
					</div>
				</div>

				<!-- Display all players' guesses with full details at round end -->
				<div class="mt-6">
					<AllGuessesTable
						players={room.players}
						currentPlayerId={data.playerId}
						gameStatus={room.gameState.status}
						getDisplayName={getPlayerDisplayName}
					/>
				</div>

				<!-- Display current player's guesses with detailed feedback -->
				{#if guesses.length > 0}
					<div class="mt-6 rounded-lg bg-white p-4 shadow-md">
						<h3 class="mb-3 text-lg font-medium text-gray-700">你的猜测详情</h3>
						<GuessesTable {guesses} />
					</div>
				{/if}
			{:else if room.gameState.status === 'gameEnd'}
				<div class="rounded-lg bg-white p-6 shadow-md">
					<div class="text-center">
						<h2 class="text-xl font-semibold text-gray-800">游戏结束</h2>
						<p class="mt-2 text-gray-600">最终得分</p>

						<div class="mx-auto mt-6 max-w-md">
							<table class="w-full border-collapse rounded-lg bg-gray-50">
								<thead>
									<tr>
										<th class="border-b p-2 text-left">玩家</th>
										<th class="border-b p-2 text-right">得分</th>
									</tr>
								</thead>
								<tbody>
									{#each [...room.players].sort((a, b) => b.score - a.score) as player}
										<tr class={player.id === data.playerId ? 'bg-blue-50' : ''}>
											<td class="border-b p-2">
												<span class="font-medium">
													{getPlayerDisplayName(player)}
												</span>
												{#if room.host === player.id}
													<span class="ml-2 text-xs text-blue-600">(房主)</span>
												{/if}
											</td>
											<td class="border-b p-2 text-right font-bold">{player.score}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<div
							class="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700"
						>
							<div class="flex items-center justify-between">
								<span>总回合数:</span>
								<span class="font-medium">{room.settings.totalRounds || room.totalRounds}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>每回合猜测次数:</span>
								<span class="font-medium">{room.settings.maxAttempts}</span>
							</div>
							<div class="flex items-center justify-between">
								<span>时间限制:</span>
								<span class="font-medium">
									{room.settings.timeLimit
										? `${Math.floor(room.settings.timeLimit / 60)}分${room.settings.timeLimit % 60}秒`
										: '无限制'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span>角色年份范围:</span>
								<span class="font-medium">{room.settings.startYear}-{room.settings.endYear}</span>
							</div>
						</div>

						{#if currentPlayer && 'isHost' in currentPlayer && currentPlayer.isHost}
							<div class="mt-6">
								<button
									class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
									onclick={async () => {
										try {
											if (room) {
												// Reset the room to waiting state
												const response = await fetch(`/api/multiplayer/rooms/${room.id}/reset`, {
													method: 'POST',
													headers: {
														'Content-Type': 'application/json'
													},
													body: JSON.stringify({
														// Pass the current settings to use for the new game
														settings: room.settings
													})
												});

												if (!response.ok) {
													const data = await response.json();
													errorMessage = data.error || '重置房间失败，请稍后重试';
												} else {
													errorMessage = '';
												}
											}
										} catch (error) {
											console.error('Error resetting room:', error);
											errorMessage = '重置房间失败，请稍后重试';
										}
									}}
								>
									开始新游戏
								</button>
							</div>
							{#if errorMessage}
								<p class="mt-2 text-sm text-red-600">{errorMessage}</p>
							{/if}
						{:else}
							<p class="mt-4 text-gray-500 italic">等待房主开始新的游戏...</p>
						{/if}
					</div>
				</div>

				{#if guesses.length > 0}
					<div class="mt-6">
						<GuessesTable {guesses} />
					</div>
				{/if}
			{/if}
		{:else}
			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="flex justify-center">
					<div
						class="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
					></div>
				</div>
				<p class="mt-4 text-center text-gray-600">加载房间信息...</p>
			</div>
		{/if}
	</div>
</div>

<svelte:window
	on:scroll={handleWindowScroll}
	on:resize={handleWindowResize}
	on:beforeunload={handleBeforeUnload}
/>

{#if notifications.length > 0}
	<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
		{#each notifications as notification (notification.id)}
			<div
				class={`animate-fade-in-out rounded-lg px-4 py-3 text-white shadow-lg transition-all duration-500 
					${
						notification.type === 'join'
							? 'bg-green-500'
							: notification.type === 'leave'
								? 'bg-red-500'
								: notification.type === 'ready'
									? 'bg-blue-500'
									: notification.type === 'unready'
										? 'bg-yellow-500'
										: notification.type === 'error'
											? 'bg-red-500'
											: 'bg-gray-500'
					}`}
				transition:fade={{ duration: 300 }}
			>
				<div class="flex items-center gap-2">
					{#if notification.type === 'join'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
							/>
						</svg>
					{:else if notification.type === 'leave'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
							/>
						</svg>
					{:else if notification.type === 'ready'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					{:else if notification.type === 'unready'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					{:else if notification.type === 'error'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 3.014-1.874 2.148-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
							/>
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					{/if}
					<span>{notification.message}</span>
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if showGameEndPopup && answerCharacter}
	<GameEndPopup result={gameResult} answer={answerCharacter} onClose={handleCloseGameEnd} />
{/if}

{#if showSettingsPopup && room}
	<SettingsPopup
		gameSettings={room.settings}
		onSettingsChange={handleSettingsChange}
		onClose={handleCloseSettings}
		onRestart={() => {}}
		hideRestart={room.gameState.status !== 'waiting'}
	/>
{/if}

{#if showRoomInfoPopup && room}
	<RoomInfoPopup
		roomName={room.name}
		isPrivate={room.private}
		onClose={handleCloseRoomInfo}
		onSave={handleRoomInfoChange}
	/>
{/if}
