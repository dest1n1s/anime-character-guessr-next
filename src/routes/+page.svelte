<script lang="ts">
	import { onMount } from 'svelte';
	let roomCount = $state(0);

	onMount(async () => {
		try {
			const rooms = await fetch('/api/multiplayer/rooms/room-count');
			const data = await rooms.json();
			roomCount = data.count;
		} catch (error) {
			console.error('Error fetching room count:', error);
		}
	});
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 p-6"
>
	<h1 class="mb-12 text-4xl font-bold text-gray-800">动漫角色猜猜乐</h1>

	<div class="flex flex-wrap gap-6">
		<a
			href="/singleplayer"
			class="flex h-64 w-72 flex-col items-center justify-center rounded-xl bg-white p-6 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
		>
			<h2 class="text-primary-600 mb-4 text-2xl font-bold">单人</h2>
			<p class="text-center text-gray-600">与AI对战，看看你能否猜出更多角色。</p>
		</a>

		<a
			href="/multiplayer"
			class="flex h-64 w-72 flex-col items-center justify-center rounded-xl bg-white p-6 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
		>
			<h2 class="text-primary-600 mb-4 text-2xl font-bold">多人</h2>
			<p class="text-center text-gray-600">与朋友一起比赛，看谁能最快猜出角色。</p>
			<div class="mt-4 text-sm text-gray-500">当前房间数: {roomCount}/259</div>
		</a>
	</div>

	<footer class="mt-12 max-w-2xl text-center text-sm text-gray-600">
		<p>
			一个猜动漫角色的游戏, 建议使用桌面端浏览器游玩。
			<br />
			灵感来源
			<a href="https://blast.tv/counter-strikle" class="text-primary-600 hover:underline">
				BLAST.tv
			</a>, 数据来源
			<a href="https://bgm.tv/" class="text-primary-600 hover:underline"> Bangumi </a>。
			<br />
			在
			<a href="https://space.bilibili.com/87983557" class="text-primary-600 hover:underline">
				@MagicWaterBee
			</a>
			制作的
			<a
				href="https://github.com/kennylimz/anime-character-guessr"
				class="text-primary-600 hover:underline">anime-character-guessr</a
			> 的基础上重构而成。欢迎游玩！
		</p>
	</footer>
</div>
