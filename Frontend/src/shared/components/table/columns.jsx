import DetailsLink from "./DetailsLink";

/**
 * ستونِ استانداردِ «جزئیات» برای `DataTable`.
 *
 * @param {(row: object) => string} getPath آدرسِ صفحه‌ی جزئیاتِ هر ردیف
 */
export function detailsColumn(getPath, { header = "جزئیات", label } = {}) {
  return {
    id: "actions",
    header,
    enableSorting: false,
    cell: ({ row }) => <DetailsLink to={getPath(row.original)}>{label}</DetailsLink>,
  };
}
