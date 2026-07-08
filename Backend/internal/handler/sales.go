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

type SalesHandler struct{}

func NewSalesHandler() *SalesHandler {
	return &SalesHandler{}
}

func (h *SalesHandler) nextSaleNumber() (string, error) {
	var seq int
	err := database.DB.QueryRow("SELECT COALESCE(MAX(id), 0) + 1 FROM sales").Scan(&seq)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("SAL-%d", seq), nil
}

func (h *SalesHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := "SELECT id, customer_id, invoice_number, invoice_date, due_date, description, status, payment_type, COALESCE(paid_amount,0), COALESCE(total_amount,0), check_number, transfer_ref, created_by, created_at, updated_at FROM sales WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status := c.Query("status"); status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if customerID := c.Query("customer_id"); customerID != "" {
		query += fmt.Sprintf(" AND customer_id = $%d", argIdx)
		args = append(args, customerID)
		argIdx++
	}
	if paymentType := c.Query("payment_type"); paymentType != "" {
		query += fmt.Sprintf(" AND payment_type = $%d", argIdx)
		args = append(args, paymentType)
		argIdx++
	}
	if fromDate := c.Query("from_date"); fromDate != "" {
		query += fmt.Sprintf(" AND invoice_date >= $%d", argIdx)
		args = append(args, fromDate)
		argIdx++
	}
	if toDate := c.Query("to_date"); toDate != "" {
		query += fmt.Sprintf(" AND invoice_date <= $%d", argIdx)
		args = append(args, toDate)
		argIdx++
	}

	var totalCount int
	countQuery := strings.Replace(query, "SELECT id, customer_id, invoice_number, invoice_date, due_date, description, status, payment_type, COALESCE(paid_amount,0), COALESCE(total_amount,0), check_number, transfer_ref, created_by, created_at, updated_at", "SELECT COUNT(*)", 1)
	database.DB.QueryRow(countQuery, args...).Scan(&totalCount)

	offset := (p.Page - 1) * p.PageSize
	query += fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.PageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	sales := []model.Sale{}
	for rows.Next() {
		var s model.Sale
		var dueDate, description, checkNumber, transferRef sql.NullString
		if err := rows.Scan(&s.ID, &s.CustomerID, &s.InvoiceNumber, &s.InvoiceDate, &dueDate, &description, &s.Status, &s.PaymentType, &s.PaidAmount, &s.TotalAmount, &checkNumber, &transferRef, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در خواندن اطلاعات")
			return
		}
		s.Description = description.String
		s.CheckNumber = checkNumber.String
		s.TransferRef = transferRef.String
		if dueDate.Valid {
			s.DueDate = &dueDate.String
		}
		sales = append(sales, s)
	}

	for i := range sales {
		customerName := ""
		database.DB.QueryRow("SELECT full_name FROM customers WHERE id = $1", sales[i].CustomerID).Scan(&customerName)
		sales[i].CustomerName = customerName
		items, _ := h.getItems(sales[i].ID)
		sales[i].Items = items
	}

	respondJSONWithMeta(c, http.StatusOK, sales, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *SalesHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var s model.Sale
	var dueDate, description, checkNumber, transferRef sql.NullString
	err = database.DB.QueryRow(
		"SELECT id, customer_id, invoice_number, invoice_date, due_date, description, status, payment_type, COALESCE(paid_amount,0), COALESCE(total_amount,0), check_number, transfer_ref, created_by, created_at, updated_at FROM sales WHERE id = $1", id,
	).Scan(&s.ID, &s.CustomerID, &s.InvoiceNumber, &s.InvoiceDate, &dueDate, &description, &s.Status, &s.PaymentType, &s.PaidAmount, &s.TotalAmount, &checkNumber, &transferRef, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "فروش یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	s.Description = description.String
	s.CheckNumber = checkNumber.String
	s.TransferRef = transferRef.String
	if dueDate.Valid {
		s.DueDate = &dueDate.String
	}
	customerName := ""
	database.DB.QueryRow("SELECT full_name FROM customers WHERE id = $1", s.CustomerID).Scan(&customerName)
	s.CustomerName = customerName
	items, _ := h.getItems(s.ID)
	s.Items = items
	respondJSON(c, http.StatusOK, s)
}

func (h *SalesHandler) Create(c *gin.Context) {
	var s model.Sale
	if err := c.ShouldBindJSON(&s); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if s.CustomerID == 0 || len(s.Items) == 0 {
		respondError(c, http.StatusBadRequest, "شناسه مشتری و آیتم‌ها الزامی هستند")
		return
	}
	userID := getUserID(c)

	var customerName string
	database.DB.QueryRow("SELECT full_name FROM customers WHERE id = $1 AND is_active = true", s.CustomerID).Scan(&customerName)
	if customerName == "" {
		respondError(c, http.StatusBadRequest, "مشتری یافت نشد یا غیرفعال است")
		return
	}

	saleNumber, err := h.nextSaleNumber()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در تولید شماره فروش")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	if s.Status == "" {
		s.Status = "pending"
	}
	if s.PaymentType == "" {
		s.PaymentType = "cash"
	}

	var dueDate interface{}
	if s.DueDate != nil {
		dueDate = *s.DueDate
	}

	err = tx.QueryRow(
		`INSERT INTO sales (customer_id, invoice_number, invoice_date, due_date, description, status, payment_type, paid_amount, total_amount, check_number, transfer_ref, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10,''), NULLIF($11,''), $12) RETURNING id, created_at, updated_at`,
		s.CustomerID, saleNumber, s.InvoiceDate, dueDate, s.Description, s.Status, s.PaymentType, s.PaidAmount, s.TotalAmount, s.CheckNumber, s.TransferRef, userID,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}

	for _, item := range s.Items {
		lineTotal := (item.Qty * item.UnitPrice) - item.Discount
		_, err := tx.Exec(
			"INSERT INTO sale_items (sale_id, product_id, product_code, product_name, unit, qty, unit_price, discount, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
			s.ID, item.ProductID, item.ProductCode, item.ProductName, item.Unit, item.Qty, item.UnitPrice, item.Discount, lineTotal,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در ثبت آیتم")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	s.InvoiceNumber = saleNumber
	s.CustomerName = customerName
	s.CreatedBy = userID
	items, _ := h.getItems(s.ID)
	s.Items = items
	respondJSON(c, http.StatusCreated, s)
}

func (h *SalesHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}

	var s model.Sale
	if err := c.ShouldBindJSON(&s); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	var dueDate interface{}
	if s.DueDate != nil {
		dueDate = *s.DueDate
	}

	_, err = tx.Exec(
		"UPDATE sales SET customer_id=$1, invoice_date=$2, due_date=$3, description=$4, payment_type=$5, paid_amount=$6, total_amount=$7, check_number=NULLIF($8,''), transfer_ref=NULLIF($9,''), updated_at=NOW() WHERE id=$10",
		s.CustomerID, s.InvoiceDate, dueDate, s.Description, s.PaymentType, s.PaidAmount, s.TotalAmount, s.CheckNumber, s.TransferRef, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}

	tx.Exec("DELETE FROM sale_items WHERE sale_id = $1", id)
	for _, item := range s.Items {
		lineTotal := (item.Qty * item.UnitPrice) - item.Discount
		_, err := tx.Exec(
			"INSERT INTO sale_items (sale_id, product_id, product_code, product_name, unit, qty, unit_price, discount, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
			id, item.ProductID, item.ProductCode, item.ProductName, item.Unit, item.Qty, item.UnitPrice, item.Discount, lineTotal,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در ثبت آیتم")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}

func (h *SalesHandler) UpdateStatus(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)

	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if req.Status == "" {
		respondError(c, http.StatusBadRequest, "وضعیت الزامی است")
		return
	}

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM sales WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus == "" {
		respondError(c, http.StatusNotFound, "فروش یافت نشد")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE sales SET status=$1, updated_at=NOW() WHERE id=$2", req.Status, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('sale', $1, $2, $3, $4)", id, currentStatus, req.Status, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییر وضعیت")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "وضعیت به‌روزرسانی شد"})
}

func (h *SalesHandler) UpdatePayment(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}

	var req struct {
		PaidAmount float64 `json:"paid_amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	_, err = database.DB.Exec("UPDATE sales SET paid_amount=$1, updated_at=NOW() WHERE id=$2", req.PaidAmount, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "پرداخت به‌روزرسانی شد"})
}

func (h *SalesHandler) Delete(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	result, err := database.DB.Exec("DELETE FROM sales WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "فروش یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "حذف شد"})
}

func (h *SalesHandler) Stats(c *gin.Context) {
	var totalSales, totalAmount, totalPaid, pendingCount float64
	database.DB.QueryRow("SELECT COUNT(*), COALESCE(SUM(total_amount),0), COALESCE(SUM(paid_amount),0) FROM sales WHERE status != 'cancelled'").Scan(&totalSales, &totalAmount, &totalPaid)
	database.DB.QueryRow("SELECT COUNT(*) FROM sales WHERE status IN ('pending','processing','partially_delivered')").Scan(&pendingCount)
	respondJSON(c, http.StatusOK, gin.H{
		"total_sales":   totalSales,
		"total_amount":  totalAmount,
		"total_paid":    totalPaid,
		"pending_count": pendingCount,
	})
}

func (h *SalesHandler) getItems(saleID int) ([]model.SaleItem, error) {
	rows, err := database.DB.Query(
		"SELECT id, sale_id, product_id, product_code, product_name, unit, qty, unit_price, discount, line_total FROM sale_items WHERE sale_id = $1", saleID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.SaleItem{}
	for rows.Next() {
		var item model.SaleItem
		if err := rows.Scan(&item.ID, &item.SaleID, &item.ProductID, &item.ProductCode, &item.ProductName, &item.Unit, &item.Qty, &item.UnitPrice, &item.Discount, &item.LineTotal); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
