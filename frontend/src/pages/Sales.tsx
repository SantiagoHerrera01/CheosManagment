import { useCallback, useEffect, useState } from "react";

import { ShoppingCart } from "lucide-react";

import SalesHeader from "../components/sales/SalesHeader";
import SalesStats from "../components/sales/SalesStats";
import SalesFilters, {
  type SalesFilterValues,
} from "../components/sales/SalesFilters";
import SalesTable from "../components/sales/SalesTable";
import NewSale from "../components/sales/NewSale";
import Modal from "../components/ui/Modal";

import { api, ApiError, qs } from "../lib/api";
import type { Invoice, Paginated } from "../types/api";

const emptyFilters: SalesFilterValues = {
  q: "",
  status: "",
  from: "",
  to: "",
};

export default function Sales() {
  const [showNewSale, setShowNewSale] =
    useState(false);

  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [filters, setFilters] =
    useState<SalesFilterValues>(emptyFilters);

  /** Trae la lista de facturas según los filtros actuales. */
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all: Invoice[] = [];
      // El backend limita a 100 por página: recorremos todas las páginas.
      // withItems=true trae las líneas para poder ver el detalle sin otro fetch.
      for (let page = 1; ; page += 1) {
        const result = await api.get<Paginated<Invoice>>(
          `/invoices${qs({
            q: filters.q.trim(),
            status: filters.status,
            from: filters.from,
            to: filters.to,
            withItems: "true",
            page,
            limit: 100,
          })}`
        );
        all.push(...result.data);
        if (all.length >= result.meta.total || result.data.length === 0) break;
      }
      setInvoices(all);
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "No fue posible cargar las facturas."
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce: evita una petición por tecla (350 ms) y al cambiar filtros.
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadInvoices();
    }, 350);
    return () => clearTimeout(timer);
  }, [loadInvoices]);

  /** Recarga la lista (tras abonar, anular o crear una venta). */
  const reload = useCallback(() => {
    void loadInvoices();
  }, [loadInvoices]);

  return (
    <div className="space-y-7">

      <SalesHeader
        onNewSale={() => setShowNewSale(true)}
      />

      <SalesStats
        invoices={invoices}
      />

      <SalesFilters
        q={filters.q}
        status={filters.status}
        from={filters.from}
        to={filters.to}
        onChange={setFilters}
      />

      <SalesTable
        invoices={invoices}
        loading={loading}
        error={loadError}
        reload={reload}
      />

      {/* MODAL NUEVA VENTA */}
      {showNewSale && (
        <Modal
          icon={ShoppingCart}
          title="Nueva venta"
          subtitle="Registra una nueva venta de Cheo's Café."
          onClose={() => setShowNewSale(false)}
          size="xl"
        >
          <NewSale
            onBack={() => setShowNewSale(false)}
            onSaleCreated={reload}
          />
        </Modal>
      )}

    </div>
  );
}
