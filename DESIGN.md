---
name: Gold Integrate Shirt Requisition Design System
description: A restrained product UI system for uniform requisition forms, stock configuration, and fulfillment dashboards.
colors:
  primary: "#4f68a8"
  primary-hover: "#3d5399"
  primary-active: "#2f407a"
  primary-ink: "#1a2847"
  accent: "#e86d3f"
  accent-hover: "#da5a2a"
  neutral-bg: "#f9fafb"
  neutral-panel: "#f3f4f6"
  neutral-surface: "#ffffff"
  neutral-border: "#e5e7eb"
  neutral-border-strong: "#cbd5e1"
  neutral-text: "#1f2937"
  neutral-muted: "#4b5563"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
  info: "#3b82f6"
typography:
  display:
    fontFamily: "Noto Sans Thai, Segoe UI, Leelawadee UI, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Noto Sans Thai, Segoe UI, Leelawadee UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Noto Sans Thai, Segoe UI, Leelawadee UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Noto Sans Thai, Segoe UI, Leelawadee UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans Thai, Segoe UI, Leelawadee UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    borderColor: "{colors.neutral-border-strong}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Gold Integrate Shirt Requisition

## 1. Overview

**Creative North Star: "The Structured Blueprint"**

This interface is an internal operations product for submitting and managing uniform requisitions. The design system should make repeated data entry, stock review, and shipment tracking feel controlled and low-friction. It favors structured grids, flat surfaces, clear table anatomy, and restrained corporate color over decorative brand expression.

**Key Characteristics:**
- Product-first layout with familiar form, table, tab, dialog, and dashboard patterns.
- Restrained corporate indigo palette with warm ember reserved for warnings and high-attention states.
- High-contrast Thai and English text using one durable sans-serif stack.
- Mobile-safe controls with stable touch targets and no horizontal overflow.
- Flat-by-default surfaces, using borders and tonal layers before shadows.

## 2. Colors

The palette is restrained and operational. Primary indigo carries navigation, selected states, and main actions. Warm ember is reserved for warnings, backorders, and exceptional attention.

### Primary
- **Corporate Indigo** (#4f68a8): Primary actions, focused controls, selected states, and brand anchors.
- **Corporate Indigo Hover** (#3d5399): Hover state for primary actions.
- **Corporate Indigo Active** (#2f407a): Pressed or active state.
- **Primary Ink** (#1a2847): High-emphasis headings and dark brand text when black is too harsh.

### Accent
- **Warm Ember** (#e86d3f): Backorder, warning, and high-importance operational cues.
- **Warm Ember Hover** (#da5a2a): Hover state for warning actions only.

### Neutrals
- **Ice Background** (#f9fafb): Main application canvas.
- **Panel Gray** (#f3f4f6): Secondary panels, table heads, muted blocks, and empty-state backgrounds.
- **Pure White** (#ffffff): Cards, dialogs, form fields, and primary table surfaces.
- **Border Gray** (#e5e7eb): Default structural dividers.
- **Strong Border** (#cbd5e1): Form controls and dense table boundaries.
- **Slate Ink** (#1f2937): Default readable text.
- **Muted Slate** (#4b5563): Secondary text that still needs accessible contrast.

### Semantic States
- **Success** (#10b981): Delivered, saved, completed.
- **Warning** (#f59e0b): Pending, needs review, backorder-adjacent cues.
- **Error** (#ef4444): Validation errors, destructive actions, failed sync.
- **Info** (#3b82f6): Informational highlights and neutral progress cues.

### Named Rules
**The 10% Accent Rule.** Warm ember must remain below roughly 10% of any screen. It is for operational exceptions, not decoration.

**Contrast Before Subtlety.** Placeholder, helper, table, and badge text must remain readable. Do not use pale gray text on near-white panels.

## 3. Typography

**Font Family:** "Noto Sans Thai", "Segoe UI", "Leelawadee UI", system-ui, sans-serif.

The product uses one family across headings, form labels, table cells, buttons, and badges. Weight and spacing create hierarchy. Avoid display-font behavior in dense UI labels.

### Hierarchy
- **Display** (700, 32px, 1.2): Page-level titles only.
- **Headline** (700, 24px, 1.3): Major dashboard and form section headings.
- **Title** (700, 20px, 1.5): Card titles, dialogs, major group labels.
- **Body** (500, 14px, 1.6): Default UI copy, table cells, summaries.
- **Label** (700, 12px, 1.5): Field labels, metadata, small badges, table headers.

### Rules
- Use fixed product UI sizes, not fluid display clamps.
- Keep letter spacing at 0 for Thai readability.
- Use weight sparingly: bold for labels and important values, not every line.
- Cap long explanatory copy at 65-75ch, while tables may use wider layouts when data requires it.

## 4. Layout

The layout is structured around a 4px spacing scale and predictable content regions.

### Application Shell
- Sticky or top headers should stay compact and functional.
- Main content width should be constrained for forms and broader for dashboard tables.
- Dashboard views can be dense, but sections need clear grouping and scan paths.

### Forms
- Group branch, supervisor, employee, clothing, and notes data into logical blocks.
- Required fields need visible labels and clear error states.
- Inline editing should preserve row height and avoid layout jumps.

### Tables and Lists
- Tables need stable column widths for employee, type, size, quantity, and status data.
- Mobile views can convert dense tables into compact rows or cards, but must preserve the same data hierarchy.
- Totals and exceptions should be visually easier to find than supporting detail.

## 5. Elevation

The system is flat by default. Depth is created with borders, background layers, and spacing. Shadows are for overlays, dropdowns, toasts, and focused interactive surfaces.

### Shadow Vocabulary
- **Resting Surface:** 1px border, no visible shadow or only a very soft shadow.
- **Interactive Focus:** `0 2px 8px rgba(0, 0, 0, 0.08)`.
- **Overlay:** `0 12px 24px rgba(0, 0, 0, 0.15)`.

### Rules
- Do not use heavy card shadows across the main page.
- Do not use colored side-stripe borders on cards or table rows.
- Avoid nested cards; use dividers, section headers, table grouping, or tonal panels instead.

## 6. Components

### Buttons
- **Primary:** Corporate Indigo background, white text, 8px radius, 8px 16px padding.
- **Secondary:** White or neutral panel background, Slate Ink text, Border Gray border.
- **Danger:** Error tint or solid error color depending on severity.
- **Icon Buttons:** Use lucide icons where available. Maintain consistent stroke weight, size, and alignment.
- All buttons require default, hover, focus-visible, active, disabled, and loading states.

### Inputs and Selects
- White or very light neutral surface, 1px Strong Border, 8px radius.
- Minimum mobile touch height should stay around 44px, except compact table controls where density is intentional.
- Focus uses Corporate Indigo border and a subtle focus ring.
- Error state uses Error border plus clear message text.

### Cards and Sections
- Cards are for meaningful repeated items, dialogs, compact metrics, or framed tools.
- Form sections should feel like structured panels, not decorative floating cards.
- Card padding follows 12px, 16px, 24px depending on density.

### Badges and Status
- Use consistent text for pending, delivered, and backorder states.
- Status must not rely on color alone; include readable labels and, where useful, small icons or dots.
- Ready stock and out-of-stock states should be scannable in size and clothing tables.

### Dialogs and Toasts
- Dialogs use overlay shadow, clear title, one primary action, and one secondary cancellation path.
- Toasts should be concise and support success, loading, and error states.
- Avoid modals when an inline or progressive edit pattern works better.

## 7. Motion

Motion is functional and brief.

- Standard transitions should run 150-250ms.
- Use motion for state feedback, dropdown/dialog entry, save confirmation, and validation feedback.
- Avoid orchestrated page-load animation.
- Respect `prefers-reduced-motion: reduce`.

## 8. Do's and Don'ts

### Do:
- Use the 4px spacing scale consistently.
- Keep data entry controls predictable and familiar.
- Preserve high contrast for all operational text.
- Make mobile collapse structural, not just squeezed desktop layout.
- Keep dashboard density balanced with clear grouping and status hierarchy.

### Don't:
- Don't use gradient text, decorative glass panels, or thick side accents.
- Don't turn table-driven workflows into decorative card grids.
- Don't use heavy color on inactive states.
- Don't introduce playful icons or emoji as core UI language.
- Don't let controls stretch, wrap badly, or overflow on mobile.
