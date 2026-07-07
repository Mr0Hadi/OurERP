package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/config"
	"github.com/user/wms-backend/internal/handler"
	"github.com/user/wms-backend/internal/middleware"

	scalar "github.com/MarceloPetrucio/go-scalar-api-reference"
)

func Setup(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	authHandler := handler.NewAuthHandler(cfg)
	productHandler := handler.NewProductHandler()
	supplierHandler := handler.NewSupplierHandler()
	customerHandler := handler.NewCustomerHandler()
	poHandler := handler.NewPurchaseOrderHandler()
	invoiceHandler := handler.NewInvoiceHandler()
	paymentHandler := handler.NewPaymentHandler()
	bankAccountHandler := handler.NewBankAccountHandler()
	vehicleHandler := handler.NewVehicleHandler()
	stockHandler := handler.NewStockHandler()
	reportHandler := handler.NewReportHandler()
	userHandler := handler.NewUserHandler()
	fileHandler := handler.NewFileHandler(cfg)
	salesHandler := handler.NewSalesHandler()
	receivingHandler := handler.NewReceivingHandler()
	settingsHandler := handler.NewSettingsHandler(cfg)

	r.Static("/uploads", cfg.UploadDir)

	r.GET("/docs/openapi.json", openapiSpecHandler)

	r.GET("/docs", func(c *gin.Context) {
		html, err := scalar.ApiReferenceHTML(&scalar.Options{
			SpecContent: openapiSpec,
			CustomOptions: scalar.CustomOptions{
				PageTitle: "WMS API Reference",
			},
			DarkMode: true,
		})
		if err != nil {
			c.String(500, err.Error())
			return
		}
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(200, html)
	})

	r.POST("/auth/login", authHandler.Login)
	r.POST("/auth/refresh", authHandler.Refresh)
	r.POST("/auth/logout", authHandler.Logout)

	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		api.GET("/products", productHandler.List)
		api.POST("/products", productHandler.Create)
		api.GET("/products/low-stock", productHandler.LowStock)
		api.GET("/products/barcode/:barcode", productHandler.BarcodeLookup)
		api.GET("/products/:id", productHandler.Get)
		api.PUT("/products/:id", productHandler.Update)
		api.DELETE("/products/:id", productHandler.Delete)

		api.GET("/suppliers", supplierHandler.List)
		api.POST("/suppliers", supplierHandler.Create)
		api.GET("/suppliers/:id", supplierHandler.Get)
		api.PUT("/suppliers/:id", supplierHandler.Update)
		api.DELETE("/suppliers/:id", supplierHandler.Delete)

		api.GET("/customers", customerHandler.List)
		api.POST("/customers", customerHandler.Create)
		api.GET("/customers/:id", customerHandler.Get)
		api.PUT("/customers/:id", customerHandler.Update)
		api.DELETE("/customers/:id", customerHandler.Delete)
		api.GET("/customers/:id/balance", customerHandler.GetBalance)
		api.GET("/customers/:id/transactions", customerHandler.GetTransactions)

		api.GET("/sales", salesHandler.List)
		api.POST("/sales", salesHandler.Create)
		api.GET("/sales/stats", salesHandler.Stats)
		api.GET("/sales/:id", salesHandler.Get)
		api.PUT("/sales/:id", salesHandler.Update)
		api.DELETE("/sales/:id", salesHandler.Delete)
		api.POST("/sales/:id/status", salesHandler.UpdateStatus)
		api.POST("/sales/:id/payment", salesHandler.UpdatePayment)

		api.GET("/receivings", receivingHandler.List)
		api.POST("/receivings", receivingHandler.Create)
		api.GET("/receivings/:id", receivingHandler.Get)
		api.PUT("/receivings/:id", receivingHandler.Update)

		api.GET("/purchase-orders", poHandler.List)
		api.POST("/purchase-orders", poHandler.Create)
		api.GET("/purchase-orders/:id", poHandler.Get)
		api.PUT("/purchase-orders/:id", poHandler.Update)
		api.POST("/purchase-orders/:id/confirm", poHandler.Confirm)
		api.POST("/purchase-orders/:id/mark-awaiting", poHandler.MarkAwaitingDelivery)
		api.POST("/purchase-orders/:id/receive", poHandler.Receive)
		api.POST("/purchase-orders/:id/cancel", poHandler.Cancel)
		api.POST("/purchase-orders/:id/payment", poHandler.UpdatePayment)
		api.GET("/purchase-orders/stats", poHandler.Stats)

		api.GET("/invoices", invoiceHandler.List)
		api.POST("/invoices", invoiceHandler.Create)
		api.GET("/invoices/:id", invoiceHandler.Get)
		api.PUT("/invoices/:id", invoiceHandler.Update)
		api.POST("/invoices/:id/confirm", invoiceHandler.Confirm)
		api.POST("/invoices/:id/dispatch", invoiceHandler.Dispatch)
		api.POST("/invoices/:id/deliver", invoiceHandler.Deliver)
		api.POST("/invoices/:id/cancel", invoiceHandler.Cancel)
		api.POST("/invoices/:id/return", invoiceHandler.Return)

		api.GET("/payments/customer", paymentHandler.ListCustomerPayments)
		api.POST("/payments/customer", paymentHandler.CreateCustomerPayment)
		api.GET("/payments/customer/:id", paymentHandler.GetCustomerPayment)

		api.GET("/payments/supplier", paymentHandler.ListSupplierPayments)
		api.POST("/payments/supplier", paymentHandler.CreateSupplierPayment)
		api.GET("/payments/supplier/:id", paymentHandler.GetSupplierPayment)

		api.GET("/bank-accounts", bankAccountHandler.List)
		api.POST("/bank-accounts", bankAccountHandler.Create)
		api.PUT("/bank-accounts/:id", bankAccountHandler.Update)

		api.GET("/vehicles", vehicleHandler.List)
		api.POST("/vehicles", vehicleHandler.Create)
		api.PUT("/vehicles/:id", vehicleHandler.Update)

		api.GET("/stock", stockHandler.CurrentLevels)
		api.GET("/stock/:product_id", stockHandler.ProductHistory)

		api.GET("/reports/stock", reportHandler.Stock)
		api.GET("/reports/low-stock", reportHandler.LowStock)
		api.GET("/reports/sales-summary", reportHandler.SalesSummary)
		api.GET("/reports/customer-balances", reportHandler.CustomerBalances)
		api.GET("/reports/purchase-orders", reportHandler.PurchaseOrders)
		api.GET("/reports/financial", reportHandler.Financial)
		api.GET("/reports/profit-loss", reportHandler.ProfitLoss)
		api.GET("/reports/warehouse", reportHandler.Stock)

		api.GET("/users", middleware.RoleMiddleware("admin"), userHandler.List)
		api.POST("/users", middleware.RoleMiddleware("admin"), userHandler.Create)
		api.PUT("/users/:id", middleware.RoleMiddleware("admin"), userHandler.Update)
		api.DELETE("/users/:id", middleware.RoleMiddleware("admin"), userHandler.Delete)

		api.GET("/settings/company", settingsHandler.GetCompany)
		api.PUT("/settings/company", middleware.RoleMiddleware("admin"), settingsHandler.UpdateCompany)
		api.POST("/settings/backup", middleware.RoleMiddleware("admin"), settingsHandler.Backup)

		api.POST("/files/upload", fileHandler.Upload)
	}

	return r
}
