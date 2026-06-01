---
name: Gold Integrate Shirt Requisition Design System
description: A clean, corporate design system built around structured grids, professional color tones, and high-usability forms.
colors:
  primary: "#4f68a8"
  primary-hover: "#3d5399"
  primary-active: "#2f407a"
  accent: "#e86d3f"
  accent-hover: "#da5a2a"
  neutral-bg: "#f9fafb"
  neutral-surface: "#ffffff"
  neutral-border: "#e5e7eb"
  neutral-text: "#1f2937"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
typography:
  display:
    fontFamily: "Noto Sans Thai, Segoe UI, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Noto Sans Thai, Segoe UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Noto Sans Thai, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Noto Sans Thai, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans Thai, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
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
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Gold Integrate Shirt Requisition

## 1. Overview

**Creative North Star: "The Structured Blueprint"**

The Gold Integrate Shirt Requisition design system is centered around structured grids, professional color tones, and high-usability input forms. It utilizes clean lines, consistent borders, and semantic grouping to create a highly readable, low cognitive load experience. Spacing is strictly based on a 4px increment scale, and components employ a refined, restrained aesthetic. This system explicitly rejects unnecessary visual noise such as text gradients, side-stripe card borders, or floating elements with heavy shadows.

**Key Characteristics:**
- Strict geometric visual alignment.
- Muted professional blue-gray base with high contrast text.
- High usability touch targets and compact tables optimized for mobile.

## 2. Colors

The palette is built around professional corporate blues and a warm ember accent for strategic alerts and actions.

### Primary
- **Corporate Indigo** (#4f68a8): Used for headers, primary actions, and brand indicators.
- **Corporate Indigo Hover** (#3d5399): Hover states for primary actions.
- **Corporate Indigo Active** (#2f407a): Active states for primary actions.

### Accent
- **Warm Ember** (#e86d3f): Used for high-importance alerts, backorder warnings, and notifications.
- **Warm Ember Hover** (#da5a2a): Hover states for accent elements.

### Neutral
- **Slate Ink** (#1f2937): Used for default body copy and high contrast headers.
- **Ice Background** (#f9fafb): Used as default background color for the application canvas.
- **Border Gray** (#e5e7eb): Used for grids, layout dividers, and component borders.
- **Pure White** (#ffffff): Used for card surfaces, input fields, and panels.

### Named Rules
**The 10% Accent Rule.** The primary accent color (Warm Ember) is reserved strictly for warning flags, high-importance callouts, and errors. It must cover no more than 10% of any screen layout.

## 3. Typography

**Display Font:** "Noto Sans Thai", "Segoe UI", system-ui, sans-serif
**Body Font:** "Noto Sans Thai", "Segoe UI", system-ui, sans-serif

**Character:** Highly readable geometric type pairing optimized for mixed English and Thai alphabets.

### Hierarchy
- **Display** (700, 32px, 1.2): Used for page-level header titles.
- **Headline** (700, 24px, 1.3): Used for main card or section headings.
- **Title** (700, 20px, 1.5): Used for secondary card/tab headers.
- **Body** (400, 14px, 1.6): Used for tables, checklists, and paragraph copy. Line length capped at 75ch.
- **Label** (500, 12px, 1.5): Used for text inputs, badges, and metadata details.

## 4. Elevation

The system uses a flat-by-default structural layering style. Depth is defined by borders and background tonal shifts rather than shadows. Ambient shadows are reserved exclusively for interactive elements in hover states and modal overlays.

### Shadow Vocabulary
- **Interactive Focus** (`0 2px 8px 0 rgba(0, 0, 0, 0.08)`): Used for card highlights and dropdown options on focus.
- **Overlay Shadows** (`0 12px 24px 0 rgba(0, 0, 0, 0.15)`): Used for modal screens and mobile bottom sheets.

### Named Rules
**The Flat-By-Default Rule.** Components, tables, and cards remain flat at rest. Depth is established through subtle 1px border lines (#e5e7eb) and light gray backgrounds (#f3f4f6).

## 5. Components

### Buttons
- **Shape:** Rounded corners with a 6px radius.
- **Primary:** Corporate Indigo background (#4f68a8), white text (#ffffff), padding `8px 16px`.
- **Hover / Focus:** Transitions smoothly to Corporate Indigo Hover (#3d5399) over 150ms.

### Cards / Containers
- **Corner Style:** Rounded corners with a 12px radius.
- **Background:** Pure White (#ffffff).
- **Shadow Strategy:** Flat at rest, with a subtle border outline. Overlay shadows on active interaction.
- **Border:** 1px border (#e5e7eb).
- **Internal Padding:** Spacing scale md (12px) to lg (16px).

### Inputs / Fields
- **Style:** Pure White background, 1px border (#cbd5e1), 6px radius.
- **Focus:** Highlighted with a Corporate Indigo border and subtle focus outline.
- **Error / Disabled:** Error state uses an Amber/Red border (#ef4444) and light red background. Disabled state has 50% opacity and `not-allowed` cursor.

## 6. Do's and Don'ts

### Do:
- **Do** use strict 4px spacing increments for layout gaps.
- **Do** maintain a high contrast ratio (at least 4.5:1) for all body text.
- **Do** use standard 44px height limits for mobile-friendly input controls (excluding checkboxes).

### Don't:
- **Don't** use decorative gradient text or glassmorphic blur layers.
- **Don't** use thick side-stripe borders as color highlights.
- **Don't** allow checkboxes or radio inputs to stretch vertically on mobile viewports.
