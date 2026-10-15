import DetailsLink from "./DetailsLink";

/**
 * ستونِ استانداردِ «جزئیات» برای `DataTable`.
 * در موبایل (`meta.rowLink`) به‌جای دکمه، کلِ کارتِ ردیف لینک می‌شود.
 *
 * @param {(row: object) => string} getPath آدرسِ صفحه‌ی جزئیاتِ هر ردیف
 */
export function detailsColumn(getPath, { header = "جزئیات", label } = {}) {
  return {
    id: "actions",
    header,
    enableSorting: false,
    meta: { rowLink: getPath },
    cell: ({ row }) => <DetailsLink to={getPath(row.original)}>{label}</DetailsLink>,
  };
}
