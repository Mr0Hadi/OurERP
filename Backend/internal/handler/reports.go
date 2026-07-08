package handler

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
)

type ReportHandler struct{}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

func (h *ReportHandler) Stock(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT p.id, p.internal_code, p.name, COALESCE(SUM(sm.quantity), 0) as current_stock, p.reorder_threshold,
			CASE WHEN COALESCE(SUM(sm.quantity), 0) <= p.reorder_threshold THEN true ELSE false END as is_low_stock
		FROM products p
		LEFT JOIN stock_movements sm ON sm.product_id = p.id
		WHERE p.is_active = true
		GROUP BY p.id, p.internal_code, p.name, p.reorder_threshold
		ORDER BY p.internal_code
	`)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type ReportItem struct {
		ProductID        int     `json:"product_id"`
		InternalCode     string  `json:"internal_code"`
		Name             string  `json:"name"`
		CurrentStock     float64 `json:"current_stock"`
		ReorderThreshold float64 `json:"reorder_threshold"`
		IsLowStock       bool    `json:"is_low_stock"`
	}

	items := []ReportItem{}
	for rows.Next() {
		var item ReportItem
		rows.Scan(&item.ProductID, &item.InternalCode, &item.Name, &item.CurrentStock, &item.ReorderThreshold, &item.IsLowStock)
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *ReportHandler) LowStock(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT p.id, p.internal_code, p.name, COALESCE(SUM(sm.quantity), 0) as current_stock, p.reorder_threshold
		FROM products p
		LEFT JOIN stock_movements sm ON sm.product_id = p.id
		WHERE p.is_active = true
		GROUP BY p.id, p.internal_code, p.name, p.reorder_threshold
		HAVING COALESCE(SUM(sm.quantity), 0) <= p.reorder_threshold
		ORDER BY current_stock ASC
	`)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type ReportItem struct {
		ProductID        int     `json:"product_id"`
		InternalCode     string  `json:"internal_code"`
		Name             string  `json:"name"`
		CurrentStock     float64 `json:"current_stock"`
		ReorderThreshold float64 `json:"reorder_threshold"`
	}

	items := []ReportItem{}
	for rows.Next() {
		var item ReportItem
		rows.Scan(&item.ProductID, &item.InternalCode, &item.Name, &item.CurrentStock, &item.ReorderThreshold)
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *ReportHandler) SalesSummary(c *gin.Context) {
	from := c.DefaultQuery("from", "1970-01-01")
	to := c.DefaultQuery("to", "2099-12-31")
	groupBy := c.DefaultQuery("group_by", "day")

	var selectClause string
	//var groupClause string
	switch groupBy {
	case "channel":
		selectClause = "i.channel"
		//groupClause = "i.channel"
	default:
		selectClause = "i.created_at::date"
		//groupClause = "i.created_at::date"
	}

	query := fmt.Sprintf(`
		SELECT %s as period,
			COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0) as total_amount,
			COUNT(DISTINCT i.id) as invoice_count
		FROM invoices i
		JOIN invoice_items ii ON ii.invoice_id = i.id
		WHERE i.status IN ('confirmed','dispatched','delivered')
		AND i.created_at >= $1 AND i.created_at <= $2
		GROUP BY period
		ORDER BY period
	`, selectClause)

	rows, err := database.DB.Query(query, from, to)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type SummaryItem struct {
		Period       string  `json:"period"`
		TotalAmount  float64 `json:"total_amount"`
		InvoiceCount int     `json:"invoice_count"`
	}

	items := []SummaryItem{}
	for rows.Next() {
		var item SummaryItem
		rows.Scan(&item.Period, &item.TotalAmount, &item.InvoiceCount)
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *ReportHandler) CustomerBalances(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT c.id, c.full_name, c.national_id, c.type,
			COALESCE((
				SELECT SUM(ii.quantity * ii.unit_price - ii.discount_amount)
				FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
				WHERE i.customer_id = c.id AND i.status IN ('confirmed','dispatched','delivered')
			), 0) - COALESCE((
				SELECT SUM(amount) FROM customer_payments WHERE customer_id = c.id
			), 0) as outstanding_balance
		FROM customers c
		WHERE c.is_active = true
		HAVING outstanding_balance > 0
		ORDER BY outstanding_balance DESC
	`)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type BalanceItem struct {
		CustomerID        int     `json:"customer_id"`
		FullName          string  `json:"full_name"`
		NationalID        string  `json:"national_id"`
		Type              string  `json:"type"`
		OutstandingBalance float64 `json:"outstanding_balance"`
	}

	items := []BalanceItem{}
	for rows.Next() {
		var item BalanceItem
		rows.Scan(&item.CustomerID, &item.FullName, &item.NationalID, &item.Type, &item.OutstandingBalance)
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *ReportHandler) PurchaseOrders(c *gin.Context) {
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
	query += " ORDER BY created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	type POReportItem struct {
		ID     int    `json:"id"`
		Status string `json:"status"`
		SupplierID int `json:"supplier_id"`
		CreatedBy  int `json:"created_by"`
		CreatedAt  string `json:"created_at"`
		ItemCount  int `json:"item_count"`
	}

	items := []POReportItem{}
	for rows.Next() {
		var item POReportItem
		var edDate, sInvNum, notes, recBy, recAt, createdAt, updatedAt sql.NullString
		rows.Scan(&item.ID, &item.SupplierID, &item.CreatedBy, &item.Status, &edDate, &sInvNum, &notes, &recBy, &recAt, &createdAt, &updatedAt)
		if createdAt.Valid { item.CreatedAt = createdAt.String }

		database.DB.QueryRow("SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = $1", item.ID).Scan(&item.ItemCount)
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *ReportHandler) Financial(c *gin.Context) {
	var totalRevenue, totalPaid, totalReceivable, totalPayable float64
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0)
		FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
		WHERE i.status IN ('confirmed','dispatched','delivered')`).Scan(&totalRevenue)

	database.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM customer_payments").Scan(&totalPaid)
	database.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM supplier_payments").Scan(&totalPayable)

	totalReceivable = totalRevenue - totalPaid
	respondJSON(c, http.StatusOK, gin.H{
		"total_revenue":   totalRevenue,
		"total_paid":      totalPaid,
		"total_receivable": totalReceivable,
		"total_payable":   totalPayable,
		"net_position":    totalRevenue - totalPaid - totalPayable,
	})
}

func (h *ReportHandler) ProfitLoss(c *gin.Context) {
	from := c.DefaultQuery("from", "1970-01-01")
	to := c.DefaultQuery("to", "2099-12-31")

	var totalRevenue, totalCOGS, totalPaid, totalPayable float64
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(ii.quantity * ii.unit_price - ii.discount_amount), 0)
		FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
		WHERE i.status IN ('confirmed','dispatched','delivered')
		AND i.created_at >= $1 AND i.created_at <= $2`, from, to).Scan(&totalRevenue)

	database.DB.QueryRow(`
		SELECT COALESCE(SUM(sm.quantity * p.cost_price), 0)
		FROM stock_movements sm JOIN products p ON p.id = sm.product_id
		WHERE sm.movement_type = 'sale_out'
		AND sm.created_at >= $1 AND sm.created_at <= $2`, from, to).Scan(&totalCOGS)

	database.DB.QueryRow(`
		SELECT COALESCE(SUM(amount), 0) FROM customer_payments
		WHERE payment_date >= $1 AND payment_date <= $2`, from, to).Scan(&totalPaid)
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(amount), 0) FROM supplier_payments
		WHERE payment_date >= $1 AND payment_date <= $2`, from, to).Scan(&totalPayable)

	grossProfit := totalRevenue - totalCOGS
	respondJSON(c, http.StatusOK, gin.H{
		"period_from":   from,
		"period_to":     to,
		"total_revenue": totalRevenue,
		"total_cogs":    totalCOGS,
		"gross_profit":  grossProfit,
		"total_paid":    totalPaid,
		"total_payable": totalPayable,
		"net_profit":    grossProfit - totalPayable + totalPaid,
	})
}
