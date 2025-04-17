<script lang="ts">
  import { onMount } from 'svelte';
  import TagInput from '$lib/components/TagInput.svelte';
  import type { Character } from '$lib/types';
  import { submitTags } from '$lib/api';
  
  const { character } = $props<{
    character: Character;
  }>();
  
  let tags = $state<string[]>([]);
  let loading = $state(true);
  let error = $state('');
  let saving = $state(false);
  let saveSuccess = $state(false);
  
  $effect(() => {
    if (character) {
      loadTags();
    }
  });
  
  async function loadTags() {
    loading = true;
    error = '';
    
    try {
      if (character.tags) {
        tags = [...character.tags];
      } else {
        tags = [];
      }
    } catch (err) {
      error = 'Failed to load character tags';
      console.error(err);
    } finally {
      loading = false;
    }
  }
  
  async function saveTags() {
    if (!character) return;
    
    saving = true;
    error = '';
    saveSuccess = false;
    
    try {
      await submitTags(character.id, tags);
      saveSuccess = true;
    } catch (err) {
      error = 'Failed to save tags';
      console.error(err);
    } finally {
      saving = false;
    }
  }
</script>

<div class="w-full space-y-4 rounded-lg border p-4 shadow-xs">
  <h3 class="text-lg font-semibold">人物标签编辑</h3>
  
  {#if loading}
    <div class="flex justify-center py-4">
      <div class="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
    </div>
  {:else}
    <TagInput bind:tags />
    
    <div class="flex justify-end space-x-3">
      <button
        class="rounded-md border border-primary-600 px-4 py-2 text-primary-600 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={loadTags}
        disabled={saving}
      >
        重置
      </button>
      
      <button
        class="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={saveTags}
        disabled={saving}
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
    
    {#if error}
      <div class="rounded-md bg-red-50 p-3 text-red-800">
        {error}
      </div>
    {/if}
    
    {#if saveSuccess}
      <div class="rounded-md bg-green-50 p-3 text-green-800">
        标签保存成功！
      </div>
    {/if}
  {/if}
</div> 