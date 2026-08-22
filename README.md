# OurERP
WMS - ERP

A warehouse management system handling products, customers, suppliers, purchases, sales, and their returns.

## Stack

**Backend** (`Backend-Net/`)
- .NET 10 / C# with clean-layered CQRS architecture (MediatR)
- Entity Framework Core + SQL Server
- FluentValidation, AutoMapper, JWT auth
- Scalar/OpenAPI for API docs
- Object storage via Liara (S3-compatible)

**Frontend** (`Frontend/`)
- React (Vite)

## Backend Docs

- [API Guide](Backend-Net/docs/api-guide.fa.md) — All endpoints with inputs, outputs, and usage
- [Purchase Return Guide](Backend-Net/docs/purchase-return-guide.fa.md) — Purchase receiving and supplier return implementation
- [Sale Return Guide](Backend-Net/docs/sale-return-guide.fa.md) — Sale shipping and customer return implementation
- [Return Scenarios Guide](Backend-Net/docs/return-scenarios-guide.fa.md) — Business scenarios for both purchase and sale returns
- [Product Code, Barcode & Invoice Design](Backend-Net/docs/product-code-barcode-invoice-design.fa.md) — Product code generation, barcode rendering, and invoice PDF design
