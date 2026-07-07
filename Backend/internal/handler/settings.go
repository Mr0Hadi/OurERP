package handler

import (
	"database/sql"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/config"
	"github.com/user/wms-backend/internal/database"
)

type SettingsHandler struct {
	Config *config.Config
}

func NewSettingsHandler(cfg *config.Config) *SettingsHandler {
	return &SettingsHandler{Config: cfg}
}

func (h *SettingsHandler) GetCompany(c *gin.Context) {
	var name, taxID, address, phone, email string
	err := database.DB.QueryRow("SELECT name, tax_id, address, phone, email FROM company_settings WHERE id = 1").Scan(&name, &taxID, &address, &phone, &email)
	if err == sql.ErrNoRows {
		respondJSON(c, http.StatusOK, gin.H{
			"id":      1,
			"name":    "",
			"tax_id":  "",
			"address": "",
			"phone":   "",
			"email":   "",
		})
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{
		"id":      1,
		"name":    name,
		"tax_id":  taxID,
		"address": address,
		"phone":   phone,
		"email":   email,
	})
}

func (h *SettingsHandler) UpdateCompany(c *gin.Context) {
	var req struct {
		Name    string `json:"name"`
		TaxID   string `json:"tax_id"`
		Address string `json:"address"`
		Phone   string `json:"phone"`
		Email   string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	var exists bool
	database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM company_settings WHERE id = 1)").Scan(&exists)
	if exists {
		_, err := database.DB.Exec(
			"UPDATE company_settings SET name=$1, tax_id=$2, address=$3, phone=$4, email=$5, updated_at=NOW() WHERE id=1",
			req.Name, req.TaxID, req.Address, req.Phone, req.Email,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "database error")
			return
		}
	} else {
		_, err := database.DB.Exec(
			"INSERT INTO company_settings (id, name, tax_id, address, phone, email) VALUES (1, $1, $2, $3, $4, $5)",
			req.Name, req.TaxID, req.Address, req.Phone, req.Email,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "database error")
			return
		}
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "company updated"})
}

func (h *SettingsHandler) Backup(c *gin.Context) {
	dbURL := h.Config.DatabaseURL
	backupDir := filepath.Join(h.Config.UploadDir, "backups")
	os.MkdirAll(backupDir, 0755)
	timestamp := time.Now().Format("20060102-150405")
	filename := "wms-backup-" + timestamp + ".sql"
	backupPath := filepath.Join(backupDir, filename)

	// Try pg_dump; if not available, return error
	cmd := exec.Command("pg_dump", dbURL, "-f", backupPath)
	if err := cmd.Run(); err != nil {
		respondError(c, http.StatusInternalServerError, "backup failed: pg_dump not available or error")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{
		"message":  "backup created",
		"file":     "/uploads/backups/" + filename,
		"filepath": backupPath,
	})
}
