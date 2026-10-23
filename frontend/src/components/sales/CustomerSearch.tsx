import { useMemo, useState } from "react";
import { customers } from "../../data/customers";

interface Props {
  onSelect?: (customer: any) => void;
}

export default function CustomerSearch({ onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.document.includes(search)
      );
    });
  }, [search]);

  return (
    <div className="bg-white rounded-2xl shadow">

      <div className="border-b px-6 py-4">

        <h2 className="text-xl font-bold">
          Cliente
        </h2>

      </div>

      <div className="p-6 space-y-4">

        <input
          className="
            w-full
            border
            rounded-xl
            p-3
            focus:outline-none
            focus:ring-2
            focus:ring-[#6F4E37]
          "
          placeholder="Buscar por nombre o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">

          {filteredCustomers.map((customer) => (

            <button
              key={customer.id}
              type="button"
              onClick={() => onSelect?.(customer)}
              className="
                w-full
                text-left
                px-4
                py-3
                border-b
                hover:bg-[#F8F5F2]
                transition
              "
            >

              <div className="font-semibold">
                {customer.name}
              </div>

              <div className="text-sm text-gray-500">
                {customer.document}
              </div>

            </button>

          ))}

        </div>

        <button
          className="
            w-full
            py-3
            rounded-xl
            bg-[#6F4E37]
            text-white
            font-semibold
            hover:bg-[#5B3F2D]
            transition
          "
        >
          + Crear nuevo cliente
        </button>

      </div>

    </div>
  );
}