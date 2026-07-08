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

type InvoiceHandler struct {
	seqCounter int
}

func NewInvoiceHandler() *InvoiceHandler {
	return &InvoiceHandler{}
}

func (h *InvoiceHandler) nextInvoiceNumber() (string, error) {
	var seq int
	err := database.DB.QueryRow("SELECT COALESCE(MAX(id), 0) + 1 FROM invoices").Scan(&seq)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("INV-2024-%05d", seq), nil
}

func (h *InvoiceHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := "SELECT id, invoice_number, proforma_number, customer_id, channel, created_by, status, notes, dispatched_by, dispatched_at, vehicle_id, packer_id, created_at, updated_at FROM invoices WHERE 1=1"
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
	if from := c.Query("from"); from != "" {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, from)
		argIdx++
	}
	if to := c.Query("to"); to != "" {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, to)
		argIdx++
	}

	var totalCount int
	countQuery := strings.Replace(query, "SELECT id, invoice_number, proforma_number, customer_id, channel, created_by, status, notes, dispatched_by, dispatched_at, vehicle_id, packer_id, created_at, updated_at", "SELECT COUNT(*)", 1)
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

	invoices := []model.Invoice{}
	for rows.Next() {
		var inv model.Invoice
		var dispBy, vehID, packID sql.NullInt64
		var dispAt, proformaNumber, notes sql.NullString
		if err := rows.Scan(&inv.ID, &inv.InvoiceNumber, &proformaNumber, &inv.CustomerID, &inv.Channel, &inv.CreatedBy, &inv.Status, &notes, &dispBy, &dispAt, &vehID, &packID, &inv.CreatedAt, &inv.UpdatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در خواندن اطلاعات")
			return
		}
		inv.ProformaNumber = proformaNumber.String
		inv.Notes = notes.String
		if dispBy.Valid { v := int(dispBy.Int64); inv.DispatchedBy = &v }
		if vehID.Valid { v := int(vehID.Int64); inv.VehicleID = &v }
		if packID.Valid { v := int(packID.Int64); inv.PackerID = &v }
		if dispAt.Valid { inv.DispatchedAt = &dispAt.String }
		invoices = append(invoices, inv)
	}

	for i := range invoices {
		items, _ := h.getItems(invoices[i].ID)
		invoices[i].Items = items
	}

	respondJSONWithMeta(c, http.StatusOK, invoices, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *InvoiceHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var inv model.Invoice
	var dispBy, vehID, packID sql.NullInt64
	var dispAt, proformaNumber, notes sql.NullString
	err = database.DB.QueryRow(
		"SELECT id, invoice_number, proforma_number, customer_id, channel, created_by, status, notes, dispatched_by, dispatched_at, vehicle_id, packer_id, created_at, updated_at FROM invoices WHERE id = $1", id,
	).Scan(&inv.ID, &inv.InvoiceNumber, &proformaNumber, &inv.CustomerID, &inv.Channel, &inv.CreatedBy, &inv.Status, &notes, &dispBy, &dispAt, &vehID, &packID, &inv.CreatedAt, &inv.UpdatedAt)
	inv.ProformaNumber = proformaNumber.String
	inv.Notes = notes.String
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "فاکتور یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	if dispBy.Valid { v := int(dispBy.Int64); inv.DispatchedBy = &v }
	if vehID.Valid { v := int(vehID.Int64); inv.VehicleID = &v }
	if packID.Valid { v := int(packID.Int64); inv.PackerID = &v }
	if dispAt.Valid { inv.DispatchedAt = &dispAt.String }
	items, _ := h.getItems(inv.ID)
	inv.Items = items
	respondJSON(c, http.StatusOK, inv)
}

func (h *InvoiceHandler) Create(c *gin.Context) {
	var inv model.Invoice
	if err := c.ShouldBindJSON(&inv); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if inv.CustomerID == 0 || len(inv.Items) == 0 {
		respondError(c, http.StatusBadRequest, "شناسه مشتری و آیتم‌ها الزامی هستند")
		return
	}
	userID := getUserID(c)

	var customerType string
	database.DB.QueryRow("SELECT type FROM customers WHERE id = $1 AND is_active = true", inv.CustomerID).Scan(&customerType)
	if customerType == "" {
		respondError(c, http.StatusBadRequest, "مشتری یافت نشد یا غیرفعال است")
		return
	}

	channel := inv.Channel
	if channel == "" {
		switch customerType {
		case "wholesale":
			channel = "wholesale"
		case "mechanic":
			channel = "mechanic"
		default:
			channel = "retail"
		}
	}

	invoiceNumber, err := h.nextInvoiceNumber()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در تولید شماره فاکتور")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	err = tx.QueryRow(
		`INSERT INTO invoices (invoice_number, proforma_number, customer_id, channel, created_by, status, notes)
		 VALUES ($1, $2, $3, $4, $5, 'proforma', $6) RETURNING id, created_at, updated_at`,
		invoiceNumber, inv.ProformaNumber, inv.CustomerID, channel, userID, inv.Notes,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}

	for _, item := range inv.Items {
		_, err := tx.Exec(
			"INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_amount, price_override_reason, price_overridden_by) VALUES ($1, $2, $3, $4, $5, NULLIF($6,''), $7)",
			inv.ID, item.ProductID, item.Quantity, item.UnitPrice, item.DiscountAmount, item.PriceOverrideReason, item.PriceOverriddenBy,
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

	inv.InvoiceNumber = invoiceNumber
	inv.Status = "proforma"
	inv.Channel = channel
	inv.CreatedBy = userID
	items, _ := h.getItems(inv.ID)
	inv.Items = items
	respondJSON(c, http.StatusCreated, inv)
}

func (h *InvoiceHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM invoices WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus != "proforma" {
		respondError(c, http.StatusBadRequest, "فقط فاکتورهای پیش‌فاکتور قابل ویرایش هستند")
		return
	}

	var inv model.Invoice
	if err := c.ShouldBindJSON(&inv); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(
		"UPDATE invoices SET customer_id=$1, channel=$2, notes=$3, updated_at=NOW() WHERE id=$4 AND status='proforma'",
		inv.CustomerID, inv.Channel, inv.Notes, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}

	tx.Exec("DELETE FROM invoice_items WHERE invoice_id = $1", id)
	for _, item := range inv.Items {
		_, err := tx.Exec(
			"INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_amount, price_override_reason, price_overridden_by) VALUES ($1, $2, $3, $4, $5, NULLIF($6,''), $7)",
			id, item.ProductID, item.Quantity, item.UnitPrice, item.DiscountAmount, item.PriceOverrideReason, item.PriceOverriddenBy,
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

func (h *InvoiceHandler) Confirm(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)

	var currentStatus string
	var customerID int
	database.DB.QueryRow("SELECT status, customer_id FROM invoices WHERE id = $1", id).Scan(&currentStatus, &customerID)
	if currentStatus == "" {
		respondError(c, http.StatusNotFound, "فاکتور یافت نشد")
		return
	}
	if currentStatus != "proforma" {
		respondError(c, http.StatusBadRequest, "فقط فاکتورهای پیش‌فاکتور قابل تایید هستند")
		return
	}

	var creditLimit, outstanding float64
	database.DB.QueryRow("SELECT credit_limit FROM customers WHERE id = $1", customerID).Scan(&creditLimit)
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(total), 0) - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id = $1), 0) FROM (
			SELECT COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0) as total
			FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
			WHERE i.customer_id = $1 AND i.id != $2 AND i.status IN ('confirmed','dispatched','delivered')
		) sub`, customerID, id,
	).Scan(&outstanding)

	if creditLimit > 0 && outstanding >= creditLimit {
		respondError(c, http.StatusBadRequest, fmt.Sprintf("سقف اعتبار فراتر رفته است (مانده: %.2f، سقف: %.2f)", outstanding, creditLimit))
		return
	}

	h.transitionInvoiceStatus(c, id, currentStatus, "confirmed", userID)
}

func (h *InvoiceHandler) Dispatch(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM invoices WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus != "confirmed" {
		respondError(c, http.StatusBadRequest, "فقط فاکتورهای تایید‌شده قابل ارسال هستند")
		return
	}

	var req struct {
		VehicleID int `json:"vehicle_id"`
		PackerID  int `json:"packer_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	rows, err := database.DB.Query("SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type stockCheck struct {
		ProductID int
		Quantity  float64
		Available float64
		Name      string
	}
	var checks []stockCheck
	insufficient := false

	for rows.Next() {
		var sc stockCheck
		rows.Scan(&sc.ProductID, &sc.Quantity)
		database.DB.QueryRow("SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id = $1", sc.ProductID).Scan(&sc.Available)
		database.DB.QueryRow("SELECT name FROM products WHERE id = $1", sc.ProductID).Scan(&sc.Name)
		if sc.Available < sc.Quantity {
			insufficient = true
		}
		checks = append(checks, sc)
	}

	if insufficient {
		errItems := []gin.H{}
		for _, sc := range checks {
			if sc.Available < sc.Quantity {
				errItems = append(errItems, gin.H{
					"product_id":  sc.ProductID,
					"product_name": sc.Name,
					"available":   sc.Available,
					"required":    sc.Quantity,
				})
			}
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "موجودی کافی نیست", "items": errItems})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	for _, sc := range checks {
		_, err := tx.Exec(
			"INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, reference_type, performed_by) VALUES ($1, $2, 'sale_out', $3, 'sale_invoice', $4)",
			sc.ProductID, -sc.Quantity, id, userID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در ثبت حرکت انبار")
			return
		}
	}

	_, err = tx.Exec(
		"UPDATE invoices SET status='dispatched', dispatched_by=$1, dispatched_at=NOW(), vehicle_id=$2, packer_id=$3, updated_at=NOW() WHERE id=$4",
		userID, req.VehicleID, req.PackerID, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}

	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('invoice', $1, $2, 'dispatched', $3)", id, currentStatus, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییر وضعیت")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "فاکتور ارسال شد"})
}

func (h *InvoiceHandler) Deliver(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)
	h.transitionInvoiceStatus(c, id, "dispatched", "delivered", userID)
}

func (h *InvoiceHandler) Cancel(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM invoices WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus == "" {
		respondError(c, http.StatusNotFound, "فاکتور یافت نشد")
		return
	}
	if currentStatus == "delivered" {
		respondError(c, http.StatusBadRequest, "فاکتور تحویل‌شده قابل لغو نیست")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	if currentStatus == "dispatched" {
		rows, err := tx.Query("SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1", id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
			return
		}
		defer rows.Close()
		for rows.Next() {
			var pid int
			var qty float64
			rows.Scan(&pid, &qty)
			_, err := tx.Exec(
				"INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, reference_type, performed_by) VALUES ($1, $2, 'adjustment', $3, 'sale_invoice', $4)",
				pid, qty, id, userID,
			)
			if err != nil {
				respondError(c, http.StatusInternalServerError, "خطا در ثبت حرکت انبار")
				return
			}
		}
	}

	_, err = tx.Exec("UPDATE invoices SET status='cancelled', updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('invoice', $1, $2, 'cancelled', $3)", id, currentStatus, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییر وضعیت")
		return
	}
	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "فاکتور لغو شد"})
}

func (h *InvoiceHandler) Return(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)

	var req struct {
		Items []struct {
			ProductID int     `json:"product_id"`
			Quantity  float64 `json:"quantity"`
			Reason    string  `json:"reason"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	for _, item := range req.Items {
		_, err := tx.Exec(
			"INSERT INTO returns (invoice_id, product_id, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5)",
			id, item.ProductID, item.Quantity, item.Reason, userID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در ثبت مرجوعی")
			return
		}
		_, err = tx.Exec(
			"INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, reference_type, performed_by) VALUES ($1, $2, 'return_in', $3, 'sale_invoice', $4)",
			item.ProductID, item.Quantity, id, userID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در ثبت حرکت انبار")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "مرجوعی ثبت شد"})
}

func (h *InvoiceHandler) transitionInvoiceStatus(c *gin.Context, id int, fromStatus, toStatus string, userID int) {
	var currentStatus string
	database.DB.QueryRow("SELECT status FROM invoices WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus == "" {
		respondError(c, http.StatusNotFound, "فاکتور یافت نشد")
		return
	}
	if currentStatus != fromStatus {
		respondError(c, http.StatusBadRequest, fmt.Sprintf("تغییر وضعیت از %s به %s امکان‌پذیر نیست", currentStatus, toStatus))
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE invoices SET status=$1, updated_at=NOW() WHERE id=$2", toStatus, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('invoice', $1, $2, $3, $4)", id, fromStatus, toStatus, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییر وضعیت")
		return
	}
	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": fmt.Sprintf("وضعیت به %s تغییر یافت", toStatus)})
}

func (h *InvoiceHandler) getItems(invoiceID int) ([]model.InvoiceItem, error) {
	rows, err := database.DB.Query(
		"SELECT id, invoice_id, product_id, quantity, unit_price, discount_amount, price_override_reason, price_overridden_by FROM invoice_items WHERE invoice_id = $1", invoiceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.InvoiceItem{}
	for rows.Next() {
		var item model.InvoiceItem
		var overriddenBy sql.NullInt64
		if err := rows.Scan(&item.ID, &item.InvoiceID, &item.ProductID, &item.Quantity, &item.UnitPrice, &item.DiscountAmount, &item.PriceOverrideReason, &overriddenBy); err != nil {
			return nil, err
		}
		if overriddenBy.Valid {
			v := int(overriddenBy.Int64)
			item.PriceOverriddenBy = &v
		}
		items = append(items, item)
	}
	return items, nil
}
