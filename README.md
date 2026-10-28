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
- React 19 (Vite), TanStack Query, Zustand, Tailwind + shadcn, RTL Persian UI

## Frontend Docs

- [Frontend Architecture](Frontend/docs/architecture/README.md) — start here: structure, routing, auth, API layer, state, UI, per-feature docs, recipes, known debt (Persian)
- [Frontend/CLAUDE.md](Frontend/CLAUDE.md) — short summary of commands and conventions

## Backend Docs

- [API Guide](Backend-Net/docs/api-guide.fa.md) — All endpoints with inputs, outputs, and usage
- [Frontend Requests](Backend-Net/docs/frontend-requests.fa.md) — Open backend requests from the frontend team, with a status checklist
- [Product Code, Barcode & Invoice Design](Backend-Net/docs/product-code-barcode-invoice-design.fa.md) — Product code generation, barcode rendering, and invoice PDF design
