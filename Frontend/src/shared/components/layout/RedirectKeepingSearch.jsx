import { Navigate, useLocation } from "react-router-dom";

/**
 * هدایتِ نشانیِ قدیمی به نشانیِ تازه با همان پارامترها (`?view=overdue&customerId=5`) — برای وقتی که صفحه‌ای
 * جابه‌جا می‌شود و پیوندها/نشانک‌های قبلی نباید بشکنند. در `routes.jsx`ِ فیچر به‌جای `element`.
 */
export default function RedirectKeepingSearch({ to }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}
