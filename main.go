package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/ShardulNalegave/adobe-hackathon/database"
	"github.com/ShardulNalegave/adobe-hackathon/routes"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func main() {
	godotenv.Load()
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout})

	host := "0.0.0.0"
	port := 8081

	db := database.ConnectToDatabase()

	router := chi.NewRouter()
	router.Use(cors.AllowAll().Handler)
	router.Use(database.DatabaseMiddleware(db))
	routes.MountRoutes(router)

	addr := fmt.Sprintf("%s:%d", host, port)
	log.Info().Str("address", addr).Msg("Server Listening...")
	http.ListenAndServe(addr, router)
}
