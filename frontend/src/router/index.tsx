import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Inventory from "../pages/Inventory";
import ProductionPage from "../pages/ProductionPage";
import Cartera from "../pages/Cartera";
import Purchases from "../pages/Purchases";
import Sales from "../pages/Sales";
import Customers from "../pages/Customers";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Banks from "../pages/Banks";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },

      {
        path: "ventas",
        element: <Sales />,
      },

      {
        path: "clientes",
        element: <Customers />,
      },

      {
        path: "productos",
        element: <Products />,
      },

      {
        path: "inventario",
        element: <Inventory />,
      },

      {
        path: "produccion",
        element: <ProductionPage />,
      },

      {
        path: "cartera",
        element: <Cartera />,
      },

      {
        path: "bancos",
        element: <Banks />,
      },

      {
        path: "compras",
        element: <Purchases />,
      },

      {
        path: "reportes",
        element: <Reports />,
      },

      {
        path: "configuracion",
        element: <Settings />,
      },
    ],
  },
]);