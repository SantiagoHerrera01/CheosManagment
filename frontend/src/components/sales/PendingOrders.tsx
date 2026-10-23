export default function PendingOrders() {
  return (
    <div className="bg-white rounded-2xl shadow p-6">

      <h2 className="text-xl font-semibold mb-5">
        Alertas
      </h2>

      <div className="space-y-5">

        <div>

          <h3 className="font-semibold">
            Pedidos pendientes
          </h3>

          <p className="text-gray-500">
            No hay pedidos pendientes.
          </p>

        </div>

        <div>

          <h3 className="font-semibold">
            Stock bajo
          </h3>

          <p className="text-gray-500">
            Todo el inventario está disponible.
          </p>

        </div>

      </div>

    </div>
  );
}