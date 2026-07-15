package database

import (
	"log"
)

func RunMigrations() error {
	migrations := []string{
		createUsersTable,
		createProductsTable,
		createSuppliersTable,
		createCustomersTable,
		createVehiclesTable,
		createBankAccountsTable,
		createChecksTable,
		createPurchaseOrdersTable,
		createPurchaseOrderItemsTable,
		createInvoicesTable,
		createInvoiceItemsTable,
		createStockMovementsTable,
		createCustomerPaymentsTable,
		createSupplierPaymentsTable,
		createReturnsTable,
		createStatusLogsTable,
		createIndexes,
		addBarcodeUnique,
		addProductFields,
		createSalesTable,
		createSaleItemsTable,
		createReceivingsTable,
		createReceivingItemsTable,
		createCompanySettingsTable,
		addCustomerAddressFields,
		addSupplierAddressAndBalanceFields,
		fixPurchaseOrderStatusCheck,
		addPurchaseOrderAmountFields,
		addPurchaseOrderItemFields,
	}

	for _, m := range migrations {
		if _, err := DB.Exec(m); err != nil {
			return err
		}
	}
	log.Println("Migrations completed successfully")
	return nil
}

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin','sales','warehouse','accounting','procurement')),
    department VARCHAR(50) NOT NULL CHECK (department IN ('sales','warehouse','accounting','procurement','legal')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createProductsTable = `
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    internal_code VARCHAR(100) UNIQUE NOT NULL,
    supplier_code VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    reorder_threshold NUMERIC(12,2) DEFAULT 0,
    cost_price NUMERIC(12,2) DEFAULT 0,
    sale_price_retail NUMERIC(12,2) DEFAULT 0,
    sale_price_wholesale NUMERIC(12,2) DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createSuppliersTable = `
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(100),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createCustomersTable = `
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('retail','wholesale','mechanic')),
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(100),
    address TEXT,
    referral_code VARCHAR(100),
    credit_limit NUMERIC(12,2) DEFAULT 0,
    customer_grade INTEGER DEFAULT 1 CHECK (customer_grade BETWEEN 1 AND 5),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createVehiclesTable = `
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createBankAccountsTable = `
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createChecksTable = `
CREATE TABLE IF NOT EXISTS checks (
    id SERIAL PRIMARY KEY,
    check_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    due_date DATE,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued','cleared','bounced')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createPurchaseOrdersTable = `
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','shipped','partially_received','received','cancelled')),
    expected_delivery_date DATE,
    supplier_invoice_number VARCHAR(100),
    notes TEXT,
    received_by INTEGER REFERENCES users(id),
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createPurchaseOrderItemsTable = `
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    ordered_quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    received_quantity NUMERIC(12,2),
    discrepancy_note TEXT
);`

const createInvoicesTable = `
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    proforma_number VARCHAR(50),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('wholesale','retail','mechanic')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'proforma' CHECK (status IN ('proforma','confirmed','dispatched','delivered','cancelled')),
    notes TEXT,
    dispatched_by INTEGER REFERENCES users(id),
    dispatched_at TIMESTAMP,
    vehicle_id INTEGER REFERENCES vehicles(id),
    packer_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createInvoiceItemsTable = `
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    price_override_reason TEXT,
    price_overridden_by INTEGER REFERENCES users(id)
);`

const createStockMovementsTable = `
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,2) NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('purchase_in','sale_out','return_in','return_out','adjustment')),
    reference_id INTEGER,
    reference_type VARCHAR(50),
    performed_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);`

const createCustomerPaymentsTable = `
CREATE TABLE IF NOT EXISTS customer_payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash','transfer','check')),
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    check_id INTEGER REFERENCES checks(id),
    reference_invoice_id INTEGER REFERENCES invoices(id),
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);`

const createSupplierPaymentsTable = `
CREATE TABLE IF NOT EXISTS supplier_payments (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash','transfer','check')),
    check_id INTEGER REFERENCES checks(id),
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    payment_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);`

const createReturnsTable = `
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity NUMERIC(12,2) NOT NULL,
    reason TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);`

const createStatusLogsTable = `
CREATE TABLE IF NOT EXISTS status_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);`

const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_internal_code ON products(internal_code);
CREATE INDEX IF NOT EXISTS idx_products_supplier_code ON products(supplier_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_status_logs_entity ON status_logs(entity_type, entity_id);`

const addBarcodeUnique = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL;`

const addProductFields = `
DO $$ BEGIN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tax NUMERIC(5,2) DEFAULT 0;
END $$;`

const createSalesTable = `
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','partially_delivered','delivered','cancelled')),
    payment_type VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash','credit','check','transfer','mixed')),
    paid_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    check_number VARCHAR(100),
    transfer_ref VARCHAR(100),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createSaleItemsTable = `
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_code VARCHAR(100) NOT NULL DEFAULT '',
    product_name VARCHAR(255) NOT NULL DEFAULT '',
    unit VARCHAR(50) DEFAULT 'piece',
    qty NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL
);`

const createReceivingsTable = `
CREATE TABLE IF NOT EXISTS receivings (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    supplier_name VARCHAR(255) NOT NULL DEFAULT '',
    warehouse_location VARCHAR(255) DEFAULT '',
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','completed','cancelled')),
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const createReceivingItemsTable = `
CREATE TABLE IF NOT EXISTS receiving_items (
    id SERIAL PRIMARY KEY,
    receiving_id INTEGER NOT NULL REFERENCES receivings(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_code VARCHAR(100) NOT NULL DEFAULT '',
    product_name VARCHAR(255) NOT NULL DEFAULT '',
    expected_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    received_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    condition VARCHAR(100) DEFAULT '',
    notes TEXT
);`

const createCompanySettingsTable = `
CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name VARCHAR(255) DEFAULT '',
    tax_id VARCHAR(100) DEFAULT '',
    address TEXT DEFAULT '',
    phone VARCHAR(100) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);`

const addCustomerAddressFields = `
DO $$ BEGIN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT '';
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'none';
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) DEFAULT 0;
END $$;`

const addSupplierAddressAndBalanceFields = `
DO $$ BEGIN
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT '';
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'none';
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) DEFAULT 0;
END $$;`

const fixPurchaseOrderStatusCheck = `
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (status IN ('pending','shipped','partially_received','received','cancelled'));`

const addPurchaseOrderAmountFields = `
DO $$ BEGIN
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0;
END $$;`

const addPurchaseOrderItemFields = `
DO $$ BEGIN
    ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100) DEFAULT '';
    ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) DEFAULT '';
    ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2) DEFAULT 0;
END $$;`
