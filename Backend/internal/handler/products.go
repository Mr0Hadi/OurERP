package handler

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/database"
	"github.com/user/wms-backend/internal/model"
)

type ProductHandler struct{}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{}
}

func (h *ProductHandler) List(c *gin.Context) {
	p := parsePagination(c)
	query := "SELECT id, internal_code, supplier_code, barcode, name, COALESCE(brand,''), COALESCE(category,''), unit, reorder_threshold, cost_price, sale_price_retail, sale_price_wholesale, COALESCE(tax,0), image_url, is_active, created_at, updated_at FROM products WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if barcode := c.Query("barcode"); barcode != "" {
		query += fmt.Sprintf(" AND barcode = $%d", argIdx)
		args = append(args, barcode)
		argIdx++
	}
	if code := c.Query("code"); code != "" {
		query += fmt.Sprintf(" AND (internal_code ILIKE $%d OR supplier_code ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+code+"%")
		argIdx++
	}
	if search := c.Query("search"); search != "" {
		query += fmt.Sprintf(" AND (name ILIKE $%d OR internal_code ILIKE $%d OR barcode ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if brand := c.Query("brand"); brand != "" {
		query += fmt.Sprintf(" AND brand ILIKE $%d", argIdx)
		args = append(args, "%"+brand+"%")
		argIdx++
	}
	if category := c.Query("category"); category != "" {
		query += fmt.Sprintf(" AND category ILIKE $%d", argIdx)
		args = append(args, "%"+category+"%")
		argIdx++
	}
	if minPrice := c.Query("min_price"); minPrice != "" {
		query += fmt.Sprintf(" AND cost_price >= $%d", argIdx)
		args = append(args, minPrice)
		argIdx++
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		query += fmt.Sprintf(" AND cost_price <= $%d", argIdx)
		args = append(args, maxPrice)
		argIdx++
	}
	if c.Query("include_inactive") != "true" {
		query += " AND is_active = true"
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM products WHERE 1=1"
	countArgs := []interface{}{}
	countIdx := 1
	if search := c.Query("search"); search != "" {
		countQuery += fmt.Sprintf(" AND (name ILIKE $%d OR internal_code ILIKE $%d OR barcode ILIKE $%d)", countIdx, countIdx, countIdx)
		countArgs = append(countArgs, "%"+search+"%")
		countIdx++
	}
	if brand := c.Query("brand"); brand != "" {
		countQuery += fmt.Sprintf(" AND brand ILIKE $%d", countIdx)
		countArgs = append(countArgs, "%"+brand+"%")
		countIdx++
	}
	if category := c.Query("category"); category != "" {
		countQuery += fmt.Sprintf(" AND category ILIKE $%d", countIdx)
		countArgs = append(countArgs, "%"+category+"%")
		countIdx++
	}
	if minPrice := c.Query("min_price"); minPrice != "" {
		countQuery += fmt.Sprintf(" AND cost_price >= $%d", countIdx)
		countArgs = append(countArgs, minPrice)
		countIdx++
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		countQuery += fmt.Sprintf(" AND cost_price <= $%d", countIdx)
		countArgs = append(countArgs, maxPrice)
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

	products := []model.Product{}
	for rows.Next() {
		var pr model.Product
		var brand, category, barcode, imageURL sql.NullString
		var internalCode, supplierCode string
		var createdAt, updatedAt sql.NullTime
		if err := rows.Scan(&pr.ID, &internalCode, &supplierCode, &barcode, &pr.Name, &brand, &category, &pr.Unit, &pr.ReorderThreshold, &pr.PurchasePrice, &pr.RetailPrice, &pr.WholesalePrice, &pr.Tax, &imageURL, &pr.IsActive, &createdAt, &updatedAt); err != nil {
			respondError(c, http.StatusInternalServerError, "خطا در خواندن اطلاعات")
			return
		}
		pr.Code = internalCode
		pr.Barcode = barcode.String
		pr.Brand = brand.String
		pr.Category = category.String
		pr.ImageURL = imageURL.String
		pr.Description = ""
		if createdAt.Valid {
			pr.CreatedAt = createdAt.Time.Format(time.RFC3339)
		}
		if updatedAt.Valid {
			pr.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
		}
		products = append(products, pr)
	}

	for i := range products {
		products[i].Stock = h.getCurrentStock(products[i].ID)
	}

	respondJSONWithMeta(c, http.StatusOK, products, paginatedMeta(p.Page, p.PageSize, totalCount))
}

func (h *ProductHandler) Get(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var pr model.Product
	var barcode, imageURL sql.NullString
	var supplierCode string
	var createdAt, updatedAt sql.NullTime
	err = database.DB.QueryRow(
		"SELECT id, internal_code, supplier_code, barcode, name, COALESCE(brand,''), COALESCE(category,''), unit, reorder_threshold, cost_price, sale_price_retail, sale_price_wholesale, COALESCE(tax,0), image_url, is_active, created_at, updated_at FROM products WHERE id = $1", id,
	).Scan(&pr.ID, &pr.Code, &supplierCode, &barcode, &pr.Name, &pr.Brand, &pr.Category, &pr.Unit, &pr.ReorderThreshold, &pr.PurchasePrice, &pr.RetailPrice, &pr.WholesalePrice, &pr.Tax, &imageURL, &pr.IsActive, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "کالا یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	pr.Barcode = barcode.String
	pr.ImageURL = imageURL.String
	pr.Description = ""
	pr.Stock = h.getCurrentStock(pr.ID)
	if createdAt.Valid {
		pr.CreatedAt = createdAt.Time.Format(time.RFC3339)
	}
	if updatedAt.Valid {
		pr.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
	}
	respondJSON(c, http.StatusOK, pr)
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req model.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if req.Code == "" || req.Name == "" {
		respondError(c, http.StatusBadRequest, "کد داخلی و نام الزامی هستند")
		return
	}
	if req.Unit == "" {
		req.Unit = "piece"
	}
	var pr model.Product
	var createdAt, updatedAt sql.NullTime
	err := database.DB.QueryRow(
		`INSERT INTO products (internal_code, supplier_code, barcode, name, brand, category, unit, reorder_threshold, cost_price, sale_price_retail, sale_price_wholesale, tax, image_url)
		 VALUES ($1, $2, NULLIF($3,''), $4, $5, $6, $7, $8, $9, $10, $11, $12, NULLIF($13,'')) RETURNING id, created_at, updated_at`,
		req.Code, "", req.Barcode, req.Name, req.Brand, req.Category, req.Unit, req.ReorderThreshold, req.PurchasePrice, req.RetailPrice, req.WholesalePrice, req.Tax, req.ImageURL,
	).Scan(&pr.ID, &createdAt, &updatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			respondError(c, http.StatusConflict, "این کد داخلی قبلاً ثبت شده است")
			return
		}
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	pr.Code = req.Code
	pr.Barcode = req.Barcode
	pr.Name = req.Name
	pr.Brand = req.Brand
	pr.Category = req.Category
	pr.Unit = req.Unit
	pr.ReorderThreshold = req.ReorderThreshold
	pr.PurchasePrice = req.PurchasePrice
	pr.RetailPrice = req.RetailPrice
	pr.WholesalePrice = req.WholesalePrice
	pr.Tax = req.Tax
	pr.ImageURL = req.ImageURL
	pr.Description = ""
	pr.IsActive = true
	pr.Stock = 0
	if createdAt.Valid {
		pr.CreatedAt = createdAt.Time.Format(time.RFC3339)
	}
	if updatedAt.Valid {
		pr.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
	}
	respondJSON(c, http.StatusCreated, pr)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	var req model.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	result, err := database.DB.Exec(
		`UPDATE products SET internal_code=$1, supplier_code=$2, barcode=NULLIF($3,''), name=$4, brand=$5, category=$6, unit=$7, reorder_threshold=$8, cost_price=$9, sale_price_retail=$10, sale_price_wholesale=$11, tax=$12, image_url=NULLIF($13,''), updated_at=NOW() WHERE id=$14`,
		req.Code, "", req.Barcode, req.Name, req.Brand, req.Category, req.Unit, req.ReorderThreshold, req.PurchasePrice, req.RetailPrice, req.WholesalePrice, req.Tax, req.ImageURL, id,
	)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "کالا یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "به‌روزرسانی شد"})
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := parseIntParam(c, "id")
	if err != nil {
		respondError(c, http.StatusBadRequest, "شناسه نامعتبر است")
		return
	}
	result, err := database.DB.Exec("UPDATE products SET is_active=false, updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(c, http.StatusNotFound, "کالا یافت نشد")
		return
	}
	respondJSON(c, http.StatusOK, gin.H{"message": "حذف شد"})
}

func (h *ProductHandler) BarcodeLookup(c *gin.Context) {
	barcode := c.Param("barcode")
	var pr model.Product
	var barcodeVal, imageURL sql.NullString
	var supplierCode string
	var createdAt, updatedAt sql.NullTime
	err := database.DB.QueryRow(
		"SELECT id, internal_code, supplier_code, barcode, name, COALESCE(brand,''), COALESCE(category,''), unit, reorder_threshold, cost_price, sale_price_retail, sale_price_wholesale, COALESCE(tax,0), image_url, is_active, created_at, updated_at FROM products WHERE barcode = $1 AND is_active = true", barcode,
	).Scan(&pr.ID, &pr.Code, &supplierCode, &barcodeVal, &pr.Name, &pr.Brand, &pr.Category, &pr.Unit, &pr.ReorderThreshold, &pr.PurchasePrice, &pr.RetailPrice, &pr.WholesalePrice, &pr.Tax, &imageURL, &pr.IsActive, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		respondError(c, http.StatusNotFound, "کالا یافت نشد")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "خطای پایگاه داده")
		return
	}
	pr.Barcode = barcodeVal.String
	pr.ImageURL = imageURL.String
	pr.Description = ""
	pr.Stock = h.getCurrentStock(pr.ID)
	if createdAt.Valid {
		pr.CreatedAt = createdAt.Time.Format(time.RFC3339)
	}
	if updatedAt.Valid {
		pr.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
	}
	respondJSON(c, http.StatusOK, pr)
}

func (h *ProductHandler) LowStock(c *gin.Context) {
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

	type LowStockItem struct {
		ProductID        int     `json:"productId"`
		InternalCode     string  `json:"internalCode"`
		Name             string  `json:"name"`
		CurrentStock     float64 `json:"currentStock"`
		ReorderThreshold float64 `json:"reorderThreshold"`
	}

	items := []LowStockItem{}
	for rows.Next() {
		var item LowStockItem
		if err := rows.Scan(&item.ProductID, &item.InternalCode, &item.Name, &item.CurrentStock, &item.ReorderThreshold); err != nil {
			continue
		}
		items = append(items, item)
	}
	respondJSON(c, http.StatusOK, items)
}

func (h *ProductHandler) getCurrentStock(productID int) float64 {
	var stock sql.NullFloat64
	database.DB.QueryRow("SELECT SUM(quantity) FROM stock_movements WHERE product_id = $1", productID).Scan(&stock)
	if stock.Valid {
		return stock.Float64
	}
	return 0
}
