import React from "react";
import { cn } from "../lib/utils";

export function Alert({ variant = "info", children, icon: Icon, dismissible = false, onDismiss }) {
  const variantClasses = {
    info: "bg-info/10 text-info border border-info/20",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/10 text-warning border border-warning/20",
    error: "bg-error/10 text-error border border-error/20"
  };

  return (
    <div className={cn("alert rounded-lg px-4 py-3 flex gap-3 items-start", variantClasses[variant])} role="alert">
      {Icon && <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />}
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-current opacity-50 hover:opacity-100 transition"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function Badge({ variant = "primary", children, icon: Icon }) {
  const variantClasses = {
    primary: "badge-primary",
    accent: "badge-accent",
    success: "badge-success",
    error: "badge-error",
    warning: "badge-warning",
    neutral: "badge-neutral"
  };

  return (
    <span className={cn("badge", variantClasses[variant])}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

export function Pill({ children, variant = "neutral", icon: Icon }) {
  const variantClasses = {
    primary: "bg-primary-100 text-primary-700 border-primary-200",
    accent: "bg-accent-100 text-accent-700 border-accent-200",
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    success: "bg-success/10 text-success border-success/20"
  };

  return (
    <span className={cn("pill", variantClasses[variant])}>
      {Icon && <Icon className="w-4 h-4 mr-1.5" />}
      {children}
    </span>
  );
}