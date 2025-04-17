<script lang="ts">
  import { onMount } from 'svelte';
  let roomCount = $state(0);
  
  onMount(async () => {
    try {
      const response = await fetch('/api/room-count');
      const data = await response.json();
      roomCount = data.count;
    } catch (error) {
      console.error('Error fetching room count:', error);
    }
  });
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 p-6">
  <h1 class="mb-12 text-4xl font-bold text-gray-800">动漫角色猜猜乐</h1>
  
  <div class="flex flex-wrap gap-6">
    <a 
      href="/singleplayer" 
      class="flex h-64 w-72 flex-col items-center justify-center rounded-xl bg-white p-6 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
    >
      <h2 class="mb-4 text-2xl font-bold text-primary-600">单人</h2>
      <p class="text-center text-gray-600">与AI对战，看看你能否猜出更多角色。</p>
      <div class="mt-4 text-sm text-gray-500">并非不会卡😅</div>
    </a>
    
    <a 
      href="/multiplayer" 
      class="flex h-64 w-72 flex-col items-center justify-center rounded-xl bg-white p-6 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
    >
      <h2 class="mb-4 text-2xl font-bold text-primary-600">多人</h2>
      <p class="text-center text-gray-600">与朋友一起比赛，看谁能最快猜出角色。</p>
      <div class="mt-4 text-sm text-gray-500">当前房间数: {roomCount}/259</div>
    </a>
  </div>
  
  <footer class="mt-12 max-w-2xl text-center text-sm text-gray-600">
    <p>
      一个猜动漫角色的游戏,
      建议使用桌面端浏览器游玩。
      <br/>
      灵感来源<a href="https://blast.tv/counter-strikle" class="text-primary-600 hover:underline">BLAST.tv</a>,
      数据来源<a href="https://bgm.tv/" class="text-primary-600 hover:underline">Bangumi</a>。
      <br/>
      <a href="https://space.bilibili.com/87983557" class="text-primary-600 hover:underline">作者</a>："实在对不起了大家，详情见……没有详情了，由于我制作网站时缺乏考虑，给bangumi带来了很大的负担。
      <br/>
      他们的管理员也很头大，所以我会暂时关闭网站，直到完成优化方案。感谢大家这段时间的热情和支持。"
    </p>
  </footer>
</div>
