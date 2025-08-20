#!/bin/bash
set -e

# init postgres if not already
if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D /var/lib/postgresql/data"
fi

# start postgres temporarily
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /var/lib/postgresql/data -l logfile start"

# wait until ready
until pg_isready -U postgres; do sleep 1; done

# enable pgvector
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

# stop again (supervisord will handle actual start)
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D /var/lib/postgresql/data stop"
