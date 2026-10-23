import { Plus, ShoppingCart } from "lucide-react";

type SalesHeaderProps = {
  onNewSale: () => void;
};

export default function SalesHeader({
  onNewSale,
}: SalesHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

      <div className="flex items-center gap-4">

        <div className="w-12 h-12 rounded-2xl bg-[#6F4E37] text-white flex items-center justify-center shrink-0">
          <ShoppingCart size={23} />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-stone-800">
            Ventas
          </h1>

          <p className="text-stone-500 mt-1">
            Consulta y administra las ventas de Cheo's Café.
          </p>
        </div>

      </div>

      <button
        type="button"
        onClick={onNewSale}
        className="
          w-full
          sm:w-auto
          flex
          items-center
          justify-center
          gap-2
          px-5
          py-3
          rounded-xl
          bg-[#6F4E37]
          hover:bg-[#5B3F2D]
          text-white
          font-semibold
          transition
        "
      >
        <Plus size={19} />
        Nueva venta
      </button>

    </div>
  );
}