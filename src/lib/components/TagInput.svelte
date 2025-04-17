<script lang="ts">
  // Define props with default value for tags
  let { tags = $bindable([]) } = $props<{
    tags: string[];
  }>();

  let inputValue = $state('');
  let error = $state('');
  
  const MAX_TAG_LENGTH = 8; // Maximum length for each tag
  const MAX_TAGS = 6; // Maximum number of tags allowed

  function addTag() {
    const trimmedValue = inputValue.trim();
    
    // Validate the input
    if (!trimmedValue) {
      error = '标签不能为空';
      return;
    }
    
    if (trimmedValue.length > MAX_TAG_LENGTH) {
      error = `标签最多${MAX_TAG_LENGTH}个字符`;
      return;
    }
    
    if (tags.includes(trimmedValue)) {
      error = '标签已存在';
      return;
    }
    
    if (tags.length >= MAX_TAGS) {
      error = `最多只能添加${MAX_TAGS}个标签`;
      return;
    }

    // Add the tag
    tags = [...tags, trimmedValue];
    inputValue = '';
    error = '';
  }

  function removeTag(tag: string) {
    tags = tags.filter((t: string) => t !== tag);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }
</script>

<div class="tag-input">
  <div class="mb-2">
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="输入标签后按回车 (最多8字符)"
        class="input w-full {error ? 'border-red-300 bg-red-50' : ''}"
        bind:value={inputValue}
        onkeydown={handleKeydown}
        maxlength={MAX_TAG_LENGTH}
        disabled={tags.length >= MAX_TAGS}
      />
      <button
        class="btn btn-primary"
        onclick={addTag}
        disabled={tags.length >= MAX_TAGS}
      >
        添加
      </button>
    </div>
    
    {#if error}
      <div class="mt-1 text-sm text-red-600">{error}</div>
    {/if}
    
    <div class="mt-1 text-sm text-gray-500">
      {tags.length}/{MAX_TAGS} 标签
    </div>
  </div>
  
  {#if tags.length > 0}
    <div class="flex flex-wrap gap-2 py-2">
      {#each tags as tag}
        <div class="flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-sm text-indigo-800">
          <span>{tag}</span>
          <button 
            class="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 hover:bg-indigo-300"
            onclick={() => removeTag(tag)}
            aria-label="移除标签"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="py-2 text-sm text-gray-500">没有标签</div>
  {/if}
</div> 