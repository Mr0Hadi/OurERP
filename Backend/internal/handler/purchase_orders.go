package handler

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

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
	query := "SELECT po.id, po.supplier_id, COALESCE(s.name,''), po.created_by, po.status, po.expected_delivery_date, po.supplier_invoice_number, po.notes, COALESCE(paid_amount,0), COALESCE(total_amount,0), COALESCE(payment_type,'cash'), po.mixed_payments, po.created_at, po.updated_at FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status := c.Query("status"); status != "" {
		statuses := strings.Split(status, ",")
		placeholders := make([]string, len(statuses))
		for i, s := range statuses {
			placeholders[i] = fmt.Sprintf("$%d", argIdx)
			args = append(args, strings.TrimSpace(s))
			argIdx++
		}
		query += fmt.Sprintf(" AND po.status IN (%s)", strings.Join(placeholders, ","))
	}
	if from := c.Query("from"); from != "" {
		query += fmt.Sprintf(" AND po.created_at >= $%d", argIdx)
		args = append(args, from)
		argIdx++
	}
	if to := c.Query("to"); to != "" {
		query += fmt.Sprintf(" AND po.created_at <= $%d", argIdx)
		args = append(args, to)
		argIdx++
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM purchase_orders po WHERE 1=1"
	countArgs := []interface{}{}
	countIdx := 1
	if status := c.Query("status"); status != "" {
		statuses := strings.Split(status, ",")
		placeholders := make([]string, len(statuses))
		for i, s := range statuses {
			placeholders[i] = fmt.Sprintf("$%d", countIdx)
			countArgs = append(countArgs, strings.TrimSpace(s))
			countIdx++
		}
		countQuery += fmt.Sprintf(" AND po.status IN (%s)", strings.Join(placeholders, ","))
	}
	if from := c.Query("from"); from != "" {
		countQuery += fmt.Sprintf(" AND po.created_at >= $%d", countIdx)
		countArgs = append(countArgs, from)
		countIdx++
	}
	if to := c.Query("to"); to != "" {
		countQuery += fmt.Sprintf(" AND po.created_at <= $%d", countIdx)
		countArgs = append(countArgs, to)
		countIdx++
	}
	database.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)

	offset := (p.Page - 1) * p.PageSize
	query += fmt.Sprintf(" ORDER BY po.id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.PageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	orders := []model.PurchaseOrder{}
	for rows.Next() {
		var po model.PurchaseOrder
		var edDate sql.NullString
		if err := rows.Scan(&po.ID, &po.SupplierID, &po.SupplierName, &po.CreatedBy, &po.Status, &edDate, &po.InvoiceNumber, &po.Notes, &po.PaidAmount, &po.TotalAmount, &po.PaymentType, &po.MixedPayments, &po.CreatedAt, &po.UpdatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در خواندن اطلاعات")
			return
		}
		if edDate.Valid {
			po.ExpectedDeliveryDate = &edDate.String
		}
		po.Description = po.Notes
		po.InvoiceDate = po.CreatedAt.Format("2006-01-02")
		orders = append(orders, po)
	}

	for i := range orders {
		items, err := h.getItems(orders[i].ID)
		if err != nil {
			log.Printf("ERROR fetching items for PO %d: %v", orders[i].ID, err)
		}
		orders[i].Items = items
	}

	respondJSONWithMeta(c, http.StatusOK, orders, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *PurchaseOrderHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var po model.PurchaseOrder
	var edDate sql.NullString
	err = database.DB.QueryRow(
		"SELECT po.id, po.supplier_id, COALESCE(s.name,''), po.created_by, po.status, po.expected_delivery_date, po.supplier_invoice_number, po.notes, COALESCE(paid_amount,0), COALESCE(total_amount,0), COALESCE(payment_type,'cash'), po.mixed_payments, po.created_at, po.updated_at FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = $1", id,
	).Scan(&po.ID, &po.SupplierID, &po.SupplierName, &po.CreatedBy, &po.Status, &edDate, &po.InvoiceNumber, &po.Notes, &po.PaidAmount, &po.TotalAmount, &po.PaymentType, &po.MixedPayments, &po.CreatedAt, &po.UpdatedAt)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "سفارش خرید یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	if edDate.Valid {
		po.ExpectedDeliveryDate = &edDate.String
	}
	po.Description = po.Notes
	po.InvoiceDate = po.CreatedAt.Format("2006-01-02")
	items, err := h.getItems(po.ID)
	if err != nil {
		log.Printf("ERROR fetching items for PO %d: %v", po.ID, err)
	}
	po.Items = items
	respondJSON(c, http.StatusOK, po)
}

func (h *PurchaseOrderHandler) Create(c *gin.Context) {
	var po model.PurchaseOrder
	if err := c.ShouldBindJSON(&po); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if po.SupplierID == 0 || len(po.Items) == 0 {
		respondError(c, http.StatusBadRequest, "شناسه تامین‌کننده و آیتم‌ها الزامی هستند")
		return
	}
	userID := getUserID(c)

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	var edDate *time.Time
	if po.ExpectedDeliveryDate != nil {
		parsed, err := time.Parse("2006-01-02", *po.ExpectedDeliveryDate)
		if err == nil {
			edDate = &parsed
		}
	}
	err = tx.QueryRow(
		`INSERT INTO purchase_orders (supplier_id, created_by, status, expected_delivery_date, supplier_invoice_number, notes, payment_type, paid_amount, mixed_payments)
		 VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8) RETURNING id, created_at, updated_at`,
		po.SupplierID, userID, edDate, po.InvoiceNumber, po.Notes, po.PaymentType, po.PaidAmount, po.MixedPayments,
	).Scan(&po.ID, &po.CreatedAt, &po.UpdatedAt)
	if err != nil {
		log.Printf("ERROR creating purchase order: %v", err)
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}

	var totalAmount float64
	responseItems := make([]model.POItem, len(po.Items))
	for i, item := range po.Items {
		var productCode, productName string
		database.DB.QueryRow("SELECT COALESCE(internal_code,''), COALESCE(name,'') FROM products WHERE id = $1", item.ProductID).Scan(&productCode, &productName)
		lineTotal := item.Qty*item.UnitPrice - item.Discount
		totalAmount += lineTotal
		_, err := tx.Exec(
			"INSERT INTO purchase_order_items (purchase_order_id, product_id, product_code, product_name, ordered_quantity, unit_price, discount, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
			po.ID, item.ProductID, productCode, productName, item.Qty, item.UnitPrice, item.Discount, lineTotal,
		)
		if err != nil {
			log.Printf("ERROR inserting item for PO %d (product_id=%d): %v", po.ID, item.ProductID, err)
			respondError(c, http.StatusInternalServerError, "خطا در ثبت آیتم")
			return
		}
		responseItems[i] = model.POItem{
			PurchaseOrderID: po.ID,
			ProductID:       item.ProductID,
			ProductCode:     productCode,
			ProductName:     productName,
			Qty:             item.Qty,
			OrderedQty:      item.Qty,
			UnitPrice:       item.UnitPrice,
			Discount:        item.Discount,
			LineTotal:       lineTotal,
		}
	}

	_, err = tx.Exec("UPDATE purchase_orders SET total_amount=$1 WHERE id=$2", totalAmount, po.ID)
	if err != nil {
		log.Printf("ERROR updating total_amount for PO %d: %v", po.ID, err)
		respondError(c, http.StatusInternalServerError, "خطا در ثبت مبلغ")
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("ERROR committing PO %d: %v", po.ID, err)
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	database.DB.QueryRow("SELECT COALESCE(s.name,'') FROM suppliers s WHERE s.id = $1", po.SupplierID).Scan(&po.SupplierName)
	po.Status = "pending"
	po.TotalAmount = totalAmount
	po.Items = responseItems
	po.InvoiceDate = po.CreatedAt.Format("2006-01-02")
	po.Description = po.Notes
	respondJSON(c, http.StatusCreated, po)
}

func (h *PurchaseOrderHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}

	var po model.PurchaseOrder
	if err := c.ShouldBindJSON(&po); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	var edDate *time.Time
	if po.ExpectedDeliveryDate != nil {
		parsed, err := time.Parse("2006-01-02", *po.ExpectedDeliveryDate)
		if err == nil {
			edDate = &parsed
		}
	}

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM purchase_orders WHERE id = $1", id).Scan(&currentStatus)

	if po.Status != "" && po.Status != currentStatus {
		_, err = tx.Exec(
			`UPDATE purchase_orders SET supplier_id=$1, expected_delivery_date=$2, supplier_invoice_number=$3, notes=$4, payment_type=$5, paid_amount=$6, status=$7, mixed_payments=$8, updated_at=NOW() WHERE id=$9`,
			po.SupplierID, edDate, po.InvoiceNumber, po.Notes, po.PaymentType, po.PaidAmount, po.Status, po.MixedPayments, id,
		)
		if err != nil {
			log.Printf("ERROR updating purchase order %d: %v", id, err)
			respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
			return
		}
		_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('purchase_order', $1, $2, $3, $4)", id, currentStatus, po.Status, getUserID(c))
		if err != nil {
			log.Printf("ERROR logging status change for PO %d: %v", id, err)
		}
	} else {
		_, err = tx.Exec(
			`UPDATE purchase_orders SET supplier_id=$1, expected_delivery_date=$2, supplier_invoice_number=$3, notes=$4, payment_type=$5, paid_amount=$6, mixed_payments=$7, updated_at=NOW() WHERE id=$8`,
			po.SupplierID, edDate, po.InvoiceNumber, po.Notes, po.PaymentType, po.PaidAmount, po.MixedPayments, id,
		)
		if err != nil {
			log.Printf("ERROR updating purchase order %d: %v", id, err)
			respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
			return
		}
	}

	tx.Exec("DELETE FROM purchase_order_items WHERE purchase_order_id = $1", id)
	var totalAmount float64
	responseItems := make([]model.POItem, len(po.Items))
	for i, item := range po.Items {
		var productCode, productName string
		database.DB.QueryRow("SELECT COALESCE(internal_code,''), COALESCE(name,'') FROM products WHERE id = $1", item.ProductID).Scan(&productCode, &productName)
		lineTotal := item.Qty*item.UnitPrice - item.Discount
		totalAmount += lineTotal
		var receivedQty interface{}
		if item.ReceivedQty != nil {
			receivedQty = *item.ReceivedQty
		}
		_, err := tx.Exec(
			"INSERT INTO purchase_order_items (purchase_order_id, product_id, product_code, product_name, ordered_quantity, unit_price, discount, line_total, received_quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
			id, item.ProductID, productCode, productName, item.Qty, item.UnitPrice, item.Discount, lineTotal, receivedQty,
		)
		if err != nil {
			log.Printf("ERROR inserting item for PO %d (product_id=%d): %v", id, item.ProductID, err)
			respondError(c, http.StatusInternalServerError, "خطا در ثبت آیتم")
			return
		}
		responseItems[i] = model.POItem{
			PurchaseOrderID: id,
			ProductID:       item.ProductID,
			ProductCode:     productCode,
			ProductName:     productName,
			Qty:             item.Qty,
			OrderedQty:      item.Qty,
			UnitPrice:       item.UnitPrice,
			Discount:        item.Discount,
			ReceivedQty:     item.ReceivedQty,
			LineTotal:       lineTotal,
		}
	}

	_, err = tx.Exec("UPDATE purchase_orders SET total_amount=$1 WHERE id=$2", totalAmount, id)
	if err != nil {
		log.Printf("ERROR updating total_amount for PO %d: %v", id, err)
		respondError(c, http.StatusInternalServerError, "خطا در ثبت مبلغ")
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("ERROR committing PO %d: %v", id, err)
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	database.DB.QueryRow("SELECT COALESCE(s.name,'') FROM suppliers s WHERE s.id = $1", po.SupplierID).Scan(&po.SupplierName)
	po.ID = id
	if po.Status == "" {
		po.Status = "pending"
	}
	po.TotalAmount = totalAmount
	po.Items = responseItems
	po.InvoiceDate = po.CreatedAt.Format("2006-01-02")
	po.Description = po.Notes
	respondJSON(c, http.StatusOK, po)
}

func (h *PurchaseOrderHandler) Confirm(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)
	h.transitionStatus(c, id, "pending", "shipped", userID)
}

func (h *PurchaseOrderHandler) MarkAwaitingDelivery(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)
	h.transitionStatus(c, id, "shipped", "partially_received", userID)
}

func (h *PurchaseOrderHandler) Receive(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)

	var currentStatus string
	database.DB.QueryRow("SELECT status FROM purchase_orders WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus != "shipped" && currentStatus != "partially_received" {
		respondError(c, http.StatusBadRequest, "سفارش باید ارسال‌شده یا ناقص دریافت‌شده باشد تا دریافت شود")
		return
	}

	var req struct {
		Status string `json:"status"`
		Items  []struct {
			ProductID       int     `json:"productId"`
			Qty             float64 `json:"qty"`
			OrderedQty      float64 `json:"orderedQty"`
			UnitPrice       float64 `json:"unitPrice"`
			ReceivedQty     float64 `json:"receivedQty"`
			DiscrepancyNote string  `json:"discrepancyNote"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	newStatus := "received"
	if req.Status == "partially_received" {
		newStatus = "partially_received"
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	for _, item := range req.Items {
		rq := item.Qty
		if item.ReceivedQty > 0 {
			rq = item.ReceivedQty
		}
		_, err := tx.Exec(
			"UPDATE purchase_order_items SET received_quantity=$1, discrepancy_note=$2 WHERE purchase_order_id=$3 AND product_id=$4",
			rq, item.DiscrepancyNote, id, item.ProductID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در به‌روزرسانی آیتم")
			return
		}
		_, err = tx.Exec(
			"INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, reference_type, performed_by) VALUES ($1, $2, 'purchase_in', $3, 'purchase_order', $4)",
			item.ProductID, rq, id, userID,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در ثبت حرکت انبار")
			return
		}
	}

	_, err = tx.Exec("UPDATE purchase_orders SET status=$1, received_by=$2, received_at=NOW(), updated_at=NOW() WHERE id=$3", newStatus, userID, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در به‌روزرسانی وضعیت")
		return
	}

	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('purchase_order', $1, $2, $3, $4)", id, currentStatus, newStatus, userID)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییر وضعیت")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در ثبت تغییرات")
		return
	}

	respondJSON(c, http.StatusOK, gin.H{"message": "کالا دریافت شد"})
}

func (h *PurchaseOrderHandler) Cancel(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	userID := getUserID(c)
	h.transitionStatus(c, id, "", "cancelled", userID)
}

func (h *PurchaseOrderHandler) UpdatePayment(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}

	var req struct {
		PaidAmount  float64 `json:"paidAmount"`
		PaymentType string  `json:"paymentType"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	if req.PaymentType != "" {
		_, err = database.DB.Exec("UPDATE purchase_orders SET paid_amount=$1, payment_type=$2, updated_at=NOW() WHERE id=$3", req.PaidAmount, req.PaymentType, id)
	} else {
		_, err = database.DB.Exec("UPDATE purchase_orders SET paid_amount=$1, updated_at=NOW() WHERE id=$2", req.PaidAmount, id)
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "پرداخت ثبت شد", "paidAmount": req.PaidAmount})
}

func (h *PurchaseOrderHandler) Stats(c *gin.Context) {
	var totalOrders, totalAmount, pendingCount float64
	database.DB.QueryRow("SELECT COUNT(*), COALESCE(SUM(ordered_total),0) FROM (SELECT po.id, COALESCE(SUM(poi.ordered_quantity * poi.unit_price),0) as ordered_total FROM purchase_orders po LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id GROUP BY po.id) sub WHERE status != 'cancelled'").Scan(&totalOrders, &totalAmount)
	database.DB.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status IN ('pending','shipped','partially_received')").Scan(&pendingCount)
	respondJSON(c, http.StatusOK, gin.H{
		"totalOrders": totalOrders,
		"totalAmount": totalAmount,
		"pendingCount": pendingCount,
	})
}

func (h *PurchaseOrderHandler) transitionStatus(c *gin.Context, id int, fromStatus, toStatus string, userID int) {
	var currentStatus string
	database.DB.QueryRow("SELECT status FROM purchase_orders WHERE id = $1", id).Scan(&currentStatus)
	if currentStatus == "" {
		respondError(c, http.StatusNotFound, "سفارش خرید یافت نشد")
		return
	}
	if fromStatus != "" && currentStatus != fromStatus {
		respondError(c, http.StatusBadRequest, fmt.Sprintf("تغییر وضعیت از %s به %s امکان‌پذیر نیست", currentStatus, toStatus))
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطا در انجام تراکنش")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE purchase_orders SET status=$1, updated_at=NOW() WHERE id=$2", toStatus, id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	_, err = tx.Exec("INSERT INTO status_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('purchase_order', $1, $2, $3, $4)", id, currentStatus, toStatus, userID)
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

func (h *PurchaseOrderHandler) getItems(poID int) ([]model.POItem, error) {
	rows, err := database.DB.Query(
		"SELECT id, purchase_order_id, product_id, COALESCE(product_code,''), COALESCE(product_name,''), ordered_quantity, unit_price, discount, line_total, received_quantity, COALESCE(discrepancy_note,'') FROM purchase_order_items WHERE purchase_order_id = $1", poID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.POItem{}
	for rows.Next() {
		var item model.POItem
		var recQty sql.NullFloat64
		if err := rows.Scan(&item.ID, &item.PurchaseOrderID, &item.ProductID, &item.ProductCode, &item.ProductName, &item.OrderedQty, &item.UnitPrice, &item.Discount, &item.LineTotal, &recQty, &item.DiscrepancyNote); err != nil {
			return nil, err
		}
		item.Qty = item.OrderedQty
		if recQty.Valid {
			item.ReceivedQty = &recQty.Float64
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
