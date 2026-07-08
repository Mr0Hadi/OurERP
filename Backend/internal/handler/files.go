package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/config"
)

type FileHandler struct {
	Config *config.Config
}

func NewFileHandler(cfg *config.Config) *FileHandler {
	return &FileHandler{Config: cfg}
}

func (h *FileHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		respondError(c, http.StatusBadRequest, "انتخاب فایل الزامی است")
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	filePath := filepath.Join(h.Config.UploadDir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ذخیره فایل")
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در نوشتن فایل")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{
		"url":     fmt.Sprintf("/uploads/%s", filename),
		"file_id": filename,
	})
}
