package model

import (
	"database/sql"
	"time"
)

type User struct {
	ID           int       `json:"id"`
	FullName     string    `json:"full_name"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	Department   string    `json:"department"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Product struct {
	ID                 int            `json:"id"`
	InternalCode       string         `json:"internal_code"`
	SupplierCode       string         `json:"supplier_code"`
	Barcode            sql.NullString `json:"barcode,omitempty"`
	Name               string         `json:"name"`
	Brand              string         `json:"brand"`
	Category           string         `json:"category"`
	Unit               string         `json:"unit"`
	ReorderThreshold   float64        `json:"reorder_threshold"`
	CostPrice          float64        `json:"cost_price"`
	SalePriceRetail    float64        `json:"sale_price_retail"`
	SalePriceWholesale float64        `json:"sale_price_wholesale"`
	Tax                float64        `json:"tax"`
	ImageURL           sql.NullString `json:"image_url,omitempty"`
	IsActive           bool           `json:"is_active"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

func (p Product) BarcodeValue() string {
	if p.Barcode.Valid {
		return p.Barcode.String
	}
	return ""
}

func (p Product) ImageURLValue() string {
	if p.ImageURL.Valid {
		return p.ImageURL.String
	}
	return ""
}

type ProductResponse struct {
	ID                 int     `json:"id"`
	InternalCode       string  `json:"internal_code"`
	SupplierCode       string  `json:"supplier_code"`
	Barcode            string  `json:"barcode,omitempty"`
	Name               string  `json:"name"`
	Brand              string  `json:"brand"`
	Category           string  `json:"category"`
	Unit               string  `json:"unit"`
	ReorderThreshold   float64 `json:"reorder_threshold"`
	CostPrice          float64 `json:"cost_price"`
	SalePriceRetail    float64 `json:"sale_price_retail"`
	SalePriceWholesale float64 `json:"sale_price_wholesale"`
	Tax                float64 `json:"tax"`
	ImageURL           string  `json:"image_url,omitempty"`
	IsActive           bool    `json:"is_active"`
	CurrentStock       float64 `json:"current_stock,omitempty"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

type Supplier struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	ContactName string     `json:"contact_name"`
	Phone       string     `json:"phone"`
	Address     string     `json:"address"`
	PostalCode  string     `json:"postal_code"`
	Latitude    *float64   `json:"latitude"`
	Longitude   *float64   `json:"longitude"`
	BalanceType string     `json:"balance_type"`
	Balance     float64    `json:"balance"`
	Notes       string     `json:"notes"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Customer struct {
	ID            int       `json:"id"`
	Type          string    `json:"type"`
	FullName      string    `json:"full_name"`
	NationalID    string    `json:"national_id"`
	Phone         string    `json:"phone"`
	Address       string    `json:"address"`
	PostalCode    string    `json:"postal_code"`
	Latitude      *float64  `json:"latitude"`
	Longitude     *float64  `json:"longitude"`
	ReferralCode  string    `json:"referral_code,omitempty"`
	CreditLimit   float64   `json:"credit_limit"`
	CustomerGrade int       `json:"customer_grade"`
	BalanceType   string    `json:"balance_type"`
	OpeningBalance float64  `json:"opening_balance"`
	Notes         string    `json:"notes"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CustomerDetail struct {
	Customer
	OutstandingBalance float64 `json:"outstanding_balance"`
}

type Vehicle struct {
	ID          int       `json:"id"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type BankAccount struct {
	ID            int       `json:"id"`
	AccountName   string    `json:"account_name"`
	BankName      string    `json:"bank_name"`
	AccountNumber string    `json:"account_number"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Check struct {
	ID          int       `json:"id"`
	CheckNumber string    `json:"check_number"`
	BankName    string    `json:"bank_name"`
	Amount      float64   `json:"amount"`
	DueDate     *string   `json:"due_date,omitempty"`
	ImageURL    string    `json:"image_url,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PurchaseOrder struct {
	ID                   int              `json:"id"`
	SupplierID           int              `json:"supplier_id"`
	CreatedBy            int              `json:"created_by"`
	Status               string           `json:"status"`
	ExpectedDeliveryDate *string          `json:"expected_delivery_date,omitempty"`
	SupplierInvoiceNumber string           `json:"supplier_invoice_number,omitempty"`
	Notes                string           `json:"notes"`
	ReceivedBy           *int             `json:"received_by,omitempty"`
	ReceivedAt           *string          `json:"received_at,omitempty"`
	CreatedAt            time.Time        `json:"created_at"`
	UpdatedAt            time.Time        `json:"updated_at"`
	Items                []POItem         `json:"items,omitempty"`
}

type POItem struct {
	ID               int     `json:"id"`
	PurchaseOrderID  int     `json:"purchase_order_id"`
	ProductID        int     `json:"product_id"`
	OrderedQuantity  float64 `json:"ordered_quantity"`
	UnitPrice        float64 `json:"unit_price"`
	ReceivedQuantity *float64 `json:"received_quantity,omitempty"`
	DiscrepancyNote  string  `json:"discrepancy_note,omitempty"`
}

type Invoice struct {
	ID              int           `json:"id"`
	InvoiceNumber   string        `json:"invoice_number"`
	ProformaNumber  string        `json:"proforma_number,omitempty"`
	CustomerID      int           `json:"customer_id"`
	Channel         string        `json:"channel"`
	CreatedBy       int           `json:"created_by"`
	Status          string        `json:"status"`
	Notes           string        `json:"notes"`
	DispatchedBy    *int          `json:"dispatched_by,omitempty"`
	DispatchedAt    *string       `json:"dispatched_at,omitempty"`
	VehicleID       *int          `json:"vehicle_id,omitempty"`
	PackerID        *int          `json:"packer_id,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Items           []InvoiceItem `json:"items,omitempty"`
}

type InvoiceItem struct {
	ID                  int     `json:"id"`
	InvoiceID           int     `json:"invoice_id"`
	ProductID           int     `json:"product_id"`
	Quantity            float64 `json:"quantity"`
	UnitPrice           float64 `json:"unit_price"`
	DiscountAmount      float64 `json:"discount_amount"`
	PriceOverrideReason string  `json:"price_override_reason,omitempty"`
	PriceOverriddenBy   *int    `json:"price_overridden_by,omitempty"`
}

type StockMovement struct {
	ID            int       `json:"id"`
	ProductID     int       `json:"product_id"`
	Quantity      float64   `json:"quantity"`
	MovementType  string    `json:"movement_type"`
	ReferenceID   *int      `json:"reference_id,omitempty"`
	ReferenceType string    `json:"reference_type,omitempty"`
	PerformedBy   int       `json:"performed_by"`
	CreatedAt     time.Time `json:"created_at"`
}

type CustomerPayment struct {
	ID               int       `json:"id"`
	CustomerID       int       `json:"customer_id"`
	Amount           float64   `json:"amount"`
	PaymentMethod    string    `json:"payment_method"`
	BankAccountID    *int      `json:"bank_account_id,omitempty"`
	CheckID          *int      `json:"check_id,omitempty"`
	ReferenceInvoiceID *int    `json:"reference_invoice_id,omitempty"`
	RecordedBy       int       `json:"recorded_by"`
	PaymentDate      string    `json:"payment_date"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"created_at"`
}

type SupplierPayment struct {
	ID              int       `json:"id"`
	SupplierID      int       `json:"supplier_id"`
	PurchaseOrderID *int      `json:"purchase_order_id,omitempty"`
	Amount          float64   `json:"amount"`
	PaymentMethod   string    `json:"payment_method"`
	CheckID         *int      `json:"check_id,omitempty"`
	RecordedBy      int       `json:"recorded_by"`
	PaymentDate     string    `json:"payment_date"`
	CreatedAt       time.Time `json:"created_at"`
}

type Return struct {
	ID        int       `json:"id"`
	InvoiceID int       `json:"invoice_id"`
	ProductID int       `json:"product_id"`
	Quantity  float64   `json:"quantity"`
	Reason    string    `json:"reason"`
	CreatedBy int       `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type StatusLog struct {
	ID         int       `json:"id"`
	EntityType string    `json:"entity_type"`
	EntityID   int       `json:"entity_id"`
	FromStatus string    `json:"from_status,omitempty"`
	ToStatus   string    `json:"to_status"`
	ChangedBy  int       `json:"changed_by"`
	ChangedAt  time.Time `json:"changed_at"`
}

type StockLevel struct {
	ProductID     int     `json:"product_id"`
	ProductName   string  `json:"product_name"`
	InternalCode  string  `json:"internal_code"`
	CurrentStock  float64 `json:"current_stock"`
	ReorderThreshold float64 `json:"reorder_threshold"`
	IsLowStock    bool    `json:"is_low_stock"`
}

type SalesSummary struct {
	Date         string  `json:"date,omitempty"`
	Channel      string  `json:"channel,omitempty"`
	TotalAmount  float64 `json:"total_amount"`
	InvoiceCount int     `json:"invoice_count"`
}

type PaginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalCount int         `json:"total_count"`
	TotalPages int         `json:"total_pages"`
}

type Sale struct {
	ID            int        `json:"id"`
	CustomerID    int        `json:"customer_id"`
	CustomerName  string     `json:"customer_name,omitempty"`
	InvoiceNumber string     `json:"invoice_number"`
	InvoiceDate   string     `json:"invoice_date"`
	DueDate       *string    `json:"due_date,omitempty"`
	Description   string     `json:"description,omitempty"`
	Status        string     `json:"status"`
	PaymentType   string     `json:"payment_type"`
	PaidAmount    float64    `json:"paid_amount"`
	TotalAmount   float64    `json:"total_amount"`
	CheckNumber   string     `json:"check_number,omitempty"`
	TransferRef   string     `json:"transfer_ref,omitempty"`
	CreatedBy     int        `json:"created_by"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Items         []SaleItem `json:"items,omitempty"`
}

type SaleItem struct {
	ID          int     `json:"id"`
	SaleID      int     `json:"sale_id"`
	ProductID   int     `json:"product_id"`
	ProductCode string  `json:"product_code"`
	ProductName string  `json:"product_name"`
	Unit        string  `json:"unit"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unit_price"`
	Discount    float64 `json:"discount"`
	LineTotal   float64 `json:"line_total"`
}

type Receiving struct {
	ID                int            `json:"id"`
	PurchaseOrderID   *int           `json:"purchase_id,omitempty"`
	SupplierName      string         `json:"supplier_name"`
	WarehouseLocation string         `json:"warehouse_location"`
	ReceivedDate      string         `json:"received_date"`
	Status            string         `json:"status"`
	Notes             string         `json:"notes,omitempty"`
	CreatedBy         int            `json:"created_by"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	Items             []ReceivingItem `json:"items,omitempty"`
}

type ReceivingItem struct {
	ID            int     `json:"id"`
	ReceivingID   int     `json:"receiving_id"`
	ProductID     int     `json:"product_id"`
	ProductCode   string  `json:"product_code"`
	ProductName   string  `json:"product_name"`
	ExpectedQty   float64 `json:"expected_qty"`
	ReceivedQty   float64 `json:"received_qty"`
	Condition     string  `json:"condition,omitempty"`
	Notes         string  `json:"notes,omitempty"`
}
