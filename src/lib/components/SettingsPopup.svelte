<script lang="ts">
  import { onMount } from 'svelte';
  import type { GameSettings, Subject } from '$lib/types';
  import { searchSubjects } from '$lib/api';
  
  interface Props {
    gameSettings: GameSettings;
    onSettingsChange: (setting: string, value: any) => void;
    onClose: () => void;
    onRestart: () => void;
    hideRestart?: boolean;
  }

  let {
    gameSettings,
    onSettingsChange,
    onClose,
    onRestart,
    hideRestart = false
  }: Props = $props();
  
  let searchQuery = $state('');
  let searchResults: Subject[] = $state([]);
  let isSearching = $state(false);
  
  // Handle setting changes
  function handleNumberChange(setting: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value);
    if (!isNaN(value)) {
      onSettingsChange(setting, value);
    }
  }
  
  function handleBooleanChange(setting: string, event: Event) {
    const target = event.target as HTMLInputElement;
    onSettingsChange(setting, target.checked);
  }
  
  // Search for subjects
  async function handleSearch() {
    if (!searchQuery.trim()) return;
    
    isSearching = true;
    try {
      const results = await searchSubjects(searchQuery.trim());
      searchResults = results;
    } catch (error) {
      console.error('Subject search failed:', error);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }
  
  // Handle adding a subject to the settings
  function handleAddSubject(subject: Subject) {
    if (!gameSettings.addedSubjects.some(s => s.id === subject.id)) {
      onSettingsChange('addedSubjects', [...gameSettings.addedSubjects, subject]);
    }
    searchResults = [];
    searchQuery = '';
  }
  
  // Handle removing a subject from the settings
  function handleRemoveSubject(id: number) {
    onSettingsChange('addedSubjects', gameSettings.addedSubjects.filter(s => s.id !== id));
  }
  
  // Apply preset settings
  function applyPreset(preset: 'easy' | 'medium' | 'hard') {
    switch (preset) {
      case 'easy':
        onSettingsChange('startYear', new Date().getFullYear() - 5);
        onSettingsChange('topNSubjects', 100);
        onSettingsChange('maxAttempts', 15);
        onSettingsChange('enableHints', true);
        onSettingsChange('timeLimit', null);
        break;
      case 'medium':
        onSettingsChange('startYear', new Date().getFullYear() - 10);
        onSettingsChange('topNSubjects', 50);
        onSettingsChange('maxAttempts', 10);
        onSettingsChange('enableHints', true);
        onSettingsChange('timeLimit', null);
        break;
      case 'hard':
        onSettingsChange('startYear', 2000);
        onSettingsChange('topNSubjects', 20);
        onSettingsChange('maxAttempts', 6);
        onSettingsChange('enableHints', false);
        onSettingsChange('timeLimit', 120);
        break;
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
      <h2 class="text-2xl font-bold text-gray-800">游戏设置</h2>
    </div>
    
    <div class="grid gap-6 md:grid-cols-2">
      <div class="space-y-4 rounded-lg bg-gray-50 p-4">
        <h3 class="text-lg font-semibold text-gray-800">预设难度</h3>
        <div class="flex gap-2">
          <button
            class="rounded-lg bg-green-100 px-4 py-2 text-green-800 hover:bg-green-200"
            onclick={() => applyPreset('easy')}
          >
            简单
          </button>
          <button
            class="rounded-lg bg-blue-100 px-4 py-2 text-blue-800 hover:bg-blue-200"
            onclick={() => applyPreset('medium')}
          >
            普通
          </button>
          <button
            class="rounded-lg bg-red-100 px-4 py-2 text-red-800 hover:bg-red-200"
            onclick={() => applyPreset('hard')}
          >
            困难
          </button>
        </div>
        
        <h3 class="mt-4 text-lg font-semibold text-gray-800">角色数据范围</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label for="startYear" class="text-sm font-medium text-gray-700">开始年份:</label>
            <input
              id="startYear"
              type="number"
              min="1990"
              max={new Date().getFullYear()}
              value={gameSettings.startYear}
              onchange={(e) => handleNumberChange('startYear', e)}
              class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <label for="endYear" class="text-sm font-medium text-gray-700">结束年份:</label>
            <input
              id="endYear"
              type="number"
              min="1990"
              max={new Date().getFullYear()}
              value={gameSettings.endYear}
              onchange={(e) => handleNumberChange('endYear', e)}
              class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <label for="topNSubjects" class="text-sm font-medium text-gray-700">只包含热门作品:</label>
            <input
              id="topNSubjects"
              type="number"
              min="10"
              max="200"
              value={gameSettings.topNSubjects}
              onchange={(e) => handleNumberChange('topNSubjects', e)}
              class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <label for="characterNum" class="text-sm font-medium text-gray-700">每作品角色数限制:</label>
            <input
              id="characterNum"
              type="number"
              min="1"
              max="20"
              value={gameSettings.characterNum}
              onchange={(e) => handleNumberChange('characterNum', e)}
              class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          
          <div class="flex items-center">
            <input
              type="checkbox"
              id="mainCharacterOnly"
              checked={gameSettings.mainCharacterOnly}
              onchange={(e) => handleBooleanChange('mainCharacterOnly', e)}
              class="mr-2 h-4 w-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="mainCharacterOnly" class="text-sm font-medium text-gray-700">只包含主角</label>
          </div>
          
          <div class="flex items-center">
            <input
              type="checkbox"
              id="includeGame"
              checked={gameSettings.includeGame}
              onchange={(e) => handleBooleanChange('includeGame', e)}
              class="mr-2 h-4 w-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="includeGame" class="text-sm font-medium text-gray-700">包含游戏角色</label>
          </div>
        </div>
      </div>
      
      <div class="space-y-4 rounded-lg bg-gray-50 p-4">
        <h3 class="text-lg font-semibold text-gray-800">游戏规则</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label for="maxAttempts" class="text-sm font-medium text-gray-700">最大猜测次数:</label>
            <input
              id="maxAttempts"
              type="number"
              min="1"
              max="20"
              value={gameSettings.maxAttempts}
              onchange={(e) => handleNumberChange('maxAttempts', e)}
              class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <label for="timeLimit" class="text-sm font-medium text-gray-700">时间限制 (秒):</label>
            <input
              id="timeLimit"
              type="number"
              min="0"
              max="600"
              value={gameSettings.timeLimit === null ? 0 : gameSettings.timeLimit}
              onchange={(e) => {
                const value = parseInt((e.target as HTMLInputElement).value);
                onSettingsChange('timeLimit', value <= 0 ? null : value);
              }}
              class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          
          <div class="flex items-center">
            <input
              type="checkbox"
              id="enableHints"
              checked={gameSettings.enableHints}
              onchange={(e) => handleBooleanChange('enableHints', e)}
              class="mr-2 h-4 w-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="enableHints" class="text-sm font-medium text-gray-700">启用提示</label>
          </div>
          
          <div class="flex items-center">
            <input
              type="checkbox"
              id="subjectSearch"
              checked={gameSettings.subjectSearch}
              onchange={(e) => handleBooleanChange('subjectSearch', e)}
              class="mr-2 h-4 w-4 rounded-sm border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="subjectSearch" class="text-sm font-medium text-gray-700">允许通过作品搜索</label>
          </div>
          
          <h3 class="mt-4 text-lg font-semibold text-gray-800">添加特定作品</h3>
          <div class="space-y-2">
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="搜索作品名称..."
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                class="rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                onclick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
              >
                {isSearching ? '搜索中...' : '搜索'}
              </button>
            </div>
            
            {#if searchResults.length > 0}
              <div class="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
                {#each searchResults as subject}
                  <button
                    class="flex cursor-pointer items-center justify-between border-b border-gray-100 p-2 hover:bg-gray-50"
                    onclick={() => handleAddSubject(subject)}
                  >
                    <div>
                      <div class="font-medium">{subject.name}</div>
                      <div class="text-sm text-gray-500">{subject.name_cn}</div>
                    </div>
                    <div class="text-xs text-primary-600">{subject.type}</div>
                  </button>
                {/each}
              </div>
            {/if}
            
            {#if gameSettings.addedSubjects.length > 0}
              <div class="mt-3">
                <h4 class="mb-2 text-sm font-medium text-gray-700">已添加作品:</h4>
                <div class="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
                  {#each gameSettings.addedSubjects as subject}
                    <div class="flex items-center justify-between border-b border-gray-100 p-2">
                      <div>
                        <div class="font-medium">{subject.name}</div>
                        <div class="text-sm text-gray-500">{subject.name_cn}</div>
                      </div>
                      <button
                        class="rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                        onclick={() => handleRemoveSubject(subject.id)}
                        aria-label="移除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                          <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-6 flex justify-end gap-3">
      {#if !hideRestart}
        <button
          class="rounded-md bg-primary-600 px-6 py-2 text-white hover:bg-primary-700"
          onclick={onRestart}
        >
          应用并重新开始
        </button>
      {/if}
      <button
        class="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
        onclick={onClose}
      >
        关闭
      </button>
    </div>
  </div>
</div> 