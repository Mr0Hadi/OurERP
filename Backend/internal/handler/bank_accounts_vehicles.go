package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/model"
)

type BankAccountHandler struct{}

func NewBankAccountHandler() *BankAccountHandler {
	return &BankAccountHandler{}
}

func (h *BankAccountHandler) List(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, account_name, bank_name, account_number, is_active, created_at, updated_at FROM bank_accounts WHERE is_active = true ORDER BY id")
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	accounts := []model.BankAccount{}
	for rows.Next() {
		var a model.BankAccount
		var bankName, accountNumber sql.NullString
		if err := rows.Scan(&a.ID, &a.AccountName, &bankName, &accountNumber, &a.IsActive, &a.CreatedAt, &a.UpdatedAt); err != nil {
			continue
		}
		a.BankName = bankName.String
		a.AccountNumber = accountNumber.String
		accounts = append(accounts, a)
	}
	respondJSON(c, http.StatusOK, accounts)
}

func (h *BankAccountHandler) Create(c *gin.Context) {
	var a model.BankAccount
	if err := c.ShouldBindJSON(&a); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if a.AccountName == "" || a.BankName == "" || a.AccountNumber == "" {
		respondError(c, http.StatusBadRequest, "نام حساب، نام بانک و شماره حساب الزامی هستند")
		return
	}
	err := database.DB.QueryRow(
		"INSERT INTO bank_accounts (account_name, bank_name, account_number) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at",
		a.AccountName, a.BankName, a.AccountNumber,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	a.IsActive = true
	respondJSON(c, http.StatusCreated, a)
}

func (h *BankAccountHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var a model.BankAccount
	if err := c.ShouldBindJSON(&a); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	result, err := database.DB.Exec(
		"UPDATE bank_accounts SET account_name=$1, bank_name=$2, account_number=$3, is_active=$4, updated_at=NOW() WHERE id=$5",
		a.AccountName, a.BankName, a.AccountNumber, a.IsActive, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "حساب بانکی یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}

type VehicleHandler struct{}

func NewVehicleHandler() *VehicleHandler {
	return &VehicleHandler{}
}

func (h *VehicleHandler) List(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, code, description, created_at, updated_at FROM vehicles ORDER BY id")
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	vehicles := []model.Vehicle{}
	for rows.Next() {
		var v model.Vehicle
		var description sql.NullString
		if err := rows.Scan(&v.ID, &v.Code, &description, &v.CreatedAt, &v.UpdatedAt); err != nil {
			continue
		}
		v.Description = description.String
		vehicles = append(vehicles, v)
	}
	respondJSON(c, http.StatusOK, vehicles)
}

func (h *VehicleHandler) Create(c *gin.Context) {
	var v model.Vehicle
	if err := c.ShouldBindJSON(&v); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if v.Code == "" {
		respondError(c, http.StatusBadRequest, "کد الزامی است")
		return
	}
	err := database.DB.QueryRow(
		"INSERT INTO vehicles (code, description) VALUES ($1, $2) RETURNING id, created_at, updated_at",
		v.Code, v.Description,
	).Scan(&v.ID, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusCreated, v)
}

func (h *VehicleHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var v model.Vehicle
	if err := c.ShouldBindJSON(&v); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	result, err := database.DB.Exec(
		"UPDATE vehicles SET code=$1, description=$2, updated_at=NOW() WHERE id=$3",
		v.Code, v.Description, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "وسیله نقلیه یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}
