import { redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { canManageAdministratorAccounts, canManageOperationalUsers, ROLE_LABELS } from "@/lib/permissions-users";
import {
  createUserAction,
  deactivateUserAction,
  listCompanies,
  listManagedUsers,
  updateUserAction,
} from "./actions";

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session || !canManageOperationalUsers(session.role)) redirect("/app");

  const [users, companies] = await Promise.all([listManagedUsers(), listCompanies()]);
  const assignableRoles = Object.entries(ROLE_LABELS).filter(([role]) => {
    if (role === "ADMINISTRADOR") return canManageAdministratorAccounts(session.role);
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Usuarios"
        description={
          session.role === "CEO"
            ? "CEO administra usuarios operativos. Las cuentas Administrador no se listan."
            : "Administrador gestiona todas las cuentas, incluidas otras cuentas Administrador."
        }
      />

      <Card className="p-5">
      <form action={createUserAction} className="grid gap-3 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold">Nuevo usuario</h2>
        <input name="username" required placeholder="Usuario" className="rounded-md border border-border px-3 py-2 text-sm" />
        <input name="displayName" required placeholder="Nombre visible" className="rounded border px-3 py-2 text-sm" />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Contraseña inicial"
          className="rounded border px-3 py-2 text-sm"
        />
        <select name="role" required className="rounded border px-3 py-2 text-sm">
          {assignableRoles.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select name="homeCompanyCode" className="rounded border px-3 py-2 text-sm">
          <option value="">— Empresa home (roles de una empresa) —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.code}>{c.displayName}</option>
          ))}
        </select>
        <input
          name="maxDiscountPercent"
          type="number"
          min={0}
          max={100}
          placeholder="% descuento máx. (Ventas)"
          className="rounded border px-3 py-2 text-sm"
        />
        <button type="submit" className={`${buttonVariants({ variant: "primary", size: "sm" })} sm:col-span-2 sm:w-fit`}>
          Crear usuario
        </button>
      </form>
      </Card>

      <Card className="divide-y">
        {users.map((u) => (
          <li key={u.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{u.displayName}</span>
                <span className="ml-2 text-sm text-slate-500">@{u.username}</span>
                {!u.active && <StatusBadge status="CANCELADA" className="ml-2" />}
              </div>
              <span className="text-sm text-slate-600">{ROLE_LABELS[u.role]}</span>
            </div>
            {u.role === "VENTAS_SYSTRON" && (
              <form action={updateUserAction} className="flex flex-wrap items-end gap-2 text-sm">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="displayName" value={u.displayName} />
                <label className="flex flex-col gap-1">
                  % descuento máx.
                  <input
                    name="maxDiscountPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={u.maxDiscountPercent ?? ""}
                    className="w-24 rounded border px-2 py-1"
                  />
                </label>
                <button type="submit" className="rounded border px-2 py-1">Guardar límite</button>
              </form>
            )}
            {u.active && u.username.toLowerCase() !== "vectoria" && (
              <form action={deactivateUserAction}>
                <input type="hidden" name="id" value={u.id} />
                <button type="submit" className="text-sm text-red-700 underline-offset-2 hover:underline">
                  Desactivar
                </button>
              </form>
            )}
          </li>
        ))}
      </Card>
    </div>
  );
}
