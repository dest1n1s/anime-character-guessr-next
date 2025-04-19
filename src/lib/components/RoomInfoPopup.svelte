<script lang="ts">
	let { roomName, isPrivate, onClose, onSave } = $props();

	let name = $state(roomName);
	let roomPrivate = $state(isPrivate);
	let errorMessage = $state('');

	function handleSave() {
		if (!name.trim()) {
			errorMessage = '房间名称不能为空';
			return;
		}

		if (name.length > 50) {
			errorMessage = '房间名称不能超过50个字符';
			return;
		}

		onSave(name.trim(), roomPrivate);
		onClose();
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	onclick={(e) => e.target === e.currentTarget && onClose()}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
		<h2 class="mb-4 text-xl font-semibold text-gray-800">房间设置</h2>

		<div class="mb-4">
			<label for="room-name" class="mb-1 block text-sm font-medium text-gray-700">房间名称</label>
			<input
				id="room-name"
				type="text"
				bind:value={name}
				class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
				placeholder="输入房间名称"
				maxlength="50"
			/>
		</div>

		<div class="mb-6 flex items-center">
			<input
				id="room-private"
				type="checkbox"
				bind:checked={roomPrivate}
				class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
			/>
			<label for="room-private" class="ml-2 block text-sm text-gray-700">
				私密房间（不在房间列表中显示）
			</label>
		</div>

		{#if errorMessage}
			<div class="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
				{errorMessage}
			</div>
		{/if}

		<div class="flex justify-end gap-2">
			<button
				class="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-200"
				onclick={onClose}
			>
				取消
			</button>
			<button
				class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
				onclick={handleSave}
			>
				保存
			</button>
		</div>
	</div>
</div>
