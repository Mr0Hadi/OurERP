package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
)

type StockHandler struct{}

func NewStockHandler() *StockHandler {
	return &StockHandler{}
}

func (h *StockHandler) CurrentLevels(c *gin.Context) {
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

	type StockItem struct {
		ProductID        int     `json:"productId"`
		InternalCode     string  `json:"internalCode"`
		Name             string  `json:"name"`
		CurrentStock     float64 `json:"currentStock"`
		ReorderThreshold float64 `json:"reorderThreshold"`
		IsLowStock       bool    `json:"isLowStock"`
	}

	items := []StockItem{}
	for rows.Next() {
		var item StockItem
		if err := rows.Scan(&item.ProductID, &item.InternalCode, &item.Name, &item.CurrentStock, &item.ReorderThreshold, &item.IsLowStock); err != nil {
			continue
		}
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *StockHandler) ProductHistory(c *gin.Context) {
	productID, err := parseIntParam(c, "product_id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه کالا نامعتبر است")
		return
	}

	type MovementItem struct {
		ID            int     `json:"id"`
		Quantity      float64 `json:"quantity"`
		MovementType  string  `json:"movementType"`
		ReferenceID   *int    `json:"referenceId,omitempty"`
		ReferenceType string  `json:"referenceType,omitempty"`
		PerformedBy   int     `json:"performedBy"`
		CreatedAt     string  `json:"createdAt"`
	}

	rows, err := database.DB.Query(
		"SELECT id, quantity, movement_type, reference_id, reference_type, performed_by, created_at FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC", productID,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	defer rows.Close()

	items := []MovementItem{}
	for rows.Next() {
		var item MovementItem
		var refID sql.NullInt64
		var createdAt sql.NullString
		if err := rows.Scan(&item.ID, &item.Quantity, &item.MovementType, &refID, &item.ReferenceType, &item.PerformedBy, &createdAt); err != nil {
			continue
		}
		if refID.Valid { v := int(refID.Int64); item.ReferenceID = &v }
		if createdAt.Valid { item.CreatedAt = createdAt.String }
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}
