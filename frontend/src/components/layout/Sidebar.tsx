"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  AlertTriangle,
  MessageSquare,
  Megaphone,
  BarChart3,
  Lightbulb,
  Coffee,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/churn", label: "Churn Risk", icon: AlertTriangle },
  { href: "/chat", label: "AI Segment", icon: MessageSquare },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/insights", label: "Analytics & Insights", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-border flex flex-col z-10">
      {/* Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">GrowthMind AI</p>
            <p className="text-xs text-muted-foreground">Brew & Grow CRM</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          AI Growth Agent v1.0
        </p>
      </div>
    </aside>
  );
}
