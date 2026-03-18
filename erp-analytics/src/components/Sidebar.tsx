"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
  CreditCard,
  FileText,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/ventas", label: "Ventas", icon: TrendingUp },
  { href: "/dashboard/compras", label: "Compras", icon: ShoppingCart },
  { href: "/dashboard/cobranzas", label: "Cobrado", icon: Wallet },
  { href: "/dashboard/pagos", label: "Pagado", icon: CreditCard },
  { href: "/dashboard/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/dashboard/comprobantes", label: "Comprobantes", icon: FileText },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 border-r border-slate-700`}
    >
      <div className="p-4 flex items-center gap-3 border-b border-slate-700">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-lg leading-tight">ERP Analytics</h1>
            <p className="text-xs text-slate-400 truncate">Comprobantes</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">
              {user.apellidoNombre}
            </p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-1"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && "Cerrar Sesión"}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
