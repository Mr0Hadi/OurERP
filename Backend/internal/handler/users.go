package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) List(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, full_name, username, role, department, is_active, created_at, updated_at FROM users ORDER BY id")
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type UserResponse struct {
		ID         int    `json:"id"`
		FullName   string `json:"full_name"`
		Username   string `json:"username"`
		Role       string `json:"role"`
		Department string `json:"department"`
		IsActive   bool   `json:"is_active"`
		CreatedAt  string `json:"created_at"`
		UpdatedAt  string `json:"updated_at"`
	}

	users := []UserResponse{}
	for rows.Next() {
		var u UserResponse
		if err := rows.Scan(&u.ID, &u.FullName, &u.Username, &u.Role, &u.Department, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			continue
		}
		users = append(users, u)
	}
	respondJSON(c, http.StatusOK, users)
}

func (h *UserHandler) Create(c *gin.Context) {
	var req struct {
		FullName   string `json:"full_name"`
		Username   string `json:"username"`
		Password   string `json:"password"`
		Role       string `json:"role"`
		Department string `json:"department"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.FullName == "" || req.Username == "" || req.Password == "" {
		respondError(c, http.StatusBadRequest, "full_name, username, and password are required")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to hash password")
		return
	}
	var id int
	err = database.DB.QueryRow(
		"INSERT INTO users (full_name, username, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.FullName, req.Username, string(hash), req.Role, req.Department,
	).Scan(&id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	respondJSON(c, http.StatusCreated, gin.H{"id": id, "message": "user created"})
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	var req struct {
		FullName   string `json:"full_name"`
		Username   string `json:"username"`
		Password   string `json:"password,omitempty"`
		Role       string `json:"role"`
		Department string `json:"department"`
		IsActive   *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "failed to hash password")
			return
		}
		_, err = database.DB.Exec(
			"UPDATE users SET full_name=$1, username=$2, password_hash=$3, role=$4, department=$5, updated_at=NOW() WHERE id=$6",
			req.FullName, req.Username, string(hash), req.Role, req.Department, id,
		)
	} else if req.IsActive != nil {
		_, err = database.DB.Exec(
			"UPDATE users SET full_name=$1, username=$2, role=$3, department=$4, is_active=$5, updated_at=NOW() WHERE id=$6",
			req.FullName, req.Username, req.Role, req.Department, *req.IsActive, id,
		)
	} else {
		_, err = database.DB.Exec(
			"UPDATE users SET full_name=$1, username=$2, role=$3, department=$4, updated_at=NOW() WHERE id=$5",
			req.FullName, req.Username, req.Role, req.Department, id,
		)
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "updated"})
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	result, err := database.DB.Exec("UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "user not found")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "deleted"})
}
