<script lang="ts">
	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	onclick={(e) => e.target === e.currentTarget && onClose()}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div
		class="relative max-h-[90vh] w-[90vw] max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
	>
		<div class="mb-4 border-b border-gray-200 pb-2">
			<h2 class="text-2xl font-bold text-gray-800">为什么我在这里？</h2>
		</div>

		<div class="prose prose-gray">
			<div class="help-text">
				<p>
					猜一个神秘动漫角色。搜索角色，然后做出猜测。<br />
					每次猜测后，你会获得你猜的角色的信息。<br />
					绿色高亮：正确或非常接近；黄色高亮：有点接近。<br />
					<br />
					有 bug 或者建议？欢迎在
					<a href="https://github.com/dest1n1s/anime-character-guessr-next/issues">
						Github Issue
					</a> 反馈。
				</p>
			</div>
		</div>
	</div>
</div>
