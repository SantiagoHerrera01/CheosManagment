export default function PaymentSection() {
  return (
    <div className="bg-white rounded-2xl shadow p-6">

      <h2 className="text-xl font-semibold mb-5">
        Método de pago
      </h2>

      <div className="space-y-3">

        <label className="flex gap-3">

          <input type="radio" name="payment" />

          Contado

        </label>

        <label className="flex gap-3">

          <input type="radio" name="payment" />

          Transferencia

        </label>

        <label className="flex gap-3">

          <input type="radio" name="payment" />

          Crédito

        </label>

        <label className="flex gap-3">

          <input type="radio" name="payment" />

          Bono

        </label>

      </div>

    </div>
  );
}