import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Coffee, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { useAuth } from "../context/auth-context";
import { ApiError } from "../lib/api";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión, no mostramos el formulario
  if (!loading && user) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? "/"} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from ?? "/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No fue posible conectar con el servidor. Intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#3E2924] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#6F4E37] flex items-center justify-center mx-auto mb-4">
            <Coffee size={32} strokeWidth={1.8} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Cheo's Café</h1>
          <p className="text-white/60 text-sm mt-1">Manager · Facturación e inventario</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="text-xl font-bold text-[#3E2924]">Iniciar sesión</h2>

          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#3E2924] mb-1.5">
              Correo
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7A66]"
              />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cheo.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E4D7CD] focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#3E2924] mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7A66]"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-[#E4D7CD] focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E37]/20 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C7A66] hover:text-[#6F4E37]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#6F4E37] hover:bg-[#5b4030] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>

          <p className="text-xs text-[#8B7768] text-center">
            Después de 5 intentos fallidos la cuenta se bloquea 15 minutos.
          </p>
        </form>

        <p className="text-center text-white/40 text-xs mt-6">
          Cheo Manager · Acceso restringido
        </p>
      </div>
    </div>
  );
}
