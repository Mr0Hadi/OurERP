package handler

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/model"
)

type CustomerHandler struct{}

func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{}
}

func (h *CustomerHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := `SELECT c.id, c.type, c.full_name, c.national_id, c.phone, c.address, c.referral_code, c.credit_limit, c.customer_grade, c.notes, c.is_active, c.created_at, c.updated_at,
		COALESCE((SELECT SUM(total) FROM (SELECT COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0) as total FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id WHERE i.customer_id = c.id AND i.status IN ('confirmed','dispatched','delivered')) sub), 0) -
		COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id = c.id), 0) as outstanding_balance
		FROM customers c WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if name := c.Query("name"); name != "" {
		query += fmt.Sprintf(" AND c.full_name ILIKE $%d", argIdx)
		args = append(args, "%"+name+"%")
		argIdx++
	}
	if search := c.Query("search"); search != "" {
		query += fmt.Sprintf(" AND (c.full_name ILIKE $%d OR c.phone ILIKE $%d OR c.national_id ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if typ := c.Query("type"); typ != "" {
		query += fmt.Sprintf(" AND c.type = $%d", argIdx)
		args = append(args, typ)
		argIdx++
	}
	if grade := c.Query("grade"); grade != "" {
		query += fmt.Sprintf(" AND c.customer_grade = $%d", argIdx)
		args = append(args, grade)
		argIdx++
	}
	if c.Query("include_inactive") != "true" {
		query += " AND c.is_active = true"
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM customers c WHERE 1=1"
	var countArgs []interface{}
	countIdx := 1
	if name := c.Query("name"); name != "" {
		countQuery += fmt.Sprintf(" AND c.full_name ILIKE $%d", countIdx)
		countArgs = append(countArgs, "%"+name+"%")
		countIdx++
	}
	if search := c.Query("search"); search != "" {
		countQuery += fmt.Sprintf(" AND (c.full_name ILIKE $%d OR c.phone ILIKE $%d OR c.national_id ILIKE $%d)", countIdx, countIdx, countIdx)
		countArgs = append(countArgs, "%"+search+"%")
		countIdx++
	}
	if typ := c.Query("type"); typ != "" {
		countQuery += fmt.Sprintf(" AND c.type = $%d", countIdx)
		countArgs = append(countArgs, typ)
		countIdx++
	}
	if grade := c.Query("grade"); grade != "" {
		countQuery += fmt.Sprintf(" AND c.customer_grade = $%d", countIdx)
		countArgs = append(countArgs, grade)
		countIdx++
	}
	if c.Query("include_inactive") != "true" {
		countQuery += " AND c.is_active = true"
	}
	database.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)

	offset := (p.Page - 1) * p.PageSize
	query += fmt.Sprintf(" ORDER BY c.id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.PageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	customers := []model.CustomerDetail{}
	for rows.Next() {
		var cd model.CustomerDetail
		var fullName, nationalID, phone, address, referralCode, notes, custType sql.NullString
		var createdAt, updatedAt sql.NullTime
		if err := rows.Scan(&cd.ID, &custType, &fullName, &nationalID, &phone, &address, &referralCode, &cd.CreditLimit, &cd.CustomerGrade, &notes, &cd.IsActive, &createdAt, &updatedAt, &cd.OutstandingBalance); err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در خواندن اطلاعات")
			return
		}
		cd.Type = custType.String
		cd.FullName = fullName.String
		cd.NationalID = nationalID.String
		cd.Phone = phone.String
		cd.Address = address.String
		cd.ReferralCode = referralCode.String
		cd.Notes = notes.String
		cd.CreatedAt = createdAt.Time
		cd.UpdatedAt = updatedAt.Time
		customers = append(customers, cd)
	}
	respondJSONWithMeta(c, http.StatusOK, customers, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *CustomerHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var cd model.CustomerDetail
	var fullName, nationalID, phone, address, referralCode, notes, custType sql.NullString
	var createdAt, updatedAt sql.NullTime
	err = database.DB.QueryRow(`
		SELECT c.id, c.type, c.full_name, c.national_id, c.phone, c.address, c.referral_code, c.credit_limit, c.customer_grade, c.notes, c.is_active, c.created_at, c.updated_at,
		COALESCE((SELECT SUM(total) FROM (SELECT COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0) as total FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id WHERE i.customer_id = c.id AND i.status IN ('confirmed','dispatched','delivered')) sub), 0) -
		COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id = c.id), 0) as outstanding_balance
		FROM customers c WHERE c.id = $1`, id,
	).Scan(&cd.ID, &custType, &fullName, &nationalID, &phone, &address, &referralCode, &cd.CreditLimit, &cd.CustomerGrade, &notes, &cd.IsActive, &createdAt, &updatedAt, &cd.OutstandingBalance)
	cd.Type = custType.String
	cd.FullName = fullName.String
	cd.NationalID = nationalID.String
	cd.Phone = phone.String
	cd.Address = address.String
	cd.ReferralCode = referralCode.String
	cd.Notes = notes.String
	cd.CreatedAt = createdAt.Time
	cd.UpdatedAt = updatedAt.Time
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "مشتری یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusOK, cd)
}

func (h *CustomerHandler) Create(c *gin.Context) {
	var req model.Customer
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if req.FullName == "" || req.NationalID == "" {
		respondError(c, http.StatusBadRequest, "نام و کد ملی الزامی هستند")
		return
	}
	if req.Type == "" {
		req.Type = "retail"
	}
	if req.CustomerGrade < 1 {
		req.CustomerGrade = 1
	}
	err := database.DB.QueryRow(
		`INSERT INTO customers (type, full_name, national_id, phone, address, referral_code, credit_limit, customer_grade, notes)
		 VALUES ($1, $2, $3, $4, $5, NULLIF($6,''), $7, $8, NULLIF($9,'')) RETURNING id, created_at, updated_at`,
		req.Type, req.FullName, req.NationalID, req.Phone, req.Address, req.ReferralCode, req.CreditLimit, req.CustomerGrade, req.Notes,
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			respondError(c, http.StatusConflict, "این کد ملی قبلاً ثبت شده است")
			return
		}
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusCreated, req)
}

func (h *CustomerHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var req model.Customer
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	result, err := database.DB.Exec(
		`UPDATE customers SET type=$1, full_name=$2, national_id=$3, phone=$4, address=$5, referral_code=NULLIF($6,''), credit_limit=$7, customer_grade=$8, notes=NULLIF($9,''), updated_at=NOW() WHERE id=$10`,
		req.Type, req.FullName, req.NationalID, req.Phone, req.Address, req.ReferralCode, req.CreditLimit, req.CustomerGrade, req.Notes, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "مشتری یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}

func (h *CustomerHandler) Delete(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	result, err := database.DB.Exec("UPDATE customers SET is_active=false, updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "مشتری یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "حذف شد"})
}

func (h *CustomerHandler) GetBalance(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var balance float64
	err = database.DB.QueryRow(`
		SELECT COALESCE((
			SELECT SUM(total) FROM (
				SELECT COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0) as total
				FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
				WHERE i.customer_id = $1 AND i.status IN ('confirmed','dispatched','delivered')
			) sub
		), 0) - COALESCE((
			SELECT SUM(amount) FROM customer_payments WHERE customer_id = $1
		), 0)`, id,
	).Scan(&balance)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"customer_id": id, "balance": balance})
}

func (h *CustomerHandler) GetTransactions(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}

	type Transaction struct {
		Type      string  `json:"type"`
		ID        int     `json:"id"`
		Amount    float64 `json:"amount"`
		Date      string  `json:"date"`
		Reference string  `json:"reference,omitempty"`
	}

	rows, err := database.DB.Query(`
		SELECT 'invoice' as type, i.id, COALESCE(ii.total, 0) as amount, i.created_at::text as date, i.invoice_number as reference
		FROM invoices i
		LEFT JOIN (SELECT invoice_id, SUM(quantity * unit_price - discount_amount) as total FROM invoice_items GROUP BY invoice_id) ii ON ii.invoice_id = i.id
		WHERE i.customer_id = $1
		UNION ALL
		SELECT 'payment' as type, cp.id, cp.amount, cp.created_at::text as date, COALESCE(i.invoice_number, '') as reference
		FROM customer_payments cp
		LEFT JOIN invoices i ON i.id = cp.reference_invoice_id
		WHERE cp.customer_id = $1
		ORDER BY date DESC`, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	transactions := []Transaction{}
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.Type, &t.ID, &t.Amount, &t.Date, &t.Reference); err != nil {
			continue
		}
		transactions = append(transactions, t)
	}
	respondJSON(c, http.StatusOK, transactions)
}
