# 📦 OurERP — Frontend Documentation

Integrated Warehouse, Sales, Purchase, and Financial Management System (ERP) — Frontend Application

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![pnpm](https://img.shields.io/badge/pnpm-required-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Monorepo Structure](#-monorepo-structure)
- [Installation & Setup](#-installation--setup)
- [API Connection Configuration](#-api-connection-configuration)
- [Available Scripts](#-available-scripts)
- [Frontend Project Structure](#-frontend-project-structure)
- [Architecture & Design Patterns](#-architecture--design-patterns)
- [State Management](#-state-management)
- [Routing](#-routing)
- [UI Components](#-ui-components)
- [Import Rules (Path Alias)](#-import-rules-path-alias)
- [Adding a New Feature](#-adding-a-new-feature)
- [Coding Standards](#-coding-standards)
- [Contributing](#-contributing)

---

## 📖 About the Project

**OurERP** is a warehouse and enterprise resource management system that covers the following business processes:

- 🏭 Warehouse and product management (Products, Receiving)
- 🛒 Purchases and purchase returns (Purchases)
- 💰 Sales, proforma invoices, and sales returns (Sales)
- 👥 Customer and supplier management (Customers, Suppliers)
- 🧾 Invoices and financial transactions (Invoice, Transactions)
- 📊 Financial, sales, purchase, and warehouse reports (Reports)
- ⚙️ System settings, users, and permissions (Settings)
- 🔐 Authentication and access control (Auth)

This repository is a **monorepo** containing two main parts:

OurERP/
├── backend/     # Backend service (Go)
└── frontend/    # Frontend application (React) ← this project


---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | React 19 |
| **Bundler** | Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI + shadcn/ui |
| **Server State** | TanStack Query (React Query) v5 |
| **Client State** | Zustand |
| **Tables** | TanStack Table v8 |
| **Forms** | React Hook Form |
| **Routing** | React Router v7 |
| **HTTP Client** | Axios |
| **Notifications** | react-hot-toast |
| **Barcode/QR** | react-barcode, react-qr-reader |
| **Font** | Vazirmatn (Persian) |
| **Package Manager** | pnpm |
| **Linter** | ESLint 10 |

---

## ✅ Prerequisites

Before you begin, make sure the following are installed on your system:

- **Node.js** version `18` or higher (recommended: latest LTS)
- **pnpm** (this project is managed exclusively with pnpm — do not use `npm` or `yarn`)

```bash
# Check if pnpm is installed
pnpm -v

# Install pnpm if needed
npm install -g pnpm
```

- The **Go backend service** must be running locally or accessible remotely (`backend/` directory in this monorepo)

---

## 🗂 Monorepo Structure

OurERP/                     # Monorepo root
├── backend/                # Go service (API, database, business logic)
│   └── ...
│
└── frontend/                # React application (this project)
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── ...


> Since both parts live in the same repository, all install and run commands must be executed **from inside the `frontend/` directory**.

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Mr0Hadi/OurERP.git
cd OurERP/frontend
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run in development mode

```bash
pnpm dev
```

By default, the app runs at:

http://localhost:5173


> ⚠️ Before running, make sure the Go backend (`backend/` directory) is up and its address matches the value configured in the Axios setup (see next section).

### 4. Build for production

```bash
pnpm build
```

The build output is generated in the `dist/` directory.

### 5. Preview the production build

```bash
pnpm preview
```

---

## 🔧 API Connection Configuration

This project does not use a `.env` file. The API base URL and other constants are configured directly in code, inside the Axios setup file:

src/shared/services/api/api.js


```js
// src/shared/services/api/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1', // Go backend address
});
```

> 📌 If you need environment-specific configuration in the future (development / staging / production), it's recommended to adopt Vite environment variables (`import.meta.env.VITE_*` with `.env` files). This is not currently implemented — the API address is hardcoded.

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `pnpm dev` | `vite` | Start the development server with hot reload |
| `pnpm build` | `vite build` | Build the production bundle |
| `pnpm preview` | `vite preview` | Preview the production build locally |
| `pnpm lint` | `eslint .` | Run ESLint checks |
| `pnpm st` | `node structure.js` | Generate/print the project's directory tree |

---

## 📁 Frontend Project Structure

The project follows a **Feature-Based (Feature-Sliced)** architecture. Each business feature is self-contained, maintainable, and independently extendable.


### Internal structure of a feature module

Each feature (e.g., `customers`, `sales`, `purchases`) follows a consistent pattern:

features/<feature-name>/
├── components/       # Feature-specific components (forms, tables, filters)
├── domain/           # Domain logic, types, models, and computation helpers
├── hooks/             # Feature-specific hooks (form logic, debounced filters, etc.)
├── pages/              # Route-level pages (List, Detail, New, Edit)
├── routes/              # Route definitions for this feature
│   ├── index.js
│   └── routes.jsx
├── services/             # API communication layer
│   ├── api.js            # Raw Axios calls
│   ├── queries.js        # React Query hooks (useQuery)
│   ├── mutations.js      # React Query hooks (useMutation)
│   └── queryKeys.js      # Query keys for cache management
└── store/                 # Zustand stores scoped to this feature (filters, forms)


> 📌 Note that not every feature currently populates every folder (e.g., `dashboard`, `reports`, `settings`, and `transactions` may have empty `domain/`, `services/`, or `store/` directories). This is the intended structure to fill in as those features grow — some also nest sub-domains directly (e.g., `warehouse/products`, `warehouse/receiving`, and `transactions/buySell`, `transactions/paymentsReceipts`, `transactions/salesReturns`).

---

## 🏗 Architecture & Design Patterns

### Application layering

┌─────────────────────────────────────┐
│              main.jsx                 │  Entry point
├─────────────────────────────────────┤
│      app/providers/AppProviders       │  Global providers
│  (Query, Theme, Toast, Router)        │
├─────────────────────────────────────┤
│         app/routes/routers.jsx        │  Route definitions
├─────────────────────────────────────┤
│  app/layouts (AppLayout/AuthLayout)   │  Layout shells
├─────────────────────────────────────┤
│         features/* (pages)             │  Feature pages
├─────────────────────────────────────┤
│  features/*/services (React Query)     │  API communication
├─────────────────────────────────────┤
│    shared/services/api/api.js           │  Axios setup (connects to backend/)
└─────────────────────────────────────┘


### API communication pattern (example within a feature)

```js
// services/api.js  → raw Axios functions
export const getCustomers = (params) => api.get('/customers', { params });

// services/queryKeys.js → React Query cache keys
export const customerKeys = {
  all: ['customers'],
  list: (filters) => [...customerKeys.all, 'list', filters],
  detail: (id) => [...customerKeys.all, 'detail', id],
};

// services/queries.js → useQuery hooks
export const useCustomers = (filters) =>
  useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => getCustomers(filters),
  });

// services/mutations.js → useMutation hooks
export const useCreateCustomer = () =>
  useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries(customerKeys.all),
  });
```

---

## 🗃 State Management

The project separates state into **two distinct categories**:

### 1. Server State → TanStack Query
Used for any data coming from the API (Go backend) — product lists, invoices, customers, etc. `React Query` handles caching, background refetching, and loading/error states.

### 2. Client State → Zustand
Used for client-only state such as:
- Table filters (`customerFilterStore.js`, `purchaseFilterStore.js`, `saleFilterStore.js`, `supplierFilterStore.js`, `productFilterStore.js`, `receivingFilterStore.js`)
- Multi-step form state (`purchaseFormStore.js`, `saleFormStore.js`, `receivingFormStore.js`)
- Global app state (`authStore.js`, `themeStore.js`, `navigationStore.js`, `headerStore.js`)

```js
// Example Zustand store
import { create } from 'zustand';

export const useCustomerFilterStore = create((set) => ({
  filters: { search: '', status: 'all' },
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: { search: '', status: 'all' } }),
}));
```

---

## 🧭 Routing

Routing is implemented with **React Router v7** in a **modular** fashion. Each feature defines its own routes (in `routes.jsx` or `routes/routes.jsx`), which are then aggregated in `app/routes/routers.jsx`.

### Layout shells

| Layout | Purpose |
|---|---|
| `AppLayout.jsx` | Main application shell (Sidebar, Header, Breadcrumb) |
| `AuthLayout.jsx` | Authentication pages (Login) |
| `PrintLayout.jsx` | Print-oriented pages (invoices, receipts) |
| `NotFoundPage.jsx` | 404 page |

### Protected routes

- `RequireAuth.jsx` — ensures the user is authenticated
- `protectedLoader.jsx` — loader for protected routes (verifies auth before rendering)
- `usePermissions.js` — role-based access control (RBAC)

### Example route definition within a feature

```jsx
// features/customers/routes/routes.jsx
export const customerRoutes = [
  { path: 'customers', element: <CustomersPage /> },
  { path: 'customers/new', element: <CustomerNewPage /> },
  { path: 'customers/:id', element: <CustomerDetailPage /> },
];
```

---

## 🎨 UI Components

The project uses **shadcn/ui** together with **Radix UI** for base components, located under `shared/components/ui` (Button, Dialog, Table, Sidebar, Select, and more).

### Adding a new shadcn component

```bash
pnpm dlx shadcn@latest add <component-name>
```

> shadcn configuration lives in `components.json`.

### Theme and RTL support

- `ThemeProvider.jsx` and `theme-provider.jsx` → light/dark theme management
- `direction.jsx` → RTL direction handling for Persian
- The **Vazirmatn** Persian font is enabled by default

---

## 🔗 Import Rules (Path Alias)

The project uses a **path alias** to avoid long relative imports:

```json
// package.json
"imports": {
  "#/*": "./src/*"
}
```

### Usage example:

```js
// ❌ Instead of this:
import { Button } from '../../../../shared/components/ui/button';

// ✅ Use this:
import { Button } from '#/shared/components/ui/button';
```

> ⚠️ Make sure `jsconfig.json` and `vite.config.js` define the same alias so both IntelliSense and Vite's module resolution work correctly.

---

## ➕ Adding a New Feature

To add a new feature to the project, follow this structure:

```bash
src/features/<new-feature>/
├── components/
├── domain/
├── hooks/
├── pages/
├── routes/
│   ├── index.js
│   └── routes.jsx
├── services/
│   ├── api.js
│   ├── queries.js
│   ├── mutations.js
│   └── queryKeys.js
└── store/
```

### Steps:

1. Create the feature folder with the structure above.
2. Implement the required pages and components.
3. Define API calls in `services/api.js`.
4. Build `useQuery`/`useMutation` hooks in `queries.js` and `mutations.js`.
5. Define the feature's routes in `routes/routes.jsx`.
6. Register the feature's routes in `app/routes/routers.jsx`.
7. If a menu entry is needed, add it to `shared/constants/navigationData.js`.

---

## 📏 Coding Standards

- ✅ Run **ESLint** before every commit: `pnpm lint`
- ✅ Component naming: `PascalCase.jsx` (e.g., `CustomerTable.jsx`)
- ✅ Hook naming: `camelCase` with a `use` prefix (e.g., `useCustomerForm.js`)
- ✅ Store naming: `<feature>Store.js` (e.g., `authStore.js`)
- ✅ Each feature must remain self-contained — no direct imports from another feature's internals (only through `shared`)
- ✅ API logic must always live in the `services` layer, never inside components
- ✅ Use `react-hook-form` for all forms
- ✅ Use `react-hot-toast` for success/error feedback instead of `alert`

---

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes with a clear message:
   ```bash
   git commit -m "feat(customers): add customer export to excel"
   ```
4. Run lint before pushing (from inside the `frontend/` directory):
   ```bash
   pnpm lint
   ```
5. Push and open a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 📄 License

This project is private and intended solely for internal team use.

---

<div align="center">

Built with ❤️ by the OurERP team

[Report a Bug](https://github.com/Mr0Hadi/OurERP/issues) · [Request a Feature](https://github.com/Mr0Hadi/OurERP/issues)

</div>

---