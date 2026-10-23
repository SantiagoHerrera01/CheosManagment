import {
  CircleDollarSign,
  ShoppingCart,
  Clock3,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    title: "Ventas de hoy",
    value: "$1.250.000",
    description: "8 ventas registradas",
    icon: CircleDollarSign,
  },
  {
    title: "Ventas del mes",
    value: "$18.450.000",
    description: "124 ventas registradas",
    icon: ShoppingCart,
  },
  {
    title: "Pendiente de cobro",
    value: "$2.350.000",
    description: "12 ventas a crédito",
    icon: Clock3,
  },
  {
    title: "Ganancia estimada",
    value: "$6.820.000",
    description: "Margen aproximado",
    icon: TrendingUp,
  },
];

export default function SalesStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="
              bg-white
              border
              border-stone-200
              rounded-2xl
              p-5
              shadow-sm
            "
          >
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm text-stone-500">
                  {stat.title}
                </p>

                <p className="text-2xl font-bold text-stone-800 mt-2">
                  {stat.value}
                </p>

                <p className="text-xs text-stone-400 mt-2">
                  {stat.description}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
                <Icon size={21} />
              </div>

            </div>
          </div>
        );
      })}

    </div>
  );
}