import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import type {
  BankAccount,
  BankMovement,
  BankMovementType,
  Paginated,
} from "../types/api";

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const MOVEMENT_LABELS: Record<BankMovementType, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
};

async function fetchAllMovements(accountId?: string): Promise<BankMovement[]> {
  const all: BankMovement[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<BankMovement>>(
      `/banks/movements${qs({ accountId, page, limit: 100 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

export default function Banks() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("");

  // Modal nueva cuenta
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: "",
    bank: "",
    accountNumber: "",
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Modal nuevo movimiento
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    accountId: "",
    type: "ENTRADA" as BankMovementType,
    amount: "",
    concept: "",
  });
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [accountRows, movementRows] = await Promise.all([
      api.get<BankAccount[]>("/banks/accounts?includeInactive=true"),
      fetchAllMovements(accountFilter || undefined),
    ]);

    return { accounts: accountRows, movements: movementRows };
  }, [accountFilter]);

  const load = useCallback(() => {
    return fetchAll()
      .then((result) => {
        setAccounts(result.accounts);
        setMovements(result.movements);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar las cuentas."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    setAccountError(null);

    if (!accountForm.name.trim() || !accountForm.bank.trim()) {
      setAccountError("Indica el nombre y el banco.");
      return;
    }

    setSavingAccount(true);

    try {
      await api.post("/banks/accounts", {
        name: accountForm.name.trim(),
        bank: accountForm.bank.trim(),
        accountNumber: accountForm.accountNumber.trim() || null,
      });

      setAccountOpen(false);
      setAccountForm({ name: "", bank: "", accountNumber: "" });
      await load();
    } catch (error) {
      setAccountError(
        error instanceof ApiError
          ? error.message
          : "No fue posible crear la cuenta."
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleCreateMovement(event: FormEvent) {
    event.preventDefault();
    setMovementError(null);

    const amount = Number(movementForm.amount);
    if (!movementForm.accountId || !Number.isFinite(amount) || amount === 0) {
      setMovementError("Selecciona la cuenta y pon un monto distinto de cero.");
      return;
    }

    if (movementForm.type !== "AJUSTE" && amount < 0) {
      setMovementError("Para entradas y salidas el monto es positivo.");
      return;
    }

    setSavingMovement(true);

    try {
      await api.post("/banks/movements", {
        accountId: movementForm.accountId,
        type: movementForm.type,
        amount,
        concept: movementForm.concept.trim(),
      });

      setMovementOpen(false);
      setMovementForm({ accountId: "", type: "ENTRADA", amount: "", concept: "" });
      await load();
    } catch (error) {
      setMovementError(
        error instanceof ApiError
          ? error.message
          : "No fue posible registrar el movimiento."
      );
    } finally {
      setSavingMovement(false);
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-[#6F4E37]";

  return (
    <div className="space-y-8">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900">
            Bancos
          </h1>

          <p className="text-stone-500 mt-2">
            Cuentas y movimientos (solo contador).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMovementError(null);
              setMovementForm((f) => ({
                ...f,
                accountId: f.accountId || accounts[0]?.id || "",
              }));
              setMovementOpen(true);
            }}
            className="flex items-center justify-center gap-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-5 py-3 rounded-xl font-semibold transition shrink-0"
          >
            <ArrowUpRight size={18} />
            Movimiento
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountError(null);
              setAccountOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#6F4E37] hover:bg-[#5B3F2D] text-white px-5 py-3 rounded-xl font-semibold transition shrink-0"
          >
            <Plus size={18} />
            Nueva cuenta
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
          <Loader2 size={26} className="animate-spin" />

          <p className="text-sm font-medium">Cargando cuentas…</p>
        </div>
      ) : loadError ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-red-600">{loadError}</p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              void load();
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] text-white text-sm font-semibold transition-colors"
          >
            <RotateCw size={16} />
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* SALDO TOTAL */}
          <div className="bg-[#6F4E37] rounded-2xl p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Saldo total</p>

                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {formatCurrency(totalBalance)}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Wallet size={21} />
              </div>
            </div>

            <p className="text-sm text-white/70 mt-5">
              Dinero disponible en todas las cuentas activas.
            </p>
          </div>

          {/* CUENTAS */}
          {accounts.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm py-14 text-center">
              <Landmark size={32} className="mx-auto text-stone-300" />

              <p className="mt-4 text-sm text-stone-500">
                No hay cuentas registradas. Crea la primera para empezar a
                llevar los movimientos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`bg-white border rounded-2xl p-5 sm:p-6 ${
                    account.isActive
                      ? "border-stone-200"
                      : "border-stone-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 truncate">
                        {account.name}
                      </p>

                      <p className="text-sm text-stone-500 mt-0.5 truncate">
                        {account.bank}
                        {account.accountNumber &&
                          ` · ${account.accountNumber}`}
                      </p>
                    </div>

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        account.balance >= 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      <Landmark size={18} />
                    </div>
                  </div>

                  <p
                    className={`text-2xl font-bold mt-4 ${
                      account.balance >= 0 ? "text-stone-900" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </p>

                  {!account.isActive && (
                    <p className="text-xs text-stone-400 mt-2">Inactiva</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* FILTRO POR CUENTA */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-4">
            <Select
              value={accountFilter}
              onChange={(value) => setAccountFilter(value)}
              aria-label="Filtrar por cuenta"
              options={[
                {
                  value: "",
                  label: "Todas las cuentas",
                  icon: SlidersHorizontal,
                },
                ...accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} · ${account.bank}`,
                  icon: Landmark,
                })),
              ]}
            />
          </div>

          {/* MOVIMIENTOS */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Movimientos</h2>
            </div>

            {movements.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">
                Sin movimientos registrados.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="px-6 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          movement.type === "ENTRADA"
                            ? "bg-emerald-50 text-emerald-600"
                            : movement.type === "SALIDA"
                              ? "bg-red-50 text-red-600"
                              : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {movement.type === "ENTRADA" ? (
                          <ArrowDownLeft size={18} />
                        ) : movement.type === "SALIDA" ? (
                          <ArrowUpRight size={18} />
                        ) : (
                          <Minus size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {movement.concept}
                        </p>

                        <p className="text-xs text-stone-400 mt-0.5">
                          {movement.account} · {MOVEMENT_LABELS[movement.type]}{" "}
                          · {formatDate(movement.date)}
                        </p>
                      </div>
                    </div>

                    <p
                      className={`text-sm font-bold whitespace-nowrap ${
                        movement.type === "ENTRADA"
                          ? "text-emerald-600"
                          : movement.type === "SALIDA"
                            ? "text-red-600"
                            : "text-stone-600"
                      }`}
                    >
                      {movement.type === "ENTRADA"
                        ? "+"
                        : movement.type === "SALIDA"
                          ? "−"
                          : ""}
                      {formatCurrency(Math.abs(movement.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ------------------------------------------------------
          MODAL: NUEVA CUENTA
      ------------------------------------------------------ */}
      {accountOpen && (
        <Modal
          icon={Landmark}
          title="Nueva cuenta"
          onClose={() => setAccountOpen(false)}
          onSubmit={(event) => void handleCreateAccount(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={savingAccount}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {savingAccount ? "Creando…" : "Crear cuenta"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {accountError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {accountError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Nombre *
              </label>

              <input
                type="text"
                required
                placeholder="Ej. Caja chica, Bancolombia ahorros…"
                value={accountForm.name}
                onChange={(event) =>
                  setAccountForm({ ...accountForm, name: event.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Banco / entidad *
              </label>

              <input
                type="text"
                required
                placeholder="Ej. Bancolombia, Nequi, Efectivo…"
                value={accountForm.bank}
                onChange={(event) =>
                  setAccountForm({ ...accountForm, bank: event.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Número de cuenta
              </label>

              <input
                type="text"
                placeholder="Opcional…"
                value={accountForm.accountNumber}
                onChange={(event) =>
                  setAccountForm({
                    ...accountForm,
                    accountNumber: event.target.value,
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------
          MODAL: NUEVO MOVIMIENTO
      ------------------------------------------------------ */}
      {movementOpen && (
        <Modal
          icon={ArrowDownLeft}
          title="Nuevo movimiento"
          subtitle="El saldo de la cuenta se actualiza al guardar."
          onClose={() => setMovementOpen(false)}
          onSubmit={(event) => void handleCreateMovement(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMovementOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={savingMovement}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {savingMovement ? "Guardando…" : "Registrar"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {movementError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {movementError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Cuenta *
              </label>

              <Select
                value={movementForm.accountId}
                onChange={(value) =>
                  setMovementForm({
                    ...movementForm,
                    accountId: value,
                  })
                }
                placeholder="Seleccionar cuenta…"
                aria-label="Cuenta"
                options={accounts
                  .filter((a) => a.isActive)
                  .map((account) => ({
                    value: account.id,
                    label: `${account.name} · ${account.bank} (saldo ${formatCurrency(
                      account.balance
                    )})`,
                    icon: Landmark,
                  }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Tipo *
                </label>

                <Select
                  value={movementForm.type}
                  onChange={(value) =>
                    setMovementForm({
                      ...movementForm,
                      type: value as BankMovementType,
                    })
                  }
                  aria-label="Tipo de movimiento"
                  options={[
                    {
                      value: "ENTRADA",
                      label: "Entrada",
                      icon: ArrowDownLeft,
                    },
                    { value: "SALIDA", label: "Salida", icon: ArrowUpRight },
                    { value: "AJUSTE", label: "Ajuste (puede ser negativo)", icon: Minus },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Monto *
                </label>

                <input
                  type="number"
                  required
                  step="any"
                  placeholder="50000"
                  value={movementForm.amount}
                  onChange={(event) =>
                    setMovementForm({
                      ...movementForm,
                      amount: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Concepto *
              </label>

              <input
                type="text"
                required
                placeholder="Ej. Abono factura F-000002"
                value={movementForm.concept}
                onChange={(event) =>
                  setMovementForm({
                    ...movementForm,
                    concept: event.target.value,
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
