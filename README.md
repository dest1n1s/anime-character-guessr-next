# Anime Character Guessr Next (SvelteKit Version)

A fun game where you guess anime characters with increasing hints. Built with SvelteKit and powered by Bun.

## Features

- Search for anime characters or browse by anime
- Get feedback on your guesses (popularity, appearances, ratings, etc.)
- Caching data from Bangumi API using Redis
- Better multiplayer experience
- Server-side rendering (SSR) & Server-Sent Events (SSE) for pushing room status updates

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
docker compose up -d redis
```

### Building for production

```bash
# Build the app
bun run build

# Preview the built app
bun run preview

# Optional: Run Redis server
docker compose up -d redis
```

## Docker Deployment

This project includes Docker configuration for easy deployment.

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Building Docker Image Manually

```bash
# Build the Docker image
docker build -t anime-character-guessr .

# Run the container
docker run -p 3000:3000 --env-file .env anime-character-guessr
```

### Environment Variables

| Variable           | Description                              | Default                  |
| ------------------ | ---------------------------------------- | ------------------------ |
| `REDIS_URL`        | The URL of the Redis server              | `redis://localhost:6379` |
| `USE_REDIS_IN_DEV` | Whether to use Redis in development mode | `false`                  |
| `PORT`             | The port the application listens on      | `3000`                   |

## Data Source

Data is sourced from [Bangumi](https://bgm.tv/) API.

## License

MIT
