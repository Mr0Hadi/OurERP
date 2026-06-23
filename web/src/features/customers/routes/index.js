// src/features/customers/routes/index.js
import { lazy } from "react";

export const CustomersPage = lazy(() => import("../pages/CustomersPage"));
export const CustomerDetailPage = lazy(() => import("../pages/CustomerDetailPage"));
export const CustomerNewPage = lazy(() => import("../pages/CustomerNewPage"));
