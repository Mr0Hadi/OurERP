package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func openapiSpecHandler(c *gin.Context) {
	c.JSON(http.StatusOK, openapiSpec)
}

var openapiSpec = map[string]interface{}{
	"openapi": "3.0.3",
	"info": map[string]interface{}{
		"title":       "WMS API",
		"version":     "1.0.0",
		"description": "Warehouse Management System REST API",
	},
	"servers": []map[string]interface{}{
		{"url": "/", "description": "Local server"},
	},
	"paths": map[string]interface{}{
		"/auth/login": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":        []string{"Auth"},
				"summary":     "Login",
				"description": "Authenticate user and get JWT tokens",
				"requestBody": map[string]interface{}{
					"required": true,
					"content": map[string]interface{}{
						"application/json": map[string]interface{}{
							"schema": map[string]interface{}{
								"type": "object",
								"properties": map[string]interface{}{
									"username": map[string]interface{}{"type": "string"},
									"password": map[string]interface{}{"type": "string"},
								},
							},
						},
					},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Login successful"},
					"401": map[string]interface{}{"description": "Invalid credentials"},
				},
			},
		},
		"/auth/refresh": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Auth"},
				"summary": "Refresh access token",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "New access token"},
				},
			},
		},
		"/auth/logout": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Auth"},
				"summary": "Logout",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Logged out"},
				},
			},
		},
		"/api/products": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":        []string{"Products"},
				"summary":     "List products",
				"description": "Get paginated list of products with optional filters",
				"parameters": []map[string]interface{}{
					{"name": "page", "in": "query", "schema": map[string]interface{}{"type": "integer"}},
					{"name": "page_size", "in": "query", "schema": map[string]interface{}{"type": "integer"}},
					{"name": "barcode", "in": "query", "schema": map[string]interface{}{"type": "string"}},
					{"name": "code", "in": "query", "schema": map[string]interface{}{"type": "string"}},
					{"name": "name", "in": "query", "schema": map[string]interface{}{"type": "string"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Product list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Products"},
				"summary": "Create product",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Product created"},
				},
			},
		},
		"/api/products/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Products"},
				"summary": "Get product by ID",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Product details"},
				},
			},
			"put": map[string]interface{}{
				"tags":    []string{"Products"},
				"summary": "Update product",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Product updated"},
				},
			},
			"delete": map[string]interface{}{
				"tags":    []string{"Products"},
				"summary": "Soft delete product",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Product deleted"},
				},
			},
		},
		"/api/products/barcode/{barcode}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Products"},
				"summary": "Lookup product by barcode",
				"parameters": []map[string]interface{}{
					{"name": "barcode", "in": "path", "required": true, "schema": map[string]interface{}{"type": "string"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Product found"},
				},
			},
		},
		"/api/products/low-stock": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Products"},
				"summary": "Get low-stock products",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "List of low-stock products"},
				},
			},
		},
		"/api/suppliers": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Suppliers"},
				"summary": "List suppliers",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Supplier list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Suppliers"},
				"summary": "Create supplier",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Supplier created"},
				},
			},
		},
		"/api/suppliers/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Suppliers"},
				"summary": "Get supplier by ID",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Supplier details"},
				},
			},
			"put": map[string]interface{}{
				"tags":    []string{"Suppliers"},
				"summary": "Update supplier",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Supplier updated"},
				},
			},
		},
		"/api/customers": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":        []string{"Customers"},
				"summary":     "List customers",
				"description": "Filter by type, grade, name",
				"parameters": []map[string]interface{}{
					{"name": "type", "in": "query", "schema": map[string]interface{}{"type": "string", "enum": []string{"retail", "wholesale", "mechanic"}}},
					{"name": "grade", "in": "query", "schema": map[string]interface{}{"type": "integer"}},
					{"name": "name", "in": "query", "schema": map[string]interface{}{"type": "string"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Customer list with balances"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Customers"},
				"summary": "Create customer",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Customer created"},
				},
			},
		},
		"/api/customers/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Customers"},
				"summary": "Get customer details with balance",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Customer details"},
				},
			},
			"put": map[string]interface{}{
				"tags":    []string{"Customers"},
				"summary": "Update customer",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Customer updated"},
				},
			},
		},
		"/api/customers/{id}/balance": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Customers"},
				"summary": "Get customer outstanding balance",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Balance info"},
				},
			},
		},
		"/api/customers/{id}/transactions": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Customers"},
				"summary": "Get customer transaction history",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Transaction history"},
				},
			},
		},
		"/api/purchase-orders": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":        []string{"Purchase Orders"},
				"summary":     "List purchase orders",
				"description": "Filter by status",
				"parameters": []map[string]interface{}{
					{"name": "status", "in": "query", "schema": map[string]interface{}{"type": "string", "enum": []string{"draft", "confirmed", "awaiting_delivery", "received", "cancelled"}}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Purchase order list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Create purchase order (status: draft)",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Purchase order created"},
				},
			},
		},
		"/api/purchase-orders/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Get purchase order details",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Purchase order with items"},
				},
			},
			"put": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Update draft purchase order",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Purchase order updated"},
				},
			},
		},
		"/api/purchase-orders/{id}/confirm": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Confirm purchase order (draft → confirmed)",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Status changed"},
				},
			},
		},
		"/api/purchase-orders/{id}/mark-awaiting": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Mark as awaiting delivery (confirmed → awaiting_delivery)",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Status changed"},
				},
			},
		},
		"/api/purchase-orders/{id}/receive": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Receive goods (creates stock movements)",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Goods received"},
				},
			},
		},
		"/api/purchase-orders/{id}/cancel": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Purchase Orders"},
				"summary": "Cancel purchase order",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Purchase order cancelled"},
				},
			},
		},
		"/api/invoices": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":        []string{"Invoices"},
				"summary":     "List invoices",
				"description": "Filter by status, customer_id, date range",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Invoice list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Invoices"},
				"summary": "Create proforma invoice",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Invoice created"},
				},
			},
		},
		"/api/invoices/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Invoices"},
				"summary": "Get invoice details",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Invoice with items"},
				},
			},
			"put": map[string]interface{}{
				"tags":    []string{"Invoices"},
				"summary": "Update proforma invoice",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Invoice updated"},
				},
			},
		},
		"/api/invoices/{id}/confirm": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":        []string{"Invoices"},
				"summary":     "Confirm invoice (proforma → confirmed)",
				"description": "Triggers credit limit check",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Invoice confirmed"},
					"400": map[string]interface{}{"description": "Credit limit exceeded"},
				},
			},
		},
		"/api/invoices/{id}/dispatch": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":        []string{"Invoices"},
				"summary":     "Dispatch goods (confirmed → dispatched)",
				"description": "Triggers stock deduction. Checks sufficient stock.",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Goods dispatched"},
					"400": map[string]interface{}{"description": "Insufficient stock"},
				},
			},
		},
		"/api/invoices/{id}/deliver": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Invoices"},
				"summary": "Mark as delivered (dispatched → delivered)",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Invoice delivered"},
				},
			},
		},
		"/api/invoices/{id}/cancel": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Invoices"},
				"summary": "Cancel invoice",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Invoice cancelled"},
				},
			},
		},
		"/api/invoices/{id}/return": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":        []string{"Invoices"},
				"summary":     "Register return against invoice",
				"description": "Creates return_in stock movement",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Return registered"},
				},
			},
		},
		"/api/payments/customer": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Payments"},
				"summary": "List customer payments",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Payment list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Payments"},
				"summary": "Register customer payment",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Payment registered"},
				},
			},
		},
		"/api/payments/customer/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Payments"},
				"summary": "Get customer payment details",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Payment details"},
				},
			},
		},
		"/api/payments/supplier": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Payments"},
				"summary": "List supplier payments",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Payment list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Payments"},
				"summary": "Register supplier payment",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Payment registered"},
				},
			},
		},
		"/api/payments/supplier/{id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Payments"},
				"summary": "Get supplier payment details",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Payment details"},
				},
			},
		},
		"/api/bank-accounts": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Bank Accounts"},
				"summary": "List bank accounts",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Bank account list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Bank Accounts"},
				"summary": "Create bank account",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Bank account created"},
				},
			},
		},
		"/api/bank-accounts/{id}": map[string]interface{}{
			"put": map[string]interface{}{
				"tags":    []string{"Bank Accounts"},
				"summary": "Update bank account",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Bank account updated"},
				},
			},
		},
		"/api/vehicles": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Vehicles"},
				"summary": "List vehicles",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Vehicle list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Vehicles"},
				"summary": "Create vehicle",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "Vehicle created"},
				},
			},
		},
		"/api/vehicles/{id}": map[string]interface{}{
			"put": map[string]interface{}{
				"tags":    []string{"Vehicles"},
				"summary": "Update vehicle",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Vehicle updated"},
				},
			},
		},
		"/api/stock": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Stock"},
				"summary": "Get current stock levels for all products",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Stock snapshot"},
				},
			},
		},
		"/api/stock/{product_id}": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Stock"},
				"summary": "Get stock movement history for a product",
				"parameters": []map[string]interface{}{
					{"name": "product_id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Movement history"},
				},
			},
		},
		"/api/reports/stock": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Reports"},
				"summary": "Stock snapshot report",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Stock report"},
				},
			},
		},
		"/api/reports/low-stock": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Reports"},
				"summary": "Low stock alert list",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Low stock products"},
				},
			},
		},
		"/api/reports/sales-summary": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":        []string{"Reports"},
				"summary":     "Sales summary by period",
				"description": "Group by day or channel",
				"parameters": []map[string]interface{}{
					{"name": "from", "in": "query", "schema": map[string]interface{}{"type": "string", "format": "date"}},
					{"name": "to", "in": "query", "schema": map[string]interface{}{"type": "string", "format": "date"}},
					{"name": "group_by", "in": "query", "schema": map[string]interface{}{"type": "string", "enum": []string{"day", "channel"}}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Sales summary"},
				},
			},
		},
		"/api/reports/customer-balances": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Reports"},
				"summary": "Customers with outstanding balance > 0",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Customer balances"},
				},
			},
		},
		"/api/reports/purchase-orders": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":        []string{"Reports"},
				"summary":     "Purchase order list report",
				"description": "Filter by status and date range",
				"parameters": []map[string]interface{}{
					{"name": "status", "in": "query", "schema": map[string]interface{}{"type": "string"}},
					{"name": "from", "in": "query", "schema": map[string]interface{}{"type": "string", "format": "date"}},
					{"name": "to", "in": "query", "schema": map[string]interface{}{"type": "string", "format": "date"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "Purchase order report"},
				},
			},
		},
		"/api/users": map[string]interface{}{
			"get": map[string]interface{}{
				"tags":    []string{"Users"},
				"summary": "List all users (admin only)",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "User list"},
				},
			},
			"post": map[string]interface{}{
				"tags":    []string{"Users"},
				"summary": "Create user (admin only)",
				"responses": map[string]interface{}{
					"201": map[string]interface{}{"description": "User created"},
				},
			},
		},
		"/api/users/{id}": map[string]interface{}{
			"put": map[string]interface{}{
				"tags":    []string{"Users"},
				"summary": "Update user (admin only)",
				"parameters": []map[string]interface{}{
					{"name": "id", "in": "path", "required": true, "schema": map[string]interface{}{"type": "integer"}},
				},
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "User updated"},
				},
			},
			"delete": map[string]interface{}{
				"tags":    []string{"Users"},
				"summary": "Soft delete user (admin only)",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "User deleted"},
				},
			},
		},
		"/api/files/upload": map[string]interface{}{
			"post": map[string]interface{}{
				"tags":    []string{"Files"},
				"summary": "Upload a file",
				"responses": map[string]interface{}{
					"200": map[string]interface{}{"description": "File URL returned"},
				},
			},
		},
	},
	"components": map[string]interface{}{
		"securitySchemes": map[string]interface{}{
			"bearerAuth": map[string]interface{}{
				"type":         "http",
				"scheme":       "bearer",
				"bearerFormat": "JWT",
			},
		},
	},
	"security": []map[string]interface{}{
		{"bearerAuth": []string{}},
	},
}
