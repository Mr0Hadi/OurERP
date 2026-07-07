package config

import (
	"os"
	"time"
)

type Config struct {
	ServerAddr       string
	DatabaseURL      string
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration
	UploadDir        string
}

func Load() (*Config, error) {
	accessExpiry, err := time.ParseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m"))
	if err != nil {
		return nil, err
	}
	refreshExpiry, err := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRY", "72h"))
	if err != nil {
		return nil, err
	}
	return &Config{
		ServerAddr:       getEnv("SERVER_ADDR", ":8080"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://postgres:123@localhost:5432/wms?sslmode=disable"),
		JWTSecret:        getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		JWTAccessExpiry:  accessExpiry,
		JWTRefreshExpiry: refreshExpiry,
		UploadDir:        getEnv("UPLOAD_DIR", "./uploads"),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
