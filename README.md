# Family Bingo Night

[![Tests](https://github.com/numbfrank/family-bingo-night/actions/workflows/test.yml/badge.svg)](https://github.com/numbfrank/family-bingo-night/actions/workflows/test.yml)

A cheerful, TV-friendly 90-ball bingo caller. It draws every number exactly once, shows a traditional UK call (including **22 — Two Little Ducks**), keeps a newest-first history, and lets the host reset for a fresh game.

The active game is saved in the browser, so an accidental refresh will not lose the call history. Each browser or device runs its own independent game.

## Requirements

- Docker with Docker Compose v2
- A modern web browser

## Run with Docker

```sh
docker compose up --build
```

Open <http://localhost:8080>. The default Compose configuration only exposes the app to the host computer. To stop the app, press `Ctrl+C` and run:

```sh
docker compose down
```

You can also build and run it directly:

```sh
docker build -t family-bingo .
docker run --rm -p 8080:80 family-bingo
```

## Use the caller

1. Select **Call first number**.
2. Read the large number and its call aloud.
3. Keep calling; numbers never repeat and the number board marks every result.
4. Select **Reset game** and confirm when you want to clear the history and reshuffle all 90 balls.

Traditional calls have regional variations. This app uses a consistent, family-friendly UK set.

## Test

The game logic has no third-party dependencies. With Node.js 20 or later installed:

```sh
npm test
```

## Contributing

Bug reports and pull requests are welcome. Please run `npm test` before opening a pull request.

## Licence

Released under the [MIT License](LICENSE).
