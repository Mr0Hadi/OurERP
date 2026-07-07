package handler

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/model"
)

type PaymentHandler struct{}

func NewPaymentHandler() *PaymentHandler {
	return &PaymentHandler{}
}

func (h *PaymentHandler) ListCustomerPayments(c *gin.Context) {
	customerID := c.Query("customer_id")
	query := "SELECT id, customer_id, amount, payment_method, bank_account_id, check_id, reference_invoice_id, recorded_by, payment_date, notes, created_at FROM customer_payments"
	args := []interface{}{}

	if customerID != "" {
		query += " WHERE customer_id = $1"
		args = append(args, customerID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	payments := []model.CustomerPayment{}
	for rows.Next() {
		var p model.CustomerPayment
		var baID, chkID, invID sql.NullInt64
		var notes, paymentDate sql.NullString
		if err := rows.Scan(&p.ID, &p.CustomerID, &p.Amount, &p.PaymentMethod, &baID, &chkID, &invID, &p.RecordedBy, &paymentDate, &notes, &p.CreatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "scan error")
			return
		}
		p.PaymentDate = paymentDate.String
		p.Notes = notes.String
		if baID.Valid { v := int(baID.Int64); p.BankAccountID = &v }
		if chkID.Valid { v := int(chkID.Int64); p.CheckID = &v }
		if invID.Valid { v := int(invID.Int64); p.ReferenceInvoiceID = &v }
		payments = append(payments, p)
	}
	respondJSON(c, http.StatusOK, payments)
}

func (h *PaymentHandler) CreateCustomerPayment(c *gin.Context) {
	var req model.CustomerPayment
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.CustomerID == 0 || req.Amount <= 0 {
		respondError(c, http.StatusBadRequest, "customer_id and amount are required")
		return
	}
	userID := getUserID(c)

	if req.PaymentMethod == "check" {
		var checkID int
		err := database.DB.QueryRow(
			"INSERT INTO checks (check_number, bank_name, amount, due_date, image_url, status) VALUES ($1, $2, $3, $4, $5, 'issued') RETURNING id",
			"", "", req.Amount, nil, "",
		).Scan(&checkID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "failed to create check record")
			return
		}
		req.CheckID = &checkID
	}

	paymentDate := req.PaymentDate
	if paymentDate == "" {
		paymentDate = time.Now().Format("2006-01-02")
	}

	err := database.DB.QueryRow(
		`INSERT INTO customer_payments (customer_id, amount, payment_method, bank_account_id, check_id, reference_invoice_id, recorded_by, payment_date, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`,
		req.CustomerID, req.Amount, req.PaymentMethod, req.BankAccountID, req.CheckID, req.ReferenceInvoiceID, userID, paymentDate, req.Notes,
	).Scan(&req.ID, &req.CreatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	req.RecordedBy = userID
	req.PaymentDate = paymentDate
	respondJSON(c, http.StatusCreated, req)
}

func (h *PaymentHandler) GetCustomerPayment(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	var p model.CustomerPayment
	var baID, chkID, invID sql.NullInt64
	var notes, paymentDate sql.NullString
	err = database.DB.QueryRow(
		"SELECT id, customer_id, amount, payment_method, bank_account_id, check_id, reference_invoice_id, recorded_by, payment_date, notes, created_at FROM customer_payments WHERE id = $1", id,
	).Scan(&p.ID, &p.CustomerID, &p.Amount, &p.PaymentMethod, &baID, &chkID, &invID, &p.RecordedBy, &paymentDate, &notes, &p.CreatedAt)
	p.PaymentDate = paymentDate.String
	p.Notes = notes.String
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "payment not found")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	if baID.Valid { v := int(baID.Int64); p.BankAccountID = &v }
	if chkID.Valid { v := int(chkID.Int64); p.CheckID = &v }
	if invID.Valid { v := int(invID.Int64); p.ReferenceInvoiceID = &v }
	respondJSON(c, http.StatusOK, p)
}

func (h *PaymentHandler) ListSupplierPayments(c *gin.Context) {
	supplierID := c.Query("supplier_id")
	query := "SELECT id, supplier_id, purchase_order_id, amount, payment_method, check_id, recorded_by, payment_date, created_at FROM supplier_payments"
	args := []interface{}{}

	if supplierID != "" {
		query += " WHERE supplier_id = $1"
		args = append(args, supplierID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	payments := []model.SupplierPayment{}
	for rows.Next() {
		var p model.SupplierPayment
		var poID, chkID sql.NullInt64
		var paymentDate sql.NullString
		if err := rows.Scan(&p.ID, &p.SupplierID, &poID, &p.Amount, &p.PaymentMethod, &chkID, &p.RecordedBy, &paymentDate, &p.CreatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "scan error")
			return
		}
		if poID.Valid { v := int(poID.Int64); p.PurchaseOrderID = &v }
			if chkID.Valid { v := int(chkID.Int64); p.CheckID = &v }
			p.PaymentDate = paymentDate.String
			payments = append(payments, p)
	}
	respondJSON(c, http.StatusOK, payments)
}

func (h *PaymentHandler) CreateSupplierPayment(c *gin.Context) {
	var req model.SupplierPayment
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SupplierID == 0 || req.Amount <= 0 {
		respondError(c, http.StatusBadRequest, "supplier_id and amount are required")
		return
	}
	userID := getUserID(c)

	paymentDate := req.PaymentDate
	if paymentDate == "" {
		paymentDate = time.Now().Format("2006-01-02")
	}

	err := database.DB.QueryRow(
		`INSERT INTO supplier_payments (supplier_id, purchase_order_id, amount, payment_method, check_id, recorded_by, payment_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
		req.SupplierID, req.PurchaseOrderID, req.Amount, req.PaymentMethod, req.CheckID, userID, paymentDate,
	).Scan(&req.ID, &req.CreatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	req.RecordedBy = userID
	req.PaymentDate = paymentDate
	respondJSON(c, http.StatusCreated, req)
}

func (h *PaymentHandler) GetSupplierPayment(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	var p model.SupplierPayment
	var poID, chkID sql.NullInt64
	var paymentDate sql.NullString
	err = database.DB.QueryRow(
		"SELECT id, supplier_id, purchase_order_id, amount, payment_method, check_id, recorded_by, payment_date, created_at FROM supplier_payments WHERE id = $1", id,
	).Scan(&p.ID, &p.SupplierID, &poID, &p.Amount, &p.PaymentMethod, &chkID, &p.RecordedBy, &paymentDate, &p.CreatedAt)
	p.PaymentDate = paymentDate.String
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "payment not found")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	if poID.Valid { v := int(poID.Int64); p.PurchaseOrderID = &v }
	if chkID.Valid { v := int(chkID.Int64); p.CheckID = &v }
	respondJSON(c, http.StatusOK, p)
}
