# Anime Character Guessr (SvelteKit Version)

A fun game where you guess anime characters with increasing hints. Built with SvelteKit and powered by Bun.

## Features

- Search for anime characters or browse by anime/manga
- Get feedback on your guesses (popularity, appearances, ratings, etc.)
- Time limits and hint system
- Tag contribution system for the community

## Development

This project uses [Bun](https://bun.sh/) for faster performance and improved developer experience.

### Prerequisites

- Install Bun: `curl -fsSL https://bun.sh/install | bash`

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/anime-character-guessr.git
cd anime-character-guessr-sveltekit

# Install dependencies
bun install

# Start development server
bun run dev
```

### Building for production

```bash
# Build the app
bun run build

# Preview the built app
bun run preview
```

## API Endpoints

The game uses several API endpoints:

- `/api/search/characters` - Search for characters by keyword
- `/api/search/subjects` - Search for anime/manga by keyword
- `/api/subjects/[id]/characters` - Get characters from a specific anime/manga
- `/api/characters/random` - Get a random character for the game
- `/api/characters/[id]/appearances` - Get a character's appearances
- `/api/characters/[id]` - Get character details

## Data Source

Data is sourced from [Bangumi](https://bgm.tv/) API.

## License

MIT
