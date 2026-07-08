import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { useAuthStore } from "../store/authStore";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert } from "@/shared/components/ui/alert";
import { Loader2, User, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { username, password });
      const { access_token, refresh_token, user } = res.data;
      login(user, access_token, refresh_token);
      const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "خطا در ورود به سیستم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">
          نام کاربری
          <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <User className="absolute end-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="username"
            type="text"
            placeholder="نام کاربری خود را وارد کنید"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="ps-3 pe-8 h-9"
            required
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          رمز عبور
          <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Lock className="absolute end-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="password"
            type="password"
            placeholder="رمز عبور خود را وارد کنید"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ps-3 pe-8 h-9"
            required
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <span className="text-sm">{error}</span>
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full h-9 gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {loading ? "در حال ورود..." : "ورود به سیستم"}
      </Button>
    </form>
  );
}
