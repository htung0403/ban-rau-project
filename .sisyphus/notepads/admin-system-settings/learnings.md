# Codebase Patterns: Admin System Settings Feature

## 1. Query Hooks Pattern (`usePriceSettings.ts`)

**Location**: `client/src/hooks/queries/usePriceSettings.ts`

### Key Patterns:
- **Query Key Factory**: Object with `all` and `detail(key)` factory methods
  ```ts
  export const generalSettingsKeys = {
    all: ['general-settings'] as const,
    detail: (key: string) => [...generalSettingsKeys.all, key] as const,
  };
  ```
- **useQuery** for reads: `useQuery({ queryKey, queryFn })` calling `settingsApi.method()`
- **useMutation** for writes: Includes `queryClient.invalidateQueries({...})` in `onSuccess` and `toast.success/error` for notifications
- **Quiet flag pattern**: `useUpsertGeneralSetting` accepts `{ key, value, description, quiet? }` - when `quiet=true`, toast is suppressed
- **Dual invalidation**: On general setting update, invalidates both `generalSettingsKeys.all` and `generalSettingsKeys.detail(variables.key)`
- All hooks are exported as named functions (not default)

### Hook Signatures:
- `usePriceSettings()` → `UseQueryResult<PriceSetting[]>`
- `useUpdatePriceSetting()` → `UseMutationResult` with `{ key, value, description }`
- `useRoleSalaries()` → `UseQueryResult<RoleSalary[]>`
- `useUpsertRoleSalary()` → `UseMutationResult` with `{ role_key, role_name, daily_wage, description }`
- `useDeleteRoleSalary()` → `UseMutationResult` with `(key: string)`
- `useGeneralSettings()` → `UseQueryResult<any[]>`
- `useGeneralSetting(key: string)` → `UseQueryResult<any>`
- `useUpsertGeneralSetting()` → `UseMutationResult` with `{ key, value, description, quiet? }`

### Imports pattern:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settingsApi';
import toast from 'react-hot-toast';
```

---

## 2. Settings API Pattern (`settingsApi.ts`)

**Location**: `client/src/api/settingsApi.ts`

### Key Patterns:
- **Singleton object** pattern `export const settingsApi = { ... }` (not class)
- Uses `axiosClient` from `./axiosClient` (base URL auto-configured)
- Axios response unwrapped: `const { data } = await axiosClient.method<ResponseType>(url, payload)`
- Generic type params on axios calls: `axiosClient.get<PriceSetting[]>('/settings/prices')`
- REST conventions: GET for list/detail, PUT for update, POST for upsert, DELETE for remove
- URL pattern: `/settings/prices`, `/settings/prices/:key`, `/settings/roles`, `/settings/roles/:key`, `/settings/general`, `/settings/general/:key`

### All API Methods:
```ts
settingsApi.getPrices()                          → GET  /settings/prices
settingsApi.updatePrice(key, { value, description }) → PUT  /settings/prices/:key
settingsApi.getRoleSalaries()                   → GET  /settings/roles
settingsApi.upsertRoleSalary(payload)           → POST /settings/roles
settingsApi.deleteRoleSalary(key)               → DELETE /settings/roles/:key
settingsApi.getGeneralSettings()                → GET  /settings/general
settingsApi.getGeneralSettingByKey(key)         → GET  /settings/general/:key
settingsApi.upsertGeneralSetting(key, payload)  → PUT  /settings/general/:key
```

### Import pattern:
```ts
import axiosClient from './axiosClient';
import type { PriceSetting, RoleSalary } from '../types';
```

---

## 3. ZaloConfig Component Pattern (`ZaloConfig.tsx`)

**Location**: `client/src/components/shared/ZaloConfig.tsx`

### Key Patterns:
- **Self-contained state machine component**: States are `'idle' | 'generating' | 'waiting' | 'success' | 'failed'`
- Direct `axiosClient` calls (not React Query) for polling/QR operations
- **Card styling pattern**:
  ```
  bg-card rounded-2xl border border-border shadow-sm overflow-hidden
  ```
- **Section header inside card**:
  ```
  px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between
  ```
- **Status badge pattern**:
  ```
  text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20
  ```
- **ButtonText pattern**: `text-[13px] font-bold`
- **Section title pattern**: `text-[14px] font-bold text-foreground`
- **Loading state**: `<Loader2 size={32} className="text-primary animate-spin" />`
- Imports: `clsx` from `clsx`, icons from `lucide-react`

---

## 4. SalarySettingsPage Pattern (`SalarySettingsPage.tsx`)

**Location**: `client/src/pages/hr/SalarySettingsPage.tsx`

### Key Patterns:
- **Page wrapper**: `<div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">`
- **PageHeader** with `title`, `description`, `backPath`, `actions` prop
- **Desktop-mobile dual rendering**: `hidden md:block` for desktop, `md:hidden` for mobile
- **Content wrapper**: `md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm flex flex-col flex-1 min-h-0 md:overflow-hidden -mx-4 sm:mx-0`
- **Loading/Error states**: `<LoadingSkeleton>` and `<ErrorState onRetry={refetch} />`
- **Right-side panel dialog** using `createPortal` - slides in from right with backdrop
  - Backdrop: `bg-slate-900/40 backdrop-blur-sm`
  - Panel: `max-w-[500px] bg-background shadow-2xl`
  - Animation: CSS classes `animate-in slide-in-from-right` + `translate-x-full/0`
- **Form card sections inside panel**:
  ```
  bg-card rounded-2xl border border-border shadow-sm overflow-hidden
  → Section header: px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2
  → Section content: p-5 space-y-4
  ```
- **Input styling**: `w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium`
- **DraggableFAB** for mobile: Add button visible only on mobile (`md:hidden`)
- **Currency formatting**: `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)`
- All UI text is in Vietnamese

---

## 5. Module Data Registration (`moduleData.ts`)

**Location**: `client/src/data/moduleData.ts`

### Key Pattern:
- `Record<string, { section: string; items: ModuleCardWithPath[] }[]>`
- Each top-level path maps to sections, each section has items
- **ModuleCardWithPath extends ModuleCardProps** and adds `path?: string`
- Items have: `{ icon, title, description, colorScheme, path }`
- Icons are imported from `lucide-react`
- **colorScheme values**: 'teal', 'red', 'green', 'slate', 'orange', 'purple', 'blue', 'cyan', 'amber', 'emerald'
- **Settings icon convention**: `Settings2` icon, `colorScheme: 'slate'`

### To add a new module entry:
```ts
'/new-module': [
  {
    section: 'Section Name',
    items: [
      { icon: Settings2, title: 'Title', description: 'Desc', colorScheme: 'slate', path: '/new-module/page' },
    ]
  }
]
```

---

## 6. Route Registration Pattern (`App.tsx`)

**Location**: `client/src/App.tsx`

### Key Patterns:
- All routes nested under `<ProtectedRoute><MainLayout /></ProtectedRoute>`
- **Page imports** at top of file, grouped by module
- **Route pattern**: `<Route path="/module-slug/sub-page" element={<PageComponent />} />`
- **Module index**: `<Route path="/module-slug" element={<ModulePage />} />`
- Vietnamese slug paths: `/hanh-chinh-nhan-su`, `/cai-dat`, etc.
- URL path convention: kebab-case Vietnamese (e.g., `/cai-dat-luong`, `/phan-quyen`)
- QueryClient default config: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`

### To register a new route:
1. Import the page component at top
2. Add `<Route path="/path" element={<Component />} />` inside the protected route block

---

## 7. Route Permissions Pattern (`routePermissions.ts`)

**Location**: `client/src/utils/routePermissions.ts`

### Key Patterns:
- **Role-based access**: `admin | manager` → all routes allowed
- **Legacy role keys**: `ke_toan`, `staff`, `driver`, `customer`
- `isAllRoutesAllowed(role)` → checks if admin/manager
- `isDriverLikeRoleKey(role)` → fuzzy match for driver variants
- `buildAllowedRouteSet(role)` → returns `Set<string>` of allowed paths
- `canAccessRoute(path, role, allowedSet)` → boolean check
- `canAccessModuleRoute(moduleRootPath, moduleChildPaths, role, allowedSet)` → checks if any child is accessible

### Backend permission policies (`permission-policies.ts`):
- `PAGE_POLICIES` maps permission names to arrays of paths
- `requirePolicy()` middleware on server routes matches these
- **Permission naming**: `MODULE_ACTION` (e.g., `HR_SALARY_SETTINGS`, `GENERAL_SETTINGS_VIEW`)
- Multiple policies can be OR-combined: `requirePolicy('HR_SALARY_SETTINGS', 'PRODUCTS_SETTINGS')`

---

## 8. Type Definitions Pattern (`types/index.ts`)

**Location**: `client/src/types/index.ts`

### Key Patterns:
- Types mirror `server/database/schema.sql`
- **Interface naming**: PascalCase, singular
- **Type aliases**: For union types (`type Role = 'admin' | 'manager' | ...`)
- **Nested relations**: Optional fields like `profiles?: { full_name: string }`
- **Comment convention**: `// --- Section Name ---`

### Relevant existing types:
```ts
export interface PriceSetting {
  id: string; setting_key: string; value: number;
  description?: string; updated_by?: string;
  profiles?: { full_name: string };
}

export interface RoleSalary {
  id: string; role_key: string; role_name: string;
  daily_wage: number; description?: string;
  created_at: string; updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean; message?: string;
  data?: T; meta?: PaginationMeta; error?: string; code?: string;
}
```

### GeneralSetting type (not yet in types - value is `any`):
- DB column: `setting_key VARCHAR(100) PRIMARY KEY`, `setting_value JSONB NOT NULL`, `description TEXT`
- API returns: `{ setting_key: string, setting_value: any, description?: string, updated_at: string, updated_by?: string }`

---

## 9. PageHeader Component (`PageHeader.tsx`)

**Location**: `client/src/components/shared/PageHeader.tsx`

### Interface:
```ts
interface PageHeaderProps {
  title: string;
  description?: string;
  backPath?: string;
  actions?: React.ReactNode;
}
```

### Styling:
- Hidden on mobile: `hidden md:flex`
- Back button: `p-2 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors shrink-0`
- Title: `text-xl font-bold text-foreground leading-tight`
- Description: `text-[13px] text-muted-foreground mt-0.5`
- Actions: `flex items-center gap-2`

---

## 10. Server Settings Module Pattern

**Location**: `server/src/modules/settings/`

### File Structure:
- `settings.service.ts` → Two classes: `PriceSettingsService`, `GeneralSettingsService`
- `settings.controller.ts` → Two classes: `PriceSettingsController`, `GeneralSettingsController`
- `settings.routes.ts` → Express Router with auth and policy middleware

### Service Pattern:
- Static async methods
- Uses `supabaseService` from `../../config/supabase`
- CRUD: `supabaseService.from('table').select('*')`, `.upsert({...}, { onConflict: 'key' }).select().single()`
- Error handling: `if (error) throw error;`
- Upsert uses `onConflict` for key-based deduplication

### Controller Pattern:
- Zod validation schemas at module level: `const schema = z.object({...})`
- Static async methods with `(req: Request, res: Response)`
- `validated = schema.parse(req.body)` for input validation
- Response: `res.status(200).json(successResponse(data))` or `res.status(201).json(successResponse(data, 'message'))`
- Error: `res.status(400).json(errorResponse(err.message))`
- Uses `req.user!.id` for audit fields

### Route Pattern:
```ts
const router = Router();
router.use(authMiddleware); // Global auth for all settings
router.get('/path', requirePolicy('POLICY_NAME'), Controller.method);
router.put('/path/:param', requirePolicy('POLICY_NAME'), Controller.method);
router.post('/path', requirePolicy('POLICY_NAME'), Controller.method);
router.delete('/path/:param', requirePolicy('POLICY_NAME'), Controller.method);
```

### Policy names for settings:
- `GENERAL_SETTINGS_VIEW` → allowed paths: `/cai-dat`, `/hanh-chinh-nhan-su/cham-cong`, `/hanh-chinh-nhan-su/cau-hinh-cham-cong`
- `GENERAL_SETTINGS_MANAGE` → allowed paths: `/cai-dat`, `/hanh-chinh-nhan-su/cau-hinh-cham-cong`
- `HR_SALARY_SETTINGS` → allowed paths: `/hanh-chinh-nhan-su/cai-dat-luong`

---

## 11. Database Migration Pattern

**Location**: `server/database/migrations/`

### Naming Conventions:
- **Sequential numbered**: `01_create_receipts.sql`, `02_products_inventory.sql`, ..., `76_*.sql`
- **Recent trend**: Date-prefixed: `20260415_add_invoice_exported.sql`, `20260508_add_notification_logs.sql`
- **Descriptive snake_case**: `add_general_settings.sql`, `role_salaries.sql`
- **Format**: `{number}_{descriptive_snake_case}.sql` or `{YYYYMMDD}_{descriptive_snake_case}.sql`

### General settings table (migration 28):
```sql
CREATE TABLE IF NOT EXISTS public.general_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);
```
- Uses `JSONB` for flexible value storage
- Primary key is `setting_key` (not UUID)
- Seeds default value: `INSERT ... ON CONFLICT (setting_key) DO NOTHING`

### Role salaries table (migration 11):
```sql
CREATE TABLE public.role_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  daily_wage NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 12. Shared Styling Tokens & Conventions

### Tailwind Design System:
- **Card**: `bg-card rounded-2xl border border-border shadow-sm`
- **Card header**: `px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2`
- **Card section header**: `px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2`
- **Primary button**: `bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95`
- **Secondary button**: `border border-border bg-card text-foreground text-[13px] font-bold hover:bg-muted`
- **Text sizes**: `text-[11px]` (micro), `text-[12px]` (small), `text-[13px]` (body), `text-[14px]` (medium), `text-[15px]` (semi-large)
- **Font weights**: `font-bold` for labels/titles, `font-medium` for content, `font-semibold` rare
- **Colors**: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-emerald-500/600`, `text-red-500`, `text-blue-500`
- **Spacing**: `space-y-4`, `space-y-6`, `gap-2`, `gap-3`, `gap-4`
- **Animation**: `animate-in fade-in slide-in-from-bottom-4 duration-500`
- **Mobile padding**: `-mx-4 sm:mx-0`

---

## 13. Existing Settings Page (`SettingsPage.tsx`)

**Location**: `client/src/pages/SettingsPage.tsx`

### Key Pattern:
- **No separate route for admin** - current settings page is at `/cai-dat`
- It combines theme customization, Zalo config, and regional settings
- Uses `useTheme()` context hook for theme management
- **Section grid**: `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`
- **Full-width section**: `lg:col-span-2`
- **ZaloConfig** is rendered as a standalone section within this grid
- Each settings section is a card with icon+title header
- **"Coming soon" badge pattern**: `<span className="text-[11px] font-bold text-muted-foreground/60 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">Sắp ra mắt</span>`
- **Disabled section**: `opacity-40 select-none`

### Import pattern:
```ts
import ZaloConfig from '../components/shared/ZaloConfig';
import { useTheme, THEME_COLORS, THEME_FONTS, THEME_SIZES } from '../context/ThemeContext';
```

---

## 14. Axios Client (`axiosClient.ts`)

**Location**: `client/src/api/axiosClient.ts`

- baseURL: `import.meta.env.VITE_API_URL || 'http://localhost:3000/api'`
- Auto-attaches Bearer token from localStorage
- Sends current page path via `x-page-path` header for RBA
- Response interceptor unwraps `{ success, data, meta }` → returns `response.data = data` directly
- 401 → clears localStorage, redirects to `/login`

---

## 15. DraggableFAB Component (`DraggableFAB.tsx`)

**Location**: `client/src/components/shared/DraggableFAB.tsx`

### Interface:
```ts
interface DraggableFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}
```

- Mobile-only: `md:hidden`
- Uses `framer-motion` for drag animation
- Portal-rendered via `createPortal`
- Default style: `bg-primary text-white w-12 h-12 rounded-full`

---

## Summary of Integration Points for Admin System Settings

1. **New page**: Create `client/src/pages/admin/SystemSettingsPage.tsx`
2. **New hooks**: Add system settings hooks to `client/src/hooks/queries/` (or extend `usePriceSettings.ts`)
3. **New API methods**: Add to `client/src/api/settingsApi.ts`
4. **New route**: Add `<Route path="/quan-tri-he-thong" element={<SystemSettingsPage />} />` to App.tsx
5. **Module card**: Add new section to `moduleData.ts` or create new module entry
6. **Permissions**: Add to `permission-policies.ts` and `routePermissions.ts`
7. **Migration**: Create `server/database/migrations/77_add_system_settings.sql` (or use date prefix)
8. **Server module**: Add endpoints to existing `settings.routes.ts` or create new module
9. **Types**: Add `GeneralSetting` interface to `client/src/types/index.ts` (currently typed as `any`)

---

## 16. GoodsConversionConfig Component

**Location**: `client/src/components/admin/settings/GoodsConversionConfig.tsx`

### Key Patterns:
- **Segmented toggle** (from SettingsPage theme toggle):
  ```tsx
  <div className="flex bg-muted rounded-xl w-fit p-1">
    {items.map((item) => (
      <button
        onClick={() => setSelected(item.id)}
        className={clsx(
          "flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all",
          selected === item.id
            ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
  ```
- **Card layout**: Follows ZaloConfig pattern - header with icon+title+save button, content in `p-6 space-y-6`
- **Conditional rendering**: Mode-based conditional input (number vs time)
- **Validation**: Inline error messages below inputs in `text-[11px] font-medium text-red-500`
- **Save button states**: `isPending` → disabled + Loader2 spinner; normal → Save icon + text
- **Local state sync**: `useEffect` to sync API data → form state; clears `validationError` on mode/input change
- **Hook usage**: `useInventoryTransferRule()` (query) + `useUpsertSystemSetting()` (mutation)
- **Type safety**: `InventoryTransferRule` type from `types/systemSettings.ts`, conditional properties based on mode

### Integration notes:
- Timezone is hardcoded readonly (`Asia/Ho_Chi_Minh`) - not user-configurable
- Default fallback: `DEFAULT_INVENTORY_TRANSFER` from constants (`mode: hours_after_confirm, hours: 24`)
- Validation: hours 1-168 range; fixed_time format `HH:mm` regex
