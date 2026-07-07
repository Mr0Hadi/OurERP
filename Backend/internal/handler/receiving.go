package handler

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/model"
)

type ReceivingHandler struct{}

func NewReceivingHandler() *ReceivingHandler {
	return &ReceivingHandler{}
}

func (h *ReceivingHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := "SELECT id, purchase_order_id, supplier_name, warehouse_location, received_date, status, notes, created_by, created_at, updated_at FROM receivings WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status := c.Query("status"); status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if supplierName := c.Query("supplier_name"); supplierName != "" {
		query += fmt.Sprintf(" AND supplier_name ILIKE $%d", argIdx)
		args = append(args, "%"+supplierName+"%")
		argIdx++
	}
	if fromDate := c.Query("from_date"); fromDate != "" {
		query += fmt.Sprintf(" AND received_date >= $%d", argIdx)
		args = append(args, fromDate)
		argIdx++
	}
	if toDate := c.Query("to_date"); toDate != "" {
		query += fmt.Sprintf(" AND received_date <= $%d", argIdx)
		args = append(args, toDate)
		argIdx++
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM receivings WHERE 1=1"
	countArgs := []interface{}{}
	countIdx := 1
	if status := c.Query("status"); status != "" {
		countQuery += fmt.Sprintf(" AND status = $%d", countIdx)
		countArgs = append(countArgs, status)
		countIdx++
	}
	if supplierName := c.Query("supplier_name"); supplierName != "" {
		countQuery += fmt.Sprintf(" AND supplier_name ILIKE $%d", countIdx)
		countArgs = append(countArgs, "%"+supplierName+"%")
		countIdx++
	}
	database.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)

	offset := (p.Page - 1) * p.PageSize
	query += fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.PageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	receivings := []model.Receiving{}
	for rows.Next() {
		var r model.Receiving
		var poID sql.NullInt64
		var supplierName, warehouseLocation, notes sql.NullString
		if err := rows.Scan(&r.ID, &poID, &supplierName, &warehouseLocation, &r.ReceivedDate, &r.Status, &notes, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "scan error")
			return
		}
		r.SupplierName = supplierName.String
		r.WarehouseLocation = warehouseLocation.String
		r.Notes = notes.String
		if poID.Valid {
			v := int(poID.Int64)
			r.PurchaseOrderID = &v
		}
		receivings = append(receivings, r)
	}

	for i := range receivings {
		items, _ := h.getItems(receivings[i].ID)
		receivings[i].Items = items
	}

	respondJSONWithMeta(c, http.StatusOK, receivings, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *ReceivingHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}
	var r model.Receiving
	var poID sql.NullInt64
	var supplierName, warehouseLocation, notes sql.NullString
	err = database.DB.QueryRow(
		"SELECT id, purchase_order_id, supplier_name, warehouse_location, received_date, status, notes, created_by, created_at, updated_at FROM receivings WHERE id = $1", id,
	).Scan(&r.ID, &poID, &supplierName, &warehouseLocation, &r.ReceivedDate, &r.Status, &notes, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt)
	r.SupplierName = supplierName.String
	r.WarehouseLocation = warehouseLocation.String
	r.Notes = notes.String
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "receiving not found")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}
	if poID.Valid {
		v := int(poID.Int64)
		r.PurchaseOrderID = &v
	}
	items, _ := h.getItems(r.ID)
	r.Items = items
	respondJSON(c, http.StatusOK, r)
}

func (h *ReceivingHandler) Create(c *gin.Context) {
	var r model.Receiving
	if err := c.ShouldBindJSON(&r); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	userID := getUserID(c)

	if r.Status == "" {
		r.Status = "pending"
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "transaction error")
		return
	}
	defer tx.Rollback()

	var poID interface{}
	if r.PurchaseOrderID != nil {
		poID = *r.PurchaseOrderID
	}

	err = tx.QueryRow(
		`INSERT INTO receivings (purchase_order_id, supplier_name, warehouse_location, received_date, status, notes, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`,
		poID, r.SupplierName, r.WarehouseLocation, r.ReceivedDate, r.Status, r.Notes, userID,
	).Scan(&r.ID, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}

	for _, item := range r.Items {
		_, err := tx.Exec(
			"INSERT INTO receiving_items (receiving_id, product_id, product_code, product_name, expected_qty, received_qty, condition, notes) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7,''), NULLIF($8,''))",
			r.ID, item.ProductID, item.ProductCode, item.ProductName, item.ExpectedQty, item.ReceivedQty, item.Condition, item.Notes,
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

	respondJSON(c, http.StatusCreated, r)
}

func (h *ReceivingHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "invalid id")
		return
	}

	var r model.Receiving
	if err := c.ShouldBindJSON(&r); err != nil {
		respondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondError(c, http.StatusInternalServerError, "transaction error")
		return
	}
	defer tx.Rollback()

	var poID interface{}
	if r.PurchaseOrderID != nil {
		poID = *r.PurchaseOrderID
	}

	_, err = tx.Exec(
		"UPDATE receivings SET purchase_order_id=$1, supplier_name=$2, warehouse_location=$3, received_date=$4, status=$5, notes=$6, updated_at=NOW() WHERE id=$7",
		poID, r.SupplierName, r.WarehouseLocation, r.ReceivedDate, r.Status, r.Notes, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "database error")
		return
	}

	tx.Exec("DELETE FROM receiving_items WHERE receiving_id = $1", id)
	for _, item := range r.Items {
		_, err := tx.Exec(
			"INSERT INTO receiving_items (receiving_id, product_id, product_code, product_name, expected_qty, received_qty, condition, notes) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7,''), NULLIF($8,''))",
			id, item.ProductID, item.ProductCode, item.ProductName, item.ExpectedQty, item.ReceivedQty, item.Condition, item.Notes,
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

func (h *ReceivingHandler) getItems(receivingID int) ([]model.ReceivingItem, error) {
	rows, err := database.DB.Query(
		"SELECT id, receiving_id, product_id, product_code, product_name, expected_qty, received_qty, COALESCE(condition,''), COALESCE(notes,'') FROM receiving_items WHERE receiving_id = $1", receivingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.ReceivingItem{}
	for rows.Next() {
		var item model.ReceivingItem
		if err := rows.Scan(&item.ID, &item.ReceivingID, &item.ProductID, &item.ProductCode, &item.ProductName, &item.ExpectedQty, &item.ReceivedQty, &item.Condition, &item.Notes); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
