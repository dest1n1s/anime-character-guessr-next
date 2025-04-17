<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import HelpPopup from '$lib/components/HelpPopup.svelte';
	import SettingsPopup from '$lib/components/SettingsPopup.svelte';
	import { gameSettings } from '$lib/store';

	// UI state
	let showHelpPopup = $state(false);
	let showSettingsPopup = $state(false);
	let isCreatingRoom = $state(false);
	let isJoiningRoom = $state(false);
	let playerName = $state('');
	let roomId = $state('');
	let errorMessage = $state('');
	let rooms: { id: string; name: string; playerCount: number; status: string }[] = $state([]);

	onMount(() => {
		// Check local storage for existing game session
		if (browser) {
			playerName = localStorage.getItem('playerName') || '';

			const storageGameSettings = localStorage.getItem('gameSettings');

			if (storageGameSettings) {
				$gameSettings = JSON.parse(storageGameSettings);
			}

			// Get roomId from URL query parameter if available
			const urlRoomId = $page.url.searchParams.get('roomId');
			if (urlRoomId) {
				roomId = urlRoomId;
			}

			// Load available rooms
			loadRooms();
		}
	});

	async function loadRooms() {
		try {
			const response = await fetch('/api/multiplayer/rooms');
			const data = await response.json();
			rooms = data.rooms;
		} catch (error) {
			console.error('Error loading rooms:', error);
			errorMessage = '加载房间失败，请稍后重试';
		}
	}

	// Handle setting changes
	function handleSettingsChange(setting: string, value: any) {
		$gameSettings = {
			...$gameSettings,
			[setting]: value
		};

		if (browser) {
			localStorage.setItem('gameSettings', JSON.stringify($gameSettings));
		}
	}

	async function createRoom() {
		if (!playerName.trim()) {
			errorMessage = '请输入你的昵称';
			return;
		}

		isCreatingRoom = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/multiplayer/rooms', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					hostName: playerName.trim(),
					settings: $gameSettings
				})
			});

			const data = await response.json();

			if (response.ok) {
				if (browser) {
					localStorage.setItem('playerName', playerName.trim());
				}

				// Redirect to the room
				goto(`/multiplayer/room/${data.roomId}`);
			} else {
				errorMessage = data.error || '创建房间失败，请稍后重试';
			}
		} catch (error) {
			console.error('Error creating room:', error);
			errorMessage = '创建房间失败，请稍后重试';
		} finally {
			isCreatingRoom = false;
		}
	}

	async function joinRoom() {
		if (!roomId.trim()) {
			errorMessage = '请输入房间ID';
			return;
		}

		isJoiningRoom = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/multiplayer/rooms/${roomId.trim()}/join`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					playerName: playerName.trim()
				})
			});

			const data = await response.json();

			if (response.ok) {
				// Store the room and player info
				if (browser) {
					localStorage.setItem('playerName', playerName.trim());
				}

				// Redirect to the room
				goto(`/multiplayer/room/${roomId.trim()}`);
			} else {
				errorMessage = data.error || '加入房间失败，请稍后重试';
			}
		} catch (error) {
			console.error('Error joining room:', error);
			errorMessage = '加入房间失败，请稍后重试';
		} finally {
			isJoiningRoom = false;
		}
	}
</script>

<svelte:head>
	<title>多人游戏 | 动漫角色猜猜乐</title>
</svelte:head>

<div class="bg-linear-to-br relative min-h-screen from-gray-100 to-gray-200 p-6">
	<div class="absolute right-4 top-4 z-10">
		<SocialLinks
			onSettingsClick={() => (showSettingsPopup = true)}
			onHelpClick={() => (showHelpPopup = true)}
		/>
	</div>

	<div class="mx-auto mt-16 max-w-3xl">
		<h1 class="mb-8 text-center text-4xl font-bold text-gray-800">多人游戏</h1>

		<div class="mb-8 space-y-2">
			<div class="rounded-lg bg-white p-6 shadow-md">
				<h2 class="mb-4 text-xl font-semibold text-gray-800">输入你的昵称</h2>
				<div class="mb-4">
					<input
						type="text"
						bind:value={playerName}
						placeholder="昵称（最多20字符）"
						maxlength="20"
						class="focus:border-primary-500 focus:outline-hidden focus:ring-primary-500/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2"
					/>
				</div>

				<div class="mb-6 grid gap-x-8 gap-y-4 md:grid-cols-2">
					<div>
						<h3 class="mb-2 text-lg font-medium text-gray-700">创建新房间</h3>
						<button
							class="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
							onclick={createRoom}
							disabled={isCreatingRoom || isJoiningRoom}
						>
							{isCreatingRoom ? '创建中...' : '创建房间'}
						</button>
					</div>

					<div>
						<h3 class="mb-2 text-lg font-medium text-gray-700">加入房间</h3>
						<div class="flex flex-col gap-2">
							<input
								type="text"
								bind:value={roomId}
								placeholder="房间ID（6位）"
								maxlength="6"
								class="focus:border-primary-500 focus:outline-hidden focus:ring-primary-500/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2"
							/>
							<button
								class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
								onclick={joinRoom}
								disabled={isCreatingRoom || isJoiningRoom}
							>
								{isJoiningRoom ? '加入中...' : '加入'}
							</button>
						</div>
					</div>
				</div>

				{#if errorMessage}
					<div class="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
						{errorMessage}
					</div>
				{/if}
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold text-gray-800">可用房间 ({rooms.length})</h2>

			{#if rooms.length === 0}
				<p class="text-center text-gray-500">当前没有可用的房间，创建一个吧！</p>
			{:else}
				<div class="divide-y divide-gray-100">
					{#each rooms as room (room.id)}
						<div class="flex items-center justify-between p-3">
							<div>
								<span class="font-medium">{room.name}</span>
								<span class="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
									{room.playerCount} / 8 玩家
								</span>
								<span
									class="ml-2 rounded-full px-2 py-1 text-xs {room.status === 'waiting'
										? 'bg-green-100 text-green-700'
										: room.status === 'playing'
											? 'bg-yellow-100 text-yellow-700'
											: 'bg-gray-100 text-gray-600'}"
								>
									{room.status === 'waiting'
										? '等待中'
										: room.status === 'playing'
											? '游戏中'
											: room.status === 'roundEnd'
												? '回合结束'
												: '游戏结束'}
								</span>
							</div>

							<button
								class="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
								onclick={() => {
									roomId = room.id;
									joinRoom();
								}}
								disabled={room.status !== 'waiting' || isCreatingRoom || isJoiningRoom}
							>
								加入
							</button>
						</div>
					{/each}
				</div>
			{/if}
			<div class="mt-4 flex justify-center">
				<button
					class="cursor-pointer rounded-lg border border-blue-600 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
					onclick={loadRooms}
				>
					刷新列表
				</button>
			</div>
		</div>
	</div>
</div>

{#if showHelpPopup}
	<HelpPopup onClose={() => (showHelpPopup = false)} />
{/if}

{#if showSettingsPopup}
	<SettingsPopup
		gameSettings={$gameSettings}
		onSettingsChange={handleSettingsChange}
		onClose={() => (showSettingsPopup = false)}
		onRestart={() => (showSettingsPopup = false)}
	/>
{/if}
