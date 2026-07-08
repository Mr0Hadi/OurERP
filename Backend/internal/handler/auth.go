package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/user/wms-backend/internal/config"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	Config *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{Config: cfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	var userID int
	var fullName, username, passwordHash, role, department string
	err := database.DB.QueryRow(
		"SELECT id, full_name, username, password_hash, role, department FROM users WHERE username = $1 AND is_active = true",
		req.Username,
	).Scan(&userID, &fullName, &username, &passwordHash, &role, &department)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusUnauthorized, "نام کاربری یا رمز عبور اشتباه است")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		respondError(c, http.StatusUnauthorized, "نام کاربری یا رمز عبور اشتباه است")
		return
	}
	accessToken, err := middleware.GenerateToken(userID, role, department, h.Config.JWTSecret, h.Config.JWTAccessExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در تولید توکن")
		return
	}
	refreshToken, err := middleware.GenerateToken(userID, role, department, h.Config.JWTSecret, h.Config.JWTRefreshExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در تولید توکن تازه‌سازی")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user": gin.H{
			"id":         userID,
			"full_name":  fullName,
			"username":   username,
			"role":       role,
			"department": department,
		},
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	// Check access token from Authorization header
	authHeader := c.GetHeader("Authorization")
	accessTokenValid := false
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			accessClaims := &middleware.Claims{}
			_, err := jwt.ParseWithClaims(parts[1], accessClaims, func(t *jwt.Token) (interface{}, error) {
				return []byte(h.Config.JWTSecret), nil
			})
			if err == nil {
				accessTokenValid = true
			} else if !errors.Is(err, jwt.ErrTokenExpired) {
				respondError(c, http.StatusBadRequest, "توکن دسترسی نامعتبر است")
				return
			}
		}
	}

	if accessTokenValid {
		respondError(c, http.StatusBadRequest, "توکن دسترسی هنوز معتبر است")
		return
	}

	// Access token is expired or missing — try refresh token
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	refreshClaims := &middleware.Claims{}
	refreshToken, err := jwt.ParseWithClaims(req.RefreshToken, refreshClaims, func(t *jwt.Token) (interface{}, error) {
		return []byte(h.Config.JWTSecret), nil
	})
	if err != nil || !refreshToken.Valid {
		respondError(c, http.StatusUnauthorized, "توکن تازه‌سازی منقضی شده است")
		return
	}

	// Generate both new tokens
	newAccessToken, err := middleware.GenerateToken(refreshClaims.UserID, refreshClaims.Role, refreshClaims.Department, h.Config.JWTSecret, h.Config.JWTAccessExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در تولید توکن")
		return
	}
	newRefreshToken, err := middleware.GenerateToken(refreshClaims.UserID, refreshClaims.Role, refreshClaims.Department, h.Config.JWTSecret, h.Config.JWTRefreshExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در تولید توکن تازه‌سازی")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{
		"access_token":  newAccessToken,
		"refresh_token": newRefreshToken,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	respondJSON(c, http.StatusOK, gin.H{"message": "با موفقیت خارج شدید"})
}
