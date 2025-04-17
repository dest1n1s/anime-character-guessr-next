# Anime Character Guessr Next (SvelteKit Version)

A fun game where you guess anime characters with increasing hints. Built with SvelteKit and powered by Bun.

## Features

- Search for anime characters or browse by anime
- Get feedback on your guesses (popularity, appearances, ratings, etc.)
- Caching data from Bangumi API using Redis
- Better multiplayer experience

## Development

This project uses [Bun](https://bun.sh/) for faster performance and improved developer experience.

### Prerequisites

- Install Bun: `curl -fsSL https://bun.sh/install | bash`

### Setup

```bash
# Clone the repository
git clone https://github.com/dest1n1/anime-character-guessr-next.git

# Install dependencies
bun install

# Start development server
bun run dev

# Optional: Run Redis server
docker compose up -d
```

### Building for production

```bash
# Build the app
bun run build

# Preview the built app
bun run preview

# Optional: Run Redis server
docker compose up -d
```

### Environment Variables

| Variable           | Description                              | Default                  |
| ------------------ | ---------------------------------------- | ------------------------ |
| `REDIS_URL`        | The URL of the Redis server              | `redis://localhost:6379` |
| `USE_REDIS_IN_DEV` | Whether to use Redis in development mode | `false`                  |

## Data Source

Data is sourced from [Bangumi](https://bgm.tv/) API.

## License

MIT
