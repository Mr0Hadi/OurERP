package model

import (
	"time"
)

type Coordinates struct {
	Lat *float64 `json:"lat"`
	Lng *float64 `json:"lng"`
}

type User struct {
	ID           int       `json:"id"`
	FullName     string    `json:"fullName"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	Department   string    `json:"department"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Product struct {
	ID               int       `json:"id"`
	Code             string    `json:"code"`
	Barcode          string    `json:"barcode"`
	Name             string    `json:"name"`
	Brand            string    `json:"brand"`
	Category         string    `json:"category"`
	Unit             string    `json:"unit"`
	PurchasePrice    float64   `json:"purchasePrice"`
	RetailPrice      float64   `json:"retailPrice"`
	WholesalePrice   float64   `json:"wholesalePrice"`
	Tax              float64   `json:"tax"`
	Stock            float64   `json:"stock"`
	Description      string    `json:"description"`
	ImageURL         string    `json:"imageUrl"`
	IsActive         bool      `json:"isActive"`
	ReorderThreshold float64   `json:"reorderThreshold"`
	CreatedAt        string    `json:"createdAt"`
	UpdatedAt        string    `json:"updatedAt"`
}

type Supplier struct {
	ID          int          `json:"id"`
	CompanyName string       `json:"companyName"`
	FirstName   string       `json:"firstName"`
	LastName    string       `json:"lastName"`
	Phone       string       `json:"phone"`
	Email       string       `json:"email"`
	Address     string       `json:"address"`
	PostalCode  string       `json:"postalCode"`
	Notes       string       `json:"notes"`
	Balance     float64      `json:"balance"`
	BalanceType string       `json:"balanceType"`
	Avatar      *string      `json:"avatar"`
	Coordinates *Coordinates `json:"coordinates"`
	IsActive    bool         `json:"isActive"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

type Customer struct {
	ID             int          `json:"id"`
	FirstName      string       `json:"firstName"`
	LastName       string       `json:"lastName"`
	Phone          string       `json:"phone"`
	Email          string       `json:"email"`
	Address        string       `json:"address"`
	PostalCode     string       `json:"postalCode"`
	NationalID     string       `json:"nationalId"`
	Type           string       `json:"type"`
	CustomerGrade  int          `json:"customerGrade"`
	ReferralCode   string       `json:"referralCode"`
	CreditLimit    float64      `json:"creditLimit"`
	BalanceType    string       `json:"balanceType"`
	OpeningBalance float64      `json:"openingBalance"`
	Notes          string       `json:"notes"`
	Balance        float64      `json:"balance"`
	Avatar         *string      `json:"avatar"`
	Coordinates    *Coordinates `json:"coordinates"`
	IsActive       bool         `json:"isActive"`
	CreatedAt      time.Time    `json:"createdAt"`
	UpdatedAt      time.Time    `json:"updatedAt"`
}

type Vehicle struct {
	ID          int       `json:"id"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type BankAccount struct {
	ID            int       `json:"id"`
	AccountName   string    `json:"accountName"`
	BankName      string    `json:"bankName"`
	AccountNumber string    `json:"accountNumber"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type Check struct {
	ID          int       `json:"id"`
	CheckNumber string    `json:"checkNumber"`
	BankName    string    `json:"bankName"`
	Amount      float64   `json:"amount"`
	DueDate     *string   `json:"dueDate,omitempty"`
	ImageURL    string    `json:"imageUrl,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type PurchaseOrder struct {
	ID                 int        `json:"id"`
	SupplierID         int        `json:"supplierId"`
	SupplierName       string     `json:"supplierName"`
	CreatedBy          int        `json:"createdBy"`
	Status             string     `json:"status"`
	ExpectedDeliveryDate *string  `json:"expectedDeliveryDate,omitempty"`
	InvoiceNumber      string     `json:"invoiceNumber"`
	InvoiceDate        string     `json:"invoiceDate"`
	Notes              string     `json:"notes"`
	Description        string     `json:"description"`
	PaidAmount         float64    `json:"paidAmount"`
	TotalAmount        float64    `json:"totalAmount"`
	PaymentType        string     `json:"paymentType"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	Items              []POItem   `json:"items"`
}

type POItem struct {
	ID              int      `json:"id"`
	PurchaseOrderID int      `json:"purchaseOrderId"`
	ProductID       int      `json:"productId"`
	ProductCode     string   `json:"productCode"`
	ProductName     string   `json:"productName"`
	Qty             float64  `json:"qty"`
	OrderedQty      float64  `json:"orderedQty"`
	UnitPrice       float64  `json:"unitPrice"`
	Discount        float64  `json:"discount"`
	ReceivedQty     *float64 `json:"receivedQty"`
	LineTotal       float64  `json:"lineTotal"`
	DiscrepancyNote string   `json:"discrepancyNote"`
}

type Invoice struct {
	ID              int           `json:"id"`
	InvoiceNumber   string        `json:"invoiceNumber"`
	ProformaNumber  string        `json:"proformaNumber,omitempty"`
	CustomerID      int           `json:"customerId"`
	Channel         string        `json:"channel"`
	CreatedBy       int           `json:"createdBy"`
	Status          string        `json:"status"`
	Notes           string        `json:"notes"`
	DispatchedBy    *int          `json:"dispatchedBy,omitempty"`
	DispatchedAt    *string       `json:"dispatchedAt,omitempty"`
	VehicleID       *int          `json:"vehicleId,omitempty"`
	PackerID        *int          `json:"packerId,omitempty"`
	CreatedAt       time.Time     `json:"createdAt"`
	UpdatedAt       time.Time     `json:"updatedAt"`
	Items           []InvoiceItem `json:"items,omitempty"`
}

type InvoiceItem struct {
	ID                  int     `json:"id"`
	InvoiceID           int     `json:"invoiceId"`
	ProductID           int     `json:"productId"`
	Quantity            float64 `json:"quantity"`
	UnitPrice           float64 `json:"unitPrice"`
	DiscountAmount      float64 `json:"discountAmount"`
	PriceOverrideReason string  `json:"priceOverrideReason,omitempty"`
	PriceOverriddenBy   *int    `json:"priceOverriddenBy,omitempty"`
}

type StockMovement struct {
	ID            int       `json:"id"`
	ProductID     int       `json:"productId"`
	Quantity      float64   `json:"quantity"`
	MovementType  string    `json:"movementType"`
	ReferenceID   *int      `json:"referenceId,omitempty"`
	ReferenceType string    `json:"referenceType,omitempty"`
	PerformedBy   int       `json:"performedBy"`
	CreatedAt     time.Time `json:"createdAt"`
}

type CustomerPayment struct {
	ID                int       `json:"id"`
	CustomerID        int       `json:"customerId"`
	Amount            float64   `json:"amount"`
	PaymentMethod     string    `json:"paymentMethod"`
	BankAccountID     *int      `json:"bankAccountId,omitempty"`
	CheckID           *int      `json:"checkId,omitempty"`
	ReferenceInvoiceID *int     `json:"referenceInvoiceId,omitempty"`
	RecordedBy        int       `json:"recordedBy"`
	PaymentDate       string    `json:"paymentDate"`
	Notes             string    `json:"notes"`
	CreatedAt         time.Time `json:"createdAt"`
}

type SupplierPayment struct {
	ID              int       `json:"id"`
	SupplierID      int       `json:"supplierId"`
	PurchaseOrderID *int      `json:"purchaseOrderId,omitempty"`
	Amount          float64   `json:"amount"`
	PaymentMethod   string    `json:"paymentMethod"`
	CheckID         *int      `json:"checkId,omitempty"`
	RecordedBy      int       `json:"recordedBy"`
	PaymentDate     string    `json:"paymentDate"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Return struct {
	ID        int       `json:"id"`
	InvoiceID int       `json:"invoiceId"`
	ProductID int       `json:"productId"`
	Quantity  float64   `json:"quantity"`
	Reason    string    `json:"reason"`
	CreatedBy int       `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
}

type StatusLog struct {
	ID         int       `json:"id"`
	EntityType string    `json:"entityType"`
	EntityID   int       `json:"entityId"`
	FromStatus string    `json:"fromStatus,omitempty"`
	ToStatus   string    `json:"toStatus"`
	ChangedBy  int       `json:"changedBy"`
	ChangedAt  time.Time `json:"changedAt"`
}

type StockLevel struct {
	ProductID        int     `json:"productId"`
	ProductName      string  `json:"productName"`
	InternalCode     string  `json:"internalCode"`
	CurrentStock     float64 `json:"currentStock"`
	ReorderThreshold float64 `json:"reorderThreshold"`
	IsLowStock       bool    `json:"isLowStock"`
}

type SalesSummary struct {
	Date         string  `json:"date,omitempty"`
	Channel      string  `json:"channel,omitempty"`
	TotalAmount  float64 `json:"totalAmount"`
	InvoiceCount int     `json:"invoiceCount"`
}

type PaginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PageSize   int         `json:"pageSize"`
	TotalCount int         `json:"totalCount"`
	TotalPages int         `json:"totalPages"`
}

type Sale struct {
	ID            int        `json:"id"`
	CustomerID    int        `json:"customerId"`
	CustomerName  string     `json:"customerName"`
	InvoiceNumber string     `json:"invoiceNumber"`
	InvoiceDate   string     `json:"invoiceDate"`
	Status        string     `json:"status"`
	PaymentType   string     `json:"paymentType"`
	PaidAmount    float64    `json:"paidAmount"`
	TotalAmount   float64    `json:"totalAmount"`
	Description   string     `json:"description"`
	CheckNumber   string     `json:"checkNumber"`
	TransferRef   string     `json:"transferRef"`
	CreatedBy     int        `json:"createdBy"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	Items         []SaleItem `json:"items,omitempty"`
}

type SaleItem struct {
	ID          int     `json:"id"`
	SaleID      int     `json:"saleId"`
	ProductID   int     `json:"productId"`
	ProductCode string  `json:"productCode"`
	ProductName string  `json:"productName"`
	Unit        string  `json:"unit"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unitPrice"`
	Discount    float64 `json:"discount"`
	LineTotal   float64 `json:"lineTotal"`
}

type Receiving struct {
	ID                int            `json:"id"`
	PurchaseOrderID   *int           `json:"purchaseId,omitempty"`
	SupplierName      string         `json:"supplierName"`
	WarehouseLocation string         `json:"warehouseLocation"`
	ReceivedDate      string         `json:"receivedDate"`
	Status            string         `json:"status"`
	Notes             string         `json:"notes,omitempty"`
	CreatedBy         int            `json:"createdBy"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
	Items             []ReceivingItem `json:"items,omitempty"`
}

type ReceivingItem struct {
	ID            int     `json:"id"`
	ReceivingID   int     `json:"receivingId"`
	ProductID     int     `json:"productId"`
	ProductCode   string  `json:"productCode"`
	ProductName   string  `json:"productName"`
	ExpectedQty   float64 `json:"expectedQty"`
	ReceivedQty   float64 `json:"receivedQty"`
	Condition     string  `json:"condition,omitempty"`
	Notes         string  `json:"notes,omitempty"`
}
