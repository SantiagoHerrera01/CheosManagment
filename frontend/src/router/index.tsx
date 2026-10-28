import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import RouteError from "../components/RouteError";

import RequireAuth from "./RequireAuth";

import {
  Banks,
  Cartera,
  Customers,
  Dashboard,
  Expenses,
  Inventory,
  LazyPage,
  Login,
  ProductionPage,
  Products,
  Purchases,
  Reports,
  Sales,
  Settings,
  Users,
} from "./pages";
import RequireRole from "./RequireRole";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <LazyPage>
        <Login />
      </LazyPage>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <Dashboard />
          </LazyPage>
        ),
      },

      {
        path: "ventas",
        element: (
          <LazyPage>
            <Sales />
          </LazyPage>
        ),
      },

      {
        path: "clientes",
        element: (
          <LazyPage>
            <Customers />
          </LazyPage>
        ),
      },

      {
        path: "productos",
        element: (
          <LazyPage>
            <Products />
          </LazyPage>
        ),
      },

      {
        path: "inventario",
        element: (
          <LazyPage>
            <Inventory />
          </LazyPage>
        ),
      },

      {
        path: "produccion",
        element: (
          <LazyPage>
            <ProductionPage />
          </LazyPage>
        ),
      },

      {
        path: "cartera",
        element: (
          <LazyPage>
            <Cartera />
          </LazyPage>
        ),
      },

      {
        path: "gastos",
        element: (
          <LazyPage>
            <Expenses />
          </LazyPage>
        ),
      },

      {
        path: "bancos",
        element: (
          <LazyPage>
            <Banks />
          </LazyPage>
        ),
      },

      {
        path: "compras",
        element: (
          <LazyPage>
            <Purchases />
          </LazyPage>
        ),
      },

      {
        path: "reportes",
        element: (
          <LazyPage>
            <Reports />
          </LazyPage>
        ),
      },

      {
        path: "configuracion",
        element: (
          <LazyPage>
            <Settings />
          </LazyPage>
        ),
      },

      {
        path: "usuarios",
        element: (
          <RequireRole roles={[]}>
            <LazyPage>
              <Users />
            </LazyPage>
          </RequireRole>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
