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

type PurchaseOrderHandler struct{}

func NewPurchaseOrderHandler() *PurchaseOrderHandler {
	return &PurchaseOrderHandler{}
}

func (h *PurchaseOrderHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := "SELECT id, supplier_id, created_by, status, expected_delivery_date, supplier_invoice_number, notes, received_by, received_at, created_at, updated_at FROM purchase_orders WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status := c.Query("status"); status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
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
	countQuery := strings.Replace(query, "SELECT id, supplier_id, created_by, status, expected_delivery_date, supplier_invoice_number, notes, received_by, received_at, created_at, updated_at", "SELECT COUNT(*)", 1)
	database.DB.QueryRow(countQuery, args...).Scan(&totalCount)

	offset := (p.Page - 1) * p.PageSize
	query += fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.PageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	orders := []model.PurchaseOrder{}
	for rows.Next() {
		var po model.PurchaseOrder
		var edDate, recAt, supplierInvoiceNumber, notes sql.NullString
		var recBy sql.NullInt64
		if err := rows.Scan(&po.ID, &po.SupplierID, &po.CreatedBy, &po.Status, &edDate, &supplierInvoiceNumber, &notes, &recBy, &recAt, &po.CreatedAt, &po.UpdatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "scan error")
			return
		}
		po.SupplierInvoiceNumber = supplierInvoiceNumber.String
		po.Notes = notes.String
		if edDate.Valid {
			po.ExpectedDeliveryDate = &edDate.String
		}
		if recBy.Valid {
			v := int(recBy.Int64)
			po.ReceivedBy = &v
		}
		if recAt.Valid {
			po.ReceivedAt = &recAt.String
		}
		orders = append(orders, po)
	}

	for i := range orders {
		items, _ := h.getItems(orders[i].ID)
		orders[i].Items = items
	}

	respondJSONWithMeta(c, http.StatusOK, orders, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *PurchaseOrderHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	var po model.PurchaseOrder
	var edDate, recAt, supplierInvoiceNumber, notes sql.NullString
	var recBy sql.NullInt64
	err = database.DB.QueryRow(
		"SELECT id, supplier_id, created_by, status, expected_delivery_date, supplier_invoice_number, notes, received_by, received_at, created_at, updated_at FROM purchase_orders WHERE id = $1", id,
	).Scan(&po.ID, &po.SupplierID, &po.CreatedBy, &po.Status, &edDate, &supplierInvoiceNumber, &notes, &recBy, &recAt, &po.CreatedAt, &po.UpdatedAt)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "purchase order not found")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	po.SupplierInvoiceNumber = supplierInvoiceNumber.String
	po.Notes = notes.String
	if edDate.Valid {
		po.ExpectedDeliveryDate = &edDate.String
	}
	if recBy.Valid {
		v := int(recBy.Int64)
		po.ReceivedBy = &v
	}
	if recAt.Valid {
		po.ReceivedAt = &recAt.String
	}
	items, _ := h.getItems(po.ID)
	po.Items = items
	respondJSON(c, http.StatusOK, po)
}

func (h *PurchaseOrderHandler) Create(c *gin.Context) {
	var po model.PurchaseOrder
	if err := c.ShouldBindJSON(&po); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if po.SupplierID == 0 || len(po.Items) == 0 {
		respondError(c, http.StatusBadRequest, "supplier_id and items are required")
		return
	}
	userID := getUserID(c)

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "transaction error")
		return
	}
	defer tx.Rollback()

	var edDate interface{}
	if po.ExpectedDeliveryDate != nil {
		edDate = *po.ExpectedDeliveryDate
	}
	err = tx.QueryRow(
		`INSERT INTO purchase_orders (supplier_id, created_by, status, expected_delivery_date, supplier_invoice_number, notes)
		 VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id, created_at, updated_at`,
		po.SupplierID, userID, edDate, po.SupplierInvoiceNumber, po.Notes,
	).Scan(&po.ID, &po.CreatedAt, &po.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}

	for _, item := range po.Items {
		_, err := tx.Exec(
			"INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_quantity, unit_price) VALUES ($1, $2, $3, $4)",
			po.ID, item.ProductID, item.OrderedQuantity, item.UnitPrice,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "failed to insert item")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "commit error")
		return
	}

	po.Status = "pending"
	items, _ := h.getItems(po.ID)
	po.Items = items
	respondJSON(c, http.StatusCreated, po)
}

func (h *PurchaseOrderHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM purchase_orders WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus != "pending" {
		respondError(c, http.StatusBadRequest, "can only update pending orders")
		return
	}

	var po model.PurchaseOrder
	if err := c.ShouldBindJSON(&po); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "transaction error")
		return
	}
	defer tx.Rollback()

	var edDate interface{}
	if po.ExpectedDeliveryDate != nil {
		edDate = *po.ExpectedDeliveryDate
	}
	_, err = tx.Exec(
		`UPDATE purchase_orders SET supplier_id=$1, expected_delivery_date=$2, supplier_invoice_number=$3, notes=$4, updated_at=NOW() WHERE id=$5 AND status='draft'`,
		po.SupplierID, edDate, po.SupplierInvoiceNumber, po.Notes, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}

	tx.Exec("DELETE FROM purchase_order_items WHERE purchase_order_id = $1", id)
	for _, item := range po.Items {
		_, err := tx.Exec(
			"INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_quantity, unit_price) VALUES ($1, $2, $3, $4)",
			id, item.ProductID, item.OrderedQuantity, item.UnitPrice,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "failed to insert item")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "commit error")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "updated"})
}

func (h *PurchaseOrderHandler) Confirm(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID := getUserID(c)
	h.transitionStatus(c, id, "pending", "shipped", userID)
}

func (h *PurchaseOrderHandler) MarkAwaitingDelivery(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID := getUserID(c)
	h.transitionStatus(c, id, "shipped", "partially_received", userID)
}

func (h *PurchaseOrderHandler) Receive(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID := getUserID(c)

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM purchase_orders WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus != "shipped" && currentStatus != "partially_received" {
		respondError(c, http.StatusBadRequest, "order must be shipped or partially_received to receive")
		return
	}

	var req struct {
		Items []struct {
			ProductID        int      `json:"product_id"`
			OrderedQuantity  float64  `json:"ordered_quantity"`
			UnitPrice        float64  `json:"unit_price"`
			ReceivedQuantity float64  `json:"received_quantity"`
			DiscrepancyNote  string   `json:"discrepancy_note"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "transaction error")
		return
	}
	defer tx.Rollback()

	for _, item := range req.Items {
		rq := item.OrderedQuantity
		if item.ReceivedQuantity > 0 {
			rq = item.ReceivedQuantity
		}
		_, err := tx.Exec(
			"UPDATE purchase_order_items SET received_quantity=$1, discrepancy_note=$2 WHERE purchase_order_id=$3 AND product_id=$4",
			rq, item.DiscrepancyNote, id, item.ProductID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "failed to update item")
			return
		}
		_, err = tx.Exec(
			"INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, reference_type, performed_by) VALUES ($1, $2, 'purchase_in', $3, 'purchase_order', $4)",
			item.ProductID, rq, id, userID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "failed to create stock movement")
			return
		}
	}

	_, err = tx.Exec("UPDATE purchase_orders SET status='received', received_by=$1, received_at=NOW(), updated_at=NOW() WHERE id=$2", userID, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to update status")
		return
	}

	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('purchase_order', $1, $2, 'received', $3)", id, currentStatus, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to log status")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "commit error")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "goods received"})
}

func (h *PurchaseOrderHandler) Cancel(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID := getUserID(c)
	h.transitionStatus(c, id, "", "cancelled", userID)
}

func (h *PurchaseOrderHandler) UpdatePayment(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}

	var req struct {
		PaidAmount float64 `json:"paid_amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	_, err = database.DB.Exec("UPDATE purchase_orders SET notes = notes, updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "payment recorded", "paid_amount": req.PaidAmount})
}

func (h *PurchaseOrderHandler) Stats(c *gin.Context) {
	var totalOrders, totalAmount, pendingCount float64
	database.DB.QueryRow("SELECT COUNT(*), COALESCE(SUM(ordered_total),0) FROM (SELECT po.id, COALESCE(SUM(poi.ordered_quantity * poi.unit_price),0) as ordered_total FROM purchase_orders po LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id GROUP BY po.id) sub WHERE status != 'cancelled'").Scan(&totalOrders, &totalAmount)
	database.DB.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status IN ('pending','shipped','partially_received')").Scan(&pendingCount)
	respondJSON(c, http.StatusOK, gin.H{
		"total_orders": totalOrders,
		"total_amount": totalAmount,
		"pending_count": pendingCount,
	})
}

func (h *PurchaseOrderHandler) transitionStatus(c *gin.Context, id int, fromStatus, toStatus string, userID int) {
	var currentStatus string
	database.DB.QueryRow("SELECT status FROM purchase_orders WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus == "" {
		respondError(c, http.StatusNotFound, "purchase order not found")
		return
	}
	if fromStatus != "" && currentStatus != fromStatus {
		respondError(c, http.StatusBadRequest, fmt.Sprintf("cannot transition from %s to %s", currentStatus, toStatus))
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "transaction error")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE purchase_orders SET status=$1, updated_at=NOW() WHERE id=$2", toStatus, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('purchase_order', $1, $2, $3, $4)", id, currentStatus, toStatus, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "failed to log status")
		return
	}
	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "commit error")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": fmt.Sprintf("status changed to %s", toStatus)})
}

func (h *PurchaseOrderHandler) getItems(poID int) ([]model.POItem, error) {
	rows, err := database.DB.Query(
		"SELECT id, purchase_order_id, product_id, ordered_quantity, unit_price, received_quantity, discrepancy_note FROM purchase_order_items WHERE purchase_order_id = $1", poID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.POItem{}
	for rows.Next() {
		var item model.POItem
		var recQty sql.NullFloat64
		if err := rows.Scan(&item.ID, &item.PurchaseOrderID, &item.ProductID, &item.OrderedQuantity, &item.UnitPrice, &recQty, &item.DiscrepancyNote); err != nil {
			return nil, err
		}
		if recQty.Valid {
			item.ReceivedQuantity = &recQty.Float64
		}
		items = append(items, item)
	}
	return items, nil
}
