<script lang="ts">
	interface Props {
		onSettingsClick: () => void;
		onHelpClick: () => void;
	}

	let { onSettingsClick, onHelpClick }: Props = $props();
</script>

<div
	class="h-input rounded-9px border-border-input bg-background placeholder:text-foreground-alt/50 focus:ring-foreground focus:ring-offset-background inline-flex items-center gap-2 truncate border p-2 px-4 text-base shadow-xs backdrop-blur-xs transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none sm:text-sm"
>
	<div class="relative mr-2 hidden items-center gap-2 text-sm text-gray-600 md:flex">
		<span>太难了？调下难度</span>
		<div
			class="h-0 w-0 animate-bounce border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-gray-600"
		></div>
	</div>

	<button
		class="hover:text-primary-600 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
		onclick={onSettingsClick}
		aria-label="设置"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="h-5 w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
			/>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
			/>
		</svg>
	</button>

	<button
		class="hover:text-primary-600 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
		onclick={onHelpClick}
		aria-label="帮助"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="h-5 w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
			/>
		</svg>
	</button>

	<a
		href="https://bangumi.tv/"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:text-primary-600 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
		aria-label="Bangumi"
	>
		<img
			src="https://bangumi.tv/img/favicon.ico"
			alt="Bangumi"
			class="h-5 w-5 rounded-full transition-transform hover:scale-110"
		/>
	</a>

	<a
		href="https://github.com/dest1n1s/anime-character-guessr-next"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:text-primary-600 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
		aria-label="GitHub"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			fill="currentColor"
			viewBox="0 0 16 16"
		>
			<path
				d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
			/>
		</svg>
	</a>
</div>
