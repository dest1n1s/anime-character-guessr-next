<script lang="ts">
  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div class="relative max-h-[90vh] w-[90vw] max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
    <button 
      class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
      onclick={onClose}
      aria-label="关闭"
    >
      ×
    </button>
    
    <div class="mb-4 border-b border-gray-200 pb-2">
      <h2 class="text-2xl font-bold text-gray-800">为什么我在这里？</h2>
    </div>
    
    <div class="prose prose-gray">
      <div class="help-text">
        <p>
          猜一个神秘动漫角色。搜索角色，然后做出猜测。<br/>
          每次猜测后，你会获得你猜的角色的信息。<br/>
          绿色高亮：正确或非常接近；黄色高亮：有点接近。<br/>
          <br/>
          有bug或者建议？欢迎B站私信我。
        </p>
      </div>
    </div>
  </div>
</div> 