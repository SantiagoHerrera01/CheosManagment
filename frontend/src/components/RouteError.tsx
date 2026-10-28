import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { TriangleAlert } from "lucide-react";

/**
 * Pantalla de error de ruta (bug 19): reemplaza la pantalla en blanco
 * cuando un loader/element lanza una excepción o la ruta no existe.
 */
export default function RouteError() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado.";

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center">
          <TriangleAlert size={24} className="text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-stone-800">
          Algo salió mal
        </h1>

        <p className="text-sm text-stone-500 break-words">{message}</p>

        <Link
          to="/"
          className="inline-block px-4 py-2 rounded-lg bg-[#4B2F26] text-white text-sm font-semibold hover:bg-[#3E2924] transition"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
