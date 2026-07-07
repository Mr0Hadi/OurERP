package handler

import (
	"database/sql"
	"net/http"

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
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	var userID int
	var fullName, username, passwordHash, role, department string
	err := database.DB.QueryRow(
		"SELECT id, full_name, username, password_hash, role, department FROM users WHERE username = $1 AND is_active = true",
		req.Username,
	).Scan(&userID, &fullName, &username, &passwordHash, &role, &department)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		respondError(c, http.StatusUnauthorized, "invalid credentials")
		return
	}
	accessToken, err := middleware.GenerateToken(userID, role, department, h.Config.JWTSecret, h.Config.JWTAccessExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to generate token")
		return
	}
	refreshToken, err := middleware.GenerateToken(userID, role, department, h.Config.JWTSecret, h.Config.JWTRefreshExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to generate refresh token")
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
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(h.Config.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		respondError(c, http.StatusUnauthorized, "invalid refresh token")
		return
	}
	accessToken, err := middleware.GenerateToken(claims.UserID, claims.Role, claims.Department, h.Config.JWTSecret, h.Config.JWTAccessExpiry)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to generate token")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"access_token": accessToken})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	respondJSON(c, http.StatusOK, gin.H{"message": "logged out successfully"})
}
