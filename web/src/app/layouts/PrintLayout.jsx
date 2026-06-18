import { Outlet } from "react-router";

export default function PrintLayout() {
  return (
    <div className="p-6">
      <Outlet />
    </div>
  );
}
