# Aile Bütçesi (Family Budget)

A comprehensive family budget tracking mobile application built with Expo React Native.

## Overview

A dark-themed, modern budgeting app (Turkish/English) that helps families:
- Track income and expenses with full TR/EN bilingual support, multi-currency (TRY/USD/EUR/GBP) — each item displays in its original currency (dolar=$, euro=€ etc.); budget summary shows per-currency breakdowns; only "Kalan" (remaining) converts to TRY
- Manage monthly budgets with credit cards and loan tracking; exchange rates from Yahoo Finance available for TRY conversion when needed
- Analyze spending habits with AI-powered insights
- Authentication with family account sharing, forgot password flow (email verification → new password → success), language toggle on login screen
- Transaction edit mode: edit existing expenses/incomes from transaction detail screen, recurring day validation (1–31 monthly, 0–6 weekly)
- Family member expense attribution: dynamic member picker with custom member names (no hardcoded "Eşim"); users can add custom family members on-the-fly in expense/income forms; per-member spending breakdown in home screen "Kim Ne Harcadı?" widget shows actual names from expenses; AI insights include member comparison; PDF reports include member breakdown; spouse name setting removed from settings (members managed inline during entry)
- Shared family budget: all income/expenses/cards/loans synced to server per familyCode; all family members see the same data in real-time (15s polling); visibility toggle ("shared"/"private") per transaction; creatorId/creatorName tracking on every item
- Receipt scanning with Tesseract.js OCR (on-device visual recognition, no AI), Corporate/business expense mode (multi-workspace support)
- Savings goal tracking with detailed analytics (progress %, savings rate, daily target, month-end projection), financial health scoring
- Smart projected end date: separates fixed/recurring expenses (rent, bills) from variable spending — fixed expenses treated as lump-sum obligations, variable spending averaged daily for accurate runway prediction
- Multi-workspace İş Yerim: add/switch/remove workspaces per profession, "Diğer" custom name, workspace-scoped data; Özet tab shows "Tahmini Vergi Sonrası Net" (estimated net after KDV taxes); business credit card spending on linked family cards always reflected on family card balance
- Free-form custom KDV tax rate entry (both estimated and manual Vergi tabs)
- One-tap email report: expo-mail-composer with PDF attachment, pre-fills user email
- Investment portfolio (Altın/Gümüş/Dolar/Euro) with live market prices from Yahoo Finance
- Sub-subcategory (brand) picker: Abonelikler → Netflix/Spotify/Disney+/iCloud/ChatGPT Plus etc. (35+ services), Süpermarket → A101/Migros etc.
- Expense categories: Faturalar > Abonelikler (consolidated, no TV/Streaming duplication)
- Çocuk/Bebek gider kategorisi (Bez, Mama, Okul Taksiti, vb.)
- Installment: preset (2×, 3×, 6×, 9×, 12×) + manuel giriş
- Kredi takibi: toplam taksit + ödenen taksit girişi, kalan borç otomatik hesaplama, "Ödedim" ile gider kaydı (loanId ile bağlantılı), taksit gideri silinince kredi durumu geri alınır
- Tutar girişlerinde Türk formatı: 10.000, 100.000 şeklinde noktalı gösterim (tüm formlarda)
- Profile photo: camera or gallery, stored as URI in AsyncStorage via AuthContext
- PDF Reports: daily/weekly/monthly/6-month/yearly, HTML → PDF via expo-print + expo-sharing
- Daily Notifications: expo-notifications, permission request, motivational messages (30+ TR/EN); configurable time (default 11:00) + payment reminders for recurring items/loans/credit cards (next 3 months); lib/notifications.ts
- Hedef Birikimim (Savings Goals): SavingsGoalsContext, CRUD, progress tracking, smart tips
- Voice Assistant: app/voice-assistant.tsx — expo-audio recording (migrated from deprecated expo-av) → /api/voice/financial-chat → Whisper (gpt-4o-mini-transcribe) + GPT-4o-mini → Google Translate TTS (female) / expo-speech pitch:0.62 (male); intents: add_expense, add_income, add_recurring_*, delete_last_expense, delete_last_income, add_savings_goal, set_budget_goal, navigate_to, query; lib/voiceSettings.ts; lib/audio.ts (compatibility wrapper for expo-audio API)
- Floating Voice FAB: components/VoiceCommandFAB.tsx — same voice engine as voice-assistant; all 10 intents supported; draggable FAB on all screens via app/_layout.tsx (PanResponder + edge snapping); toggle via @budget_fab_enabled AsyncStorage key + DeviceEventEmitter
- Investment portfolio: per-holding daily price change indicator (↑ green / ↓ red with % change) based on market price history from Yahoo Finance API
- Payment reminders: fixed 8 AM morning delivery for same-day reminders ("Bugün ödemen var", "Bugün maaşın yatması bekleniyor"); motivational notification at user-configured time (default 11:00)
- Server: 50mb JSON body limit for audio uploads

## Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with Expo Router (file-based routing)
- **State Management**: React Context + AsyncStorage (all data is local)
- **Language**: TypeScript
- **Font**: Inter (loaded via @expo-google-fonts/inter)
- **Theme**: Dark mode — black/dark gray with green (#00C97A) accent

### Backend (Express)
- Express server serving the landing page, Expo manifest, and family/budget APIs
- Server-side family management: `server/familyStore.ts` stores family memberships in `.data/families.json`
- Server-side budget sync: `server/budgetStore.ts` stores all budget data (incomes, expenses, credit cards, loans, savings goal) per familyCode in `.data/budgets.json`
- Budget API endpoints: GET/POST/PUT/DELETE for budget items, sync, savings goal
- Family members share the same budget data — changes from one device appear on all family members' screens via 15s polling
- Local AsyncStorage used as cache; server is source of truth when familyCode is set

## Authentication
- `context/AuthContext.tsx` — Local AsyncStorage auth: login (email OR username), register, joinFamily, logout, updateProfile (with familyMemberCount)
- `app/login.tsx` — Login + signup screen with: username field, family size selector (1-6), "Beni Hatırla" (remember me) checkbox (default ON), bilingual TR/EN
- Route guard in `app/_layout.tsx` using AuthGuard component + Expo Router
- Family code: 6-char alphanumeric, admin shares with family members to join
- `app/family.tsx` — Family screen: member list shows @username, admin can set expected family size (1-8), join by code with self-join protection
- All premium features are unlocked (no paywalls)
- User model: id, name, username, email, familyCode, familyName, familyMemberCount, role, avatarColor, photoUri

## Key Files

### Data Layer
- `context/BusinessContext.tsx` — Multi-workspace İş Yerim state, workspace CRUD, workspace-scoped expenses/incomes
- `context/BudgetContext.tsx` — All app state, business logic, AsyncStorage persistence
- `context/LanguageContext.tsx` — TR/EN language switching with i18n
- `context/AuthContext.tsx` — Auth state management
- `lib/i18n.ts` — Full TR/EN translations
- `lib/currency.ts` — Multi-currency types (CurrencyCode: TRY/USD/EUR/GBP), symbols, formatters (fmtCurrency)
- `lib/categories.ts` — Category/subcategory TR→EN translation functions
- `components/CurrencyPicker.tsx` — Reusable pill-style currency selector
- Exported types: `Income`, `Expense`, `CreditCard`, `Loan`, `PaymentMethod`, `CurrencyCode`
- Exported constants: `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`, `CATEGORY_GROUPS`, `TURKISH_BANKS`, `INTERNATIONAL_BANKS`, `CARD_COLORS`

### Screens
- `app/(tabs)/index.tsx` — Home: budget summary, quick actions, upcoming payments, loans, recent transactions
- `app/(tabs)/transactions.tsx` — All transactions with filter (all/income/expense), swipe-left-to-delete + long-press delete, dynamic member badges
- `app/(tabs)/analytics.tsx` — Reports: health score, SVG donut chart (spending distribution), SVG bar chart (income vs expense), financial ratio gauges (savings rate, expense ratio, debt burden, credit utilization), fixed vs variable expense analysis, year-end forecast (per-currency breakdowns — recurring + average-based projections, net color via TRY-converted totals), daily spending chart, category grouping, per-card spending, computed insights (no AI — pure analytical), savings goal card, loan display with original currency
- `app/recurring.tsx` — Recurring items management: list all recurring incomes/expenses, swipe-to-delete, long-press delete, edit via navigation, filter (all/income/expense), summary cards, "+" add button (pre-enables recurring mode), end date badges
- `app/(tabs)/settings.tsx` — User profile card, language switcher, family section, all features open, savings goal
- `app/add-income.tsx` — Add/edit income sheet modal (localized category chips); edit mode via `editId` param pre-fills form, shows "Geliri Düzenle" title, "Güncelle" button
- `app/add-expense.tsx` — Add/edit expense + credit card + installment (localized categories); edit mode via `editId` param pre-fills form, shows "Gideri Düzenle" title, "Güncelle" button; recurring section wrapped in highlighted card for visibility
- `app/manage-cards.tsx` — Add/edit/delete credit cards; bank picker shows TURKISH_BANKS (TR) or INTERNATIONAL_BANKS (EN) with "Diğer"/"Other" custom input; payment plan: Full, Min 20%, Percentage (new), Custom — with confirmation dialogs
- `app/add-loan.tsx` — Add loan with bank picker (TURKISH_BANKS or INTERNATIONAL_BANKS based on language + "Diğer"/"Other" custom input), monthly payment, remaining amount
- `app/transaction-detail.tsx` — Transaction detail sheet modal with "Düzenle" edit button that navigates to edit form
- `app/login.tsx` — Login/register screen
- `app/family.tsx` — Family account: share code, join family, member list
- `app/receipt-scan.tsx` — Mock AI receipt scanning with animated scan line
- `app/corporate.tsx` — Corporate/business expense tracking by sector

### Components
- `components/AdBanner.tsx` — Subtle top/bottom ad banner placeholder
- `components/KeyboardAwareScrollViewCompat.tsx` — Cross-platform keyboard-aware scroll view

### Navigation
- 4-tab layout: Ana Sayfa, İşlemler, Raporlar, Ayarlar
- NativeTabs (iOS 26+ liquid glass) + ClassicTabs fallback (Android/web/older iOS)
- Auth gate: unauthenticated users redirected to /login via AuthGuard

## Dependencies
- expo-clipboard: for copying family code to clipboard
- @tanstack/react-query: server state (used minimally since app is local-first)
- react-native-keyboard-controller: keyboard handling
- react-native-gesture-handler: gesture support
- expo-haptics: tactile feedback throughout app

## Category Localization
- Internal storage: always uses Turkish category keys (e.g., "Market & Gıda")
- Display: `localizeCategory()`, `localizeSubcategory()`, `localizeIncomeCategory()` from `lib/categories.ts`
- Switching language immediately updates all category/subcategory chip labels

## Build & Deployment
- `scripts/server-build.js`: Server build script using esbuild with ESM format + `createRequire` banner for Node.js v22 CJS compatibility
- Deployment build: `npm run expo:static:build && node scripts/server-build.js`
- Production run: `npm run server:prod` (runs `node server_dist/index.js`)

## Workflows
- `Start Backend`: runs `npm run server:dev` on port 5000
- `Start Frontend`: runs Expo dev server on port 8081 (web preview)
