package main

import (
	"log"
	"os"

	"github.com/user/wms-backend/internal/config"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/router"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := database.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	if err := seedAdmin(); err != nil {
		log.Fatalf("Failed to seed admin: %v", err)
	}

	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		log.Fatalf("Failed to create upload dir: %v", err)
	}

	r := router.Setup(cfg)

	log.Printf("Server starting on %s", cfg.ServerAddr)
	if err := r.Run(cfg.ServerAddr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func seedAdmin() error {
	var count int
	database.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if count > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = database.DB.Exec(
		"INSERT INTO users (full_name, username, password_hash, role, department) VALUES ('Admin', 'admin', $1, 'admin', 'sales')",
		string(hash),
	)
	if err != nil {
		return err
	}
	log.Println("Default admin user created (username: admin, password: admin123)")
	return nil
}
