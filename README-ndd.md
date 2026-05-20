# Wiping Local Data

How to completely wipe all persistent data for the local `oneglanse-app` stack (Postgres, ClickHouse, Redis, and the agent storage bind mount).

> **Warning:** These commands are destructive and irreversible. They delete all database contents, cached state, and saved auth data on your machine.

## What gets persisted

Defined in `docker-compose.yml`:

**Named volumes** (managed by Docker):
- `oneglanse-app_db_data` — Postgres data (`/var/lib/postgresql/data`)
- `oneglanse-app_clickhouse_data` — ClickHouse data (`/var/lib/clickhouse`)
- `oneglanse-app_redis_data` — Redis AOF/RDB (`/data`)

**Bind mount** (on your host filesystem):
- `${ONEGLANSE_STORAGE_ROOT:-/opt/oneglanse/storage}` — agent auth + storage, mounted into the agent/web containers at `/storage`.

## Full wipe (recommended)

Run from the repo root:

```bash
# 1. Stop containers and remove all named volumes for this project
docker compose down -v

# 2. Remove the host-side storage bind mount
#    (path comes from ONEGLANSE_STORAGE_ROOT in .env; default shown below)
sudo rm -rf /opt/oneglanse/storage
```

Next `docker compose up` will recreate everything from scratch — Postgres will re-run init scripts and migrations, ClickHouse will re-init, Redis will start empty.

## Verify the wipe

```bash
# No oneglanse-app_* volumes should be listed
docker volume ls --filter "name=oneglanse"

# No containers should be listed
docker compose ps -a

# Storage directory should be gone (or empty)
ls -la /opt/oneglanse/storage 2>/dev/null || echo "gone"
```

## Selective wipes

If you only want to reset one service, remove just that volume:

```bash
# Stop everything first
docker compose down

# Pick one
docker volume rm oneglanse-app_db_data          # Postgres only
docker volume rm oneglanse-app_clickhouse_data  # ClickHouse only
docker volume rm oneglanse-app_redis_data       # Redis only
```

## Notes

- `docker compose down` **without** `-v` keeps the named volumes — containers are removed but data survives a restart.
- If you set `ONEGLANSE_STORAGE_ROOT` to a different path in `.env`, wipe that path instead of `/opt/oneglanse/storage`.
- `docker volume prune` removes **all** unused volumes on your system, not just this project's — use the explicit `docker compose down -v` above unless you really want a system-wide cleanup.
