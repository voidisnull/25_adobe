FROM debian:bookworm-slim

# --- system deps ---
RUN apt-get update && apt-get install -y \
    build-essential curl wget git python3 python3-pip python3-venv \
    postgresql postgresql-contrib postgresql-server-dev-all \
    supervisor ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- install pgvector ---
RUN git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector && make && make install && rm -rf /tmp/pgvector

# --- Go setup ---
RUN curl -L https://go.dev/dl/go1.22.6.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

# --- Node (for frontend build) ---
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# --- Go backend ---
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /usr/local/bin/backend ./main.go

# --- Python services ---
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# --- Frontend build ---
WORKDIR /app/app
RUN npm install && npm run build
# Copy built static files into Go backend's static dir
WORKDIR /app
RUN mkdir -p /app/static && cp -r /app/app/dist/* /app/static/

# --- PostgreSQL init ---
RUN mkdir -p /var/lib/postgresql/data /var/run/postgresql /var/log/supervisor
RUN chown -R postgres:postgres /var/lib/postgresql /var/run/postgresql

# Create initdb script
COPY ./docker/init-db.sh /docker-entrypoint-initdb.d/init-db.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh

# --- Supervisor config ---
COPY /docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
