# Anime Character Guessr Next (SvelteKit Version)

A fun game where you guess anime characters with increasing hints. Built with SvelteKit and powered by Bun.

## Acknowledgements

- Inspired by [BLAST.tv](https://blast.tv/counter-strikle)
- Refactored from [kennylimz/anime-character-guessr](https://github.com/kennylimz/anime-character-guessr)
- Data source: [Bangumi](https://bgm.tv/)

## Features

- Search for anime characters or browse by anime
- Get feedback on your guesses (popularity, appearances, ratings, etc.)
- Caching data from Bangumi API using Redis
- Better multiplayer experience
- Server-side rendering (SSR) & Server-Sent Events (SSE) for pushing room status updates

## Development

This project uses [Bun](https://bun.sh/) for faster performance and improved developer experience. Also, it relies on the following services:

- **Redis**: For caching API data from Bangumi
- **MongoDB**: For storing additional data

You can run these services locally using Docker Compose.

### Prerequisites

- Install Bun: `curl -fsSL https://bun.sh/install | bash`
- Install Docker & Docker Compose. You may refer to the [official documentation](https://docs.docker.com/get-docker/) for help.
- Or, you can directly install [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/) and [MongoDB](https://www.mongodb.com/docs/manual/installation/) on your machine.

### Setup

```bash
# Clone the repository
git clone https://github.com/dest1n1/anime-character-guessr-next.git

# Install dependencies
bun install

# Start development server
bun run dev

# Optional: Run Redis and MongoDB servers
docker compose up -d redis mongo
```

### Building for production

```bash
# Build the app
bun run build

# Preview the built app
bun run preview

# Optional: Run Redis and MongoDB servers
docker compose up -d redis mongo
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

| Variable           | Description                              | Default                     |
| ------------------ | ---------------------------------------- | --------------------------- |
| `REDIS_URL`        | The URL of the Redis server              | `redis://localhost:6379`    |
| `USE_REDIS_IN_DEV` | Whether to use Redis in development mode | `false`                     |
| `PORT`             | The port the application listens on      | `3000`                      |
| `MONGODB_URI`      | The URL of the MongoDB server            | `mongodb://localhost:27017` |

## Data Source

Data is sourced from [Bangumi](https://bgm.tv/) API.

## License

MIT
