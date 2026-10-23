import { useState } from "react";

import SalesHeader from "../components/sales/SalesHeader";
import SalesStats from "../components/sales/SalesStats";
import SalesFilters from "../components/sales/SalesFilters";
import SalesTable from "../components/sales/SalesTable";
import NewSale from "../components/sales/NewSale";

export default function Sales() {
  const [showNewSale, setShowNewSale] = useState(false);

  if (showNewSale) {
    return (
      <NewSale
        onBack={() => setShowNewSale(false)}
      />
    );
  }

  return (
    <div className="space-y-7">

      <SalesHeader
        onNewSale={() => setShowNewSale(true)}
      />

      <SalesStats />

      <SalesFilters />

      <SalesTable />

    </div>
  );
}