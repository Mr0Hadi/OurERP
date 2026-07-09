package handler

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/model"
)

type SupplierHandler struct{}

func NewSupplierHandler() *SupplierHandler {
	return &SupplierHandler{}
}

func (h *SupplierHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := "SELECT id, name, contact_name, phone, address, postal_code, latitude, longitude, balance_type, balance, notes, is_active, created_at, updated_at FROM suppliers WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if search := c.Query("search"); search != "" {
		query += fmt.Sprintf(" AND (name ILIKE $%d OR contact_name ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if name := c.Query("name"); name != "" {
		query += fmt.Sprintf(" AND name ILIKE $%d", argIdx)
		args = append(args, "%"+name+"%")
		argIdx++
	}
	if c.Query("include_inactive") != "true" {
		query += " AND is_active = true"
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM suppliers WHERE 1=1"
	countArgs := []interface{}{}
	countIdx := 1
	if search := c.Query("search"); search != "" {
		countQuery += fmt.Sprintf(" AND (name ILIKE $%d OR contact_name ILIKE $%d)", countIdx, countIdx)
		countArgs = append(countArgs, "%"+search+"%")
		countIdx++
	}
	if name := c.Query("name"); name != "" {
		countQuery += fmt.Sprintf(" AND name ILIKE $%d", countIdx)
		countArgs = append(countArgs, "%"+name+"%")
		countIdx++
	}
	if c.Query("include_inactive") != "true" {
		countQuery += " AND is_active = true"
	}
	database.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)

	offset := (p.Page - 1) * p.PageSize
	query += fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.PageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	suppliers := []model.Supplier{}
	for rows.Next() {
		var s model.Supplier
		var contactName, phone, address, postalCode, notes, name sql.NullString
		var latitude, longitude sql.NullFloat64
		var createdAt, updatedAt sql.NullTime
		if err := rows.Scan(&s.ID, &name, &contactName, &phone, &address, &postalCode, &latitude, &longitude, &s.BalanceType, &s.Balance, &notes, &s.IsActive, &createdAt, &updatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در خواندن اطلاعات")
			return
		}
		s.Name = name.String
		s.ContactName = contactName.String
		s.Phone = phone.String
		s.Address = address.String
		s.PostalCode = postalCode.String
		if latitude.Valid {
			s.Latitude = &latitude.Float64
		}
		if longitude.Valid {
			s.Longitude = &longitude.Float64
		}
		s.Notes = notes.String
		s.CreatedAt = createdAt.Time
		s.UpdatedAt = updatedAt.Time
		suppliers = append(suppliers, s)
	}
	respondJSONWithMeta(c, http.StatusOK, suppliers, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *SupplierHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var s model.Supplier
	var name, contactName, phone, address, postalCode, notes sql.NullString
	var latitude, longitude sql.NullFloat64
	var createdAt, updatedAt sql.NullTime
	err = database.DB.QueryRow(
		"SELECT id, name, contact_name, phone, address, postal_code, latitude, longitude, balance_type, balance, notes, is_active, created_at, updated_at FROM suppliers WHERE id = $1", id,
	).Scan(&s.ID, &name, &contactName, &phone, &address, &postalCode, &latitude, &longitude, &s.BalanceType, &s.Balance, &notes, &s.IsActive, &createdAt, &updatedAt)
	s.Name = name.String
	s.ContactName = contactName.String
	s.Phone = phone.String
	s.Address = address.String
	s.PostalCode = postalCode.String
	if latitude.Valid {
		s.Latitude = &latitude.Float64
	}
	if longitude.Valid {
		s.Longitude = &longitude.Float64
	}
	s.Notes = notes.String
	s.CreatedAt = createdAt.Time
	s.UpdatedAt = updatedAt.Time
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "تامین‌کننده یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusOK, s)
}

func (h *SupplierHandler) Create(c *gin.Context) {
	var s model.Supplier
	if err := c.ShouldBindJSON(&s); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if s.Name == "" {
		respondError(c, http.StatusBadRequest, "نام الزامی است")
		return
	}
	if s.BalanceType == "" {
		s.BalanceType = "none"
	}
	if s.BalanceType != "none" && s.BalanceType != "creditor" && s.BalanceType != "debtor" {
		respondError(c, http.StatusBadRequest, "نوع حساب نامعتبر است")
		return
	}
	if s.PostalCode != "" {
		if matched, _ := regexp.MatchString(`^\d{5,10}$`, s.PostalCode); !matched {
			respondError(c, http.StatusBadRequest, "کد پستی نامعتبر است")
			return
		}
	}
	if s.Latitude != nil {
		if *s.Latitude < -90 || *s.Latitude > 90 {
			respondError(c, http.StatusBadRequest, "عرض جغرافیایی باید بین -90 و 90 باشد")
			return
		}
	}
	if s.Longitude != nil {
		if *s.Longitude < -180 || *s.Longitude > 180 {
			respondError(c, http.StatusBadRequest, "طول جغرافیایی باید بین -180 و 180 باشد")
			return
		}
	}
	err := database.DB.QueryRow(
		`INSERT INTO suppliers (name, contact_name, phone, address, postal_code, latitude, longitude, balance_type, balance, notes) VALUES ($1, $2, $3, $4, NULLIF($5,''), $6, $7, $8, $9, $10) RETURNING id, created_at, updated_at`,
		s.Name, s.ContactName, s.Phone, s.Address, s.PostalCode, s.Latitude, s.Longitude, s.BalanceType, s.Balance, s.Notes,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusCreated, s)
}

func (h *SupplierHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var s model.Supplier
	if err := c.ShouldBindJSON(&s); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if s.BalanceType != "none" && s.BalanceType != "creditor" && s.BalanceType != "debtor" {
		respondError(c, http.StatusBadRequest, "نوع حساب نامعتبر است")
		return
	}
	if s.PostalCode != "" {
		if matched, _ := regexp.MatchString(`^\d{5,10}$`, s.PostalCode); !matched {
			respondError(c, http.StatusBadRequest, "کد پستی نامعتبر است")
			return
		}
	}
	if s.Latitude != nil {
		if *s.Latitude < -90 || *s.Latitude > 90 {
			respondError(c, http.StatusBadRequest, "عرض جغرافیایی باید بین -90 و 90 باشد")
			return
		}
	}
	if s.Longitude != nil {
		if *s.Longitude < -180 || *s.Longitude > 180 {
			respondError(c, http.StatusBadRequest, "طول جغرافیایی باید بین -180 و 180 باشد")
			return
		}
	}
	result, err := database.DB.Exec(
		"UPDATE suppliers SET name=$1, contact_name=$2, phone=$3, address=$4, postal_code=NULLIF($5,''), latitude=$6, longitude=$7, balance_type=$8, balance=$9, notes=$10, updated_at=NOW() WHERE id=$11",
		s.Name, s.ContactName, s.Phone, s.Address, s.PostalCode, s.Latitude, s.Longitude, s.BalanceType, s.Balance, s.Notes, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "تامین‌کننده یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}

func (h *SupplierHandler) Delete(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	result, err := database.DB.Exec("UPDATE suppliers SET is_active=false, updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "تامین‌کننده یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "حذف شد"})
}
