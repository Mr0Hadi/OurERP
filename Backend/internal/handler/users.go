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
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type UserResponse struct {
		ID         int    `json:"id"`
		FullName   string `json:"fullName"`
		Username   string `json:"username"`
		Role       string `json:"role"`
		Department string `json:"department"`
		IsActive   bool   `json:"isActive"`
		CreatedAt  string `json:"createdAt"`
		UpdatedAt  string `json:"updatedAt"`
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
		FullName   string `json:"fullName"`
		Username   string `json:"username"`
		Password   string `json:"password"`
		Role       string `json:"role"`
		Department string `json:"department"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if req.FullName == "" || req.Username == "" || req.Password == "" {
		respondError(c, http.StatusBadRequest, "نام، نام کاربری و رمز عبور الزامی هستند")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در رمزنگاری رمز عبور")
		return
	}
	var id int
	err = database.DB.QueryRow(
		"INSERT INTO users (full_name, username, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.FullName, req.Username, string(hash), req.Role, req.Department,
	).Scan(&id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusCreated, gin.H{"id": id, "message": "کاربر ایجاد شد"})
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var req struct {
		FullName   string `json:"fullName"`
		Username   string `json:"username"`
		Password   string `json:"password,omitempty"`
		Role       string `json:"role"`
		Department string `json:"department"`
		IsActive   *bool  `json:"isActive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در رمزنگاری رمز عبور")
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
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	result, err := database.DB.Exec("UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "کاربر یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "حذف شد"})
}
