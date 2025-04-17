<script lang="ts">
  import { onMount } from 'svelte';
  import type { Character } from '$lib/types';
  import { submitCharacterTags, proposeCustomTags } from '$lib/api';
  
  let { character, onClose } = $props();
  
  let selectedTags = $state<string[]>([]);
  let customTags = $state<string[]>([]);
  let customTagInput = $state('');
  let inputError = $state('');
  let isSubmitting = $state(false);
  
  const MAX_TAGS = 6;
  const totalTags = $derived(selectedTags.length + customTags.length);
  
  const tagGroups = {
    '发色': ['黑发', '金发', '白发', '粉发', '红发', '蓝发', '紫发', '绿发', '双色发', '渐变发'],
    '发型': ['双马尾', '单马尾', '短发', '长发', '黑长直', '卷发', '丸子头', '呆毛'],
    '瞳色': ['红瞳', '蓝瞳', '金瞳', '紫瞳', '绿瞳', '异色瞳', '黑瞳', '茶色瞳'],
    '服饰': ['眼镜', '耳机', '面具', '发带', '项链', '制服', '和服'],
    '性格': ['傲娇', '天然呆', '元气', '温柔', '高冷', '腹黑', '中二', '病娇']
  };
  
  function handleTagClick(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else if (totalTags < MAX_TAGS) {
      selectedTags = [...selectedTags, tag];
    }
  }
  
  function handleCustomTagAdd() {
    const trimmedTag = customTagInput.trim();
    if (!trimmedTag) {
      inputError = '标签不能为空';
      return;
    }
    if (trimmedTag.length > 8) {
      inputError = '标签最多8个字符';
      return;
    }
    if (customTags.includes(trimmedTag)) {
      inputError = '标签已存在';
      return;
    }
    if (totalTags >= MAX_TAGS) {
      inputError = `最多只能添加${MAX_TAGS}个标签`;
      return;
    }
    
    customTags = [...customTags, trimmedTag];
    customTagInput = '';
    inputError = '';
  }
  
  function handleCustomTagRemove(tagToRemove: string) {
    customTags = customTags.filter(tag => tag !== tagToRemove);
  }
  
  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomTagAdd();
    }
  }
  
  async function handleSubmit() {
    try {
      isSubmitting = true;
      
      // Submit both selected and custom tags if they exist
      const submitPromises = [];
      
      if (selectedTags.length > 0) {
        submitPromises.push(submitCharacterTags(character.id, selectedTags));
      }
      
      if (customTags.length > 0) {
        submitPromises.push(proposeCustomTags(character.id, customTags));
      }
      
      await Promise.all(submitPromises);
      
      alert('感谢您的贡献！');
      onClose();
    } catch (error) {
      console.error('Error submitting tags:', error);
      alert('提交失败，请稍后重试');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div class="relative max-h-[90vh] w-[95vw] max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
    <button 
      class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
      onclick={onClose}
      aria-label="关闭"
    >
      ×
    </button>
    
    <div class="mb-4 border-b border-gray-200 pb-2">
      <h2 class="text-2xl font-bold text-gray-800">为 {character.nameCn} 贡献标签</h2>
    </div>
    
    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div class="md:col-span-1">
        <div class="character-preview rounded-lg bg-gray-50 p-4 shadow-xs">
          <img 
            src={character.image || '/images/no-image.jpg'} 
            alt={character.name} 
            class="mb-3 h-48 w-full rounded-lg object-cover shadow-xs"
          />
          
          <div class="mb-3">
            <div class="font-medium">{character.name}</div>
            <div class="text-lg font-semibold">{character.nameCn}</div>
          </div>
          
          <div class="text-sm text-gray-600">
            为角色贡献标签，帮助其他玩家更容易猜到TA。<br />
            请负责任地选择或添加，避免使用重复、无关或者过于稀有的标签。<br/>
            可以参考:萌娘百科角色页的"萌点"、Bangumi番剧页的标签，或者其他有助于过滤的属性。<br/>
            这些标签不用添加：[TV/剧场版/...][原创/漫画改/...][中国/日本/...][声优名字]<br/>
            每次最多可以贡献6个标签。<br/>
            现在是什么情况？这几天先收集一下投票，之后就会加入到游戏里。谢谢大家。
          </div>
        </div>
      </div>
      
      <div class="md:col-span-2">
        <div class="space-y-4">
          {#each Object.entries(tagGroups) as [groupName, tags]}
            <div class="tag-group">
              <h4 class="mb-2 font-medium text-gray-700">{groupName}</h4>
              <div class="flex flex-wrap gap-2">
                {#each tags as tag}
                  <button
                    class="rounded-md px-3 py-1 text-sm transition-colors {
                      selectedTags.includes(tag) 
                        ? 'bg-primary-100 text-primary-800 hover:bg-primary-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } {totalTags >= MAX_TAGS && !selectedTags.includes(tag) ? 'cursor-not-allowed opacity-50' : ''}"
                    onclick={() => handleTagClick(tag)}
                    disabled={totalTags >= MAX_TAGS && !selectedTags.includes(tag)}
                  >
                    {tag}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
          
          <div class="tag-group">
            <h4 class="mb-2 font-medium text-gray-700">自定义标签</h4>
            <div class="mb-2 flex gap-2">
              <input
                type="text"
                bind:value={customTagInput}
                onkeypress={handleKeyPress}
                placeholder="添加自定义标签（最多8字符）"
                maxlength={8}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm {inputError ? 'border-red-300 bg-red-50' : ''}"
                disabled={totalTags >= MAX_TAGS}
              />
              <button 
                class="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                onclick={handleCustomTagAdd}
                disabled={totalTags >= MAX_TAGS}
              >
                添加
              </button>
            </div>
            
            {#if inputError}
              <div class="mb-2 text-sm text-red-600">{inputError}</div>
            {/if}
            
            {#if customTags.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each customTags as tag}
                  <div class="flex items-center gap-1 rounded-md bg-primary-100 px-2 py-1 text-sm text-primary-800">
                    <span>{tag}</span>
                    <button 
                      class="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-200 text-primary-700 hover:bg-primary-300"
                      onclick={() => handleCustomTagRemove(tag)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-6 flex justify-end">
      <button 
        class="rounded-md bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={totalTags === 0 || isSubmitting}
        onclick={handleSubmit}
      >
        {isSubmitting ? '提交中...' : `提交标签 (${totalTags}/${MAX_TAGS})`}
      </button>
    </div>
  </div>
</div> 