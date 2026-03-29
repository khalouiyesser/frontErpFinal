# KyPro ERP — Frontend

## Stack
- **Vite 5** (remplace CRA)
- **React 18** + TypeScript
- **TailwindCSS 3** (design system unifié)
- **react-i18next** (FR 🇫🇷 / EN 🇬🇧 / AR 🇹🇳 avec RTL auto)
- **@tanstack/react-query** v5
- **recharts** pour les graphiques

## Démarrage rapide
```bash
cp .env.example .env
npm install
npm run dev
```

## Scripts
| Commande | Description |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Build production |
| `npm run preview` | Preview du build |

## Structure
```
src/
├── api/          # Tous les appels API typés
├── components/
│   ├── layout/   # Sidebar + Layout
│   └── ui/       # Design system (Button, Input, Modal, DataTable…)
├── context/      # Auth, Theme
├── hooks/        # Custom hooks
├── i18n/         # Traductions FR/EN/AR
├── pages/        # Toutes les pages
└── utils/        # formatTND, formatDate, cn…
```

## Changements vs version CRA
- CRA → **Vite 5** (x10 plus rapide)  
- `useI18n()` → `useTranslation()` (react-i18next standard)
- Design system CSS unifié (`.card`, `.btn-*`, `.input`, `.badge-*`)
- AccountingPage enrichie (3 onglets + graphiques + export)
- AdminDashboard complet (stats + paiements + suspension)
- Sidebar responsive avec drawer mobile
