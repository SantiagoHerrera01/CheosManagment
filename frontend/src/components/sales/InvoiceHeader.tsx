export default function InvoiceHeader() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-bold">
          Nueva factura
        </h1>

        <p className="text-gray-500 mt-2">
          Registra una nueva venta de Cheo's Café.
        </p>
      </div>

      <div className="bg-[#6F4E37] text-white px-6 py-4 rounded-2xl shadow">
        <p className="text-sm opacity-80">
          Factura
        </p>

        <p className="text-2xl font-bold">
          #000001
        </p>
      </div>
    </div>
  );
}