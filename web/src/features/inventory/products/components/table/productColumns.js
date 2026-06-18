export const productColumns = [
  { accessorKey: "name", header: "نام کالا" },
  { accessorKey: "sku", header: "کد کالا" },
  {
    accessorKey: "stock",
    header: "موجودی",
    cell: ({ getValue }) => `${getValue()} عدد`,
  },
];
