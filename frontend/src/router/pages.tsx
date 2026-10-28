import { lazy, Suspense, type ReactNode } from "react";

// Code-splitting (bug 19): cada página genera su propio chunk y la carga
// inicial se queda con el layout + Login.
export const Dashboard = lazy(() => import("../pages/Dashboard"));
export const Products = lazy(() => import("../pages/Products"));
export const Inventory = lazy(() => import("../pages/Inventory"));
export const ProductionPage = lazy(() => import("../pages/ProductionPage"));
export const Cartera = lazy(() => import("../pages/Cartera"));
export const Expenses = lazy(() => import("../pages/Expenses"));
export const Purchases = lazy(() => import("../pages/Purchases"));
export const Sales = lazy(() => import("../pages/Sales"));
export const Customers = lazy(() => import("../pages/Customers"));
export const Reports = lazy(() => import("../pages/Reports"));
export const Settings = lazy(() => import("../pages/Settings"));
export const Banks = lazy(() => import("../pages/Banks"));
export const Login = lazy(() => import("../pages/Login"));

/** Indicador de carga mientras se descarga el chunk de la página. */
function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-[#4B2F26] animate-spin" />
    </div>
  );
}

/** Envuelve una página lazy en su Suspense con fallback de carga. */
export function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}
