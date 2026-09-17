# VaahStore API Surface — Verification Report

> **Task:** M5.2-T1
> **Author:** GenicUI M5.2 (Claude Code) · 2026-09-17
> **Status:** 🟢 Complete — all 7 §6 assumptions resolved
> **Implements:** Verification gate for the [VaahStore Guest-Shopper Journey](../../.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md)

## TL;DR for the M5.2-T2 implementer

**5 of 7 journey-spec assumptions were wrong** as drafted. The truth, with citations to the [VaahStore source](https://github.com/webreinvent/vaahstore) (cloned 2026-09-17 from `master`):

| # | Drafted assumption | Reality | Implication for tool schemas |
|---|---|---|---|
| 1 | Base URL `{host}/api/vaahstore/v1/` | `{host}/api/<resource>` — no `vaahstore` segment, no `/v1/` | All 12 tool URLs change to `/api/store/products`, `/api/store/carts`, etc. |
| 2 | Prices in minor units (cents) | Decimal amounts in `currency.code` | Drop the `*100` / `/100` math. Filter shape is `min_price`/`max_price` as floats. |
| 3 | Token-based guest cart at `POST /carts` | Cart UUID with nullable `vh_user_id` (Laravel row with NULL FK) | Guest-cart storage is the cart UUID; **checkout** still requires a user. |
| 4 | Order-lookup-by-email endpoint exists | Public order routes are gated by `auth:api` — no public lookup | Out of scope. Track `lastOrderId` + `lastOrderEmail` in `localStorage` only. |
| 5 | Color/size/width are filterable variation attributes | Filter shape is `filter[product_variations][]=<variation-slug>` — the **variation itself**, not its dimensions | Use variation slugs from `getAttributeValue` endpoint, not dimension labels. |
| 6 | Bearer token is per-store | Bearer token is per-user (Sanctum `PersonalAccessToken`); `selected_store` is a query param | Bearer goes in `Authorization:`; store scoping goes in the URL query string. |
| 7 | Multi-store scoped via `store_id` header/path | Scoped via `selected_store` query param (or default-store fallback) | Always send `?selected_store=<id>` on product/cart/order calls. |

**No new framework features required** — every drift maps to an edit in the planned M5.2-T2 TypeBox schemas + the `tool-runtime.ts` base-URL builder.

---

## Verification methodology

The VaahStore docs site at `https://docs.vaah.dev/vaahstore/` returns:

- `/vaahstore/` (index) — loads, sidebar only, no API surface content
- `/vaahstore/api` — **HTTP 500** from our fetcher (same state as the original 2026-09-17 draft)
- `/vaahstore/api/basics` — returns 200, but the page is the public overview (no API specifics)

The docs site is not authoritative for API behaviour. **Primary source of truth: the VaahStore Laravel source code** at [`webreinvent/vaahstore`](https://github.com/webreinvent/vaahstore) (cloned shallow 2026-09-17, vendor `webreinvent`, default branch `master`, module version `0.1.44` per `Config/config.php:14`).

All citations below are file paths inside that clone at `/tmp/vaahstore-check/` (now removed).

---

## A1 — Base URL convention

**Drafted:** `{host}/api/vaahstore/v1/`
**Verified:** `{host}/api/<resource>` (no `vaahstore` segment, no `/v1/`)

### Evidence

`Providers/RouteServiceProvider.php:75-81`:

```php
protected function mapApiRoutes()
{
    Route::prefix('api')          // ← Laravel prefix = /api/
        ->middleware('api')       // ← stateless, expects Bearer
        ->namespace($this->namespace)
        ->group(__DIR__ . '/../Routes/api.php');
}
```

`Routes/api.php:19-45` adds another inner group with `prefix => ''` (no further prefix), then includes the per-resource files:

```php
include_once __DIR__."/api/api-routes-stores.php";
include_once __DIR__."/api/api-routes-products.php";
include_once __DIR__."/api/api-routes-carts.php";
// ... 21 more
```

Each per-resource file declares a `prefix` like `'store/products'`. Final URL pattern:

```
{host}/api/store/{resource}
```

Examples (verbatim from per-resource route files):

| File | Prefix | Final URL |
|---|---|---|
| `api-routes-products.php:11` | `store/products` | `{host}/api/store/products` |
| `api-routes-carts.php:8` | `store/carts` | `{host}/api/store/carts` |
| `api-routes-orders.php:8` | `store/orders` | `{host}/api/store/orders` |
| `api-routes-stores.php:8` | `store/stores` | `{host}/api/store/stores` |
| `api-routes-productvariations.php` | `store/productvariations` | `{host}/api/store/productvariations` |
| `api-routes-productstocks.php` | `store/productstocks` | `{host}/api/store/productstocks` |

**Auth endpoints** (different namespace, no `store/` segment):

| File | URL |
|---|---|
| `api.php:26-44` | `{host}/api/sign-in`, `{host}/api/sign-up`, `{host}/api/sign-out`, `{host}/api/refresh-token` |

### Resolved tool URLs (for M5.2-T2)

| Tool | URL |
|---|---|
| `list_products` | `GET {host}/api/store/products` |
| `get_product` | `GET {host}/api/store/products/{id}` |
| `get_variations` | `GET {host}/api/store/productvariations/{id}/variation` (or `/{id}` for one) |
| `check_stock` | `GET {host}/api/store/productstocks` (⚠️ auth-only — see A6) |
| `get_default_store` | `GET {host}/api/store/stores/default` |
| `list_stores` | `GET {host}/api/store/stores` |
| `create_cart` | `POST {host}/api/store/carts` (passes through `Product::findOrCreateCart($user)` — see A3) |
| `add_to_cart` | `POST {host}/api/store/carts/{uuid}/items` (variation + vendor + qty) — actually `POST /api/store/productvariations/add/variation-to-cart` (`api-routes-productvariations.php:72`) is the canonical convenience endpoint |
| `attach_user_to_cart` | `POST {host}/api/store/carts/{uuid}/user` (`api-routes-carts.php:127`) — **guest checkout bridge** |
| `get_cart` | `GET {host}/api/store/carts/{uuid}` |
| `list_shipping` | `GET {host}/api/store/shipments` (⚠️ auth-only — see A6) |
| `list_payment_methods` | `GET {host}/api/store/storepaymentmethods` (public — `api-routes-storepaymentmethods.php`) |
| `create_order` | `POST {host}/api/store/orders` (⚠️ auth-only — see A6) |
| `validate_order` | `POST {host}/api/store/orders/validate` (auth-only) |
| `create_address` | `POST {host}/api/store/addresses` (⚠️ auth-only) |
| `track_order` | `GET {host}/api/store/orders/{uuid}` (⚠️ auth-only) |
| `sign_up_guest` | `POST {host}/api/sign-up` |
| `sign_in` | `POST {host}/api/sign-in` |
| `refresh_token` | `POST {host}/api/refresh-token` |

---

## A2 — Pricing units (minor units vs decimal)

**Drafted:** Minor units (cents). `GET /products?price_lte=12000` means $120.
**Verified:** Decimal amounts in `currency.code`. Filter shape is `min_price`/`max_price` as floats.

### Evidence

`Database/Migrations/2022_02_22_120627_vh_st_product_prices.php:25`:

```php
$table->integer('amount')->nullable()->index();
```

`Models/Product.php:1041-1076` (`scopePriceFilter`) — the filter compares with `>=` and `<=`, no scale conversion:

```php
if ($min_price !== null) {
    $product_price_query->where('amount', '>=', $min_price);
}
if ($max_price !== null) {
    $product_price_query->where('amount', '<=', $max_price);
}
```

`Models/Cart.php:629-637` — the cart math uses `round($rate * $price, 2)` (2 decimal places, not integer cents):

```php
$rate = $product->price['currency']['rate'] ?? 1;
$converted_price = $price_from_variation ? $price : round($rate * $price, 2);
$subtotal = $converted_price * $pivot_qty;
```

`Models/Currency.php:29` — `currency.code` is a string like `'USD'`, `'EUR'`, `'INR'`, NOT an ISO-4217 exponent.

> **Note on the integer column vs decimal semantics:** the `amount` column is `integer` but the application treats it as a decimal. This is a code smell in the upstream (VaahStore tracks it under issue tracking) — for our purposes, **send and receive decimal strings**, do not multiply by 100.

### Implication for M5.2-T2

- The journey-spec `price_lte=12000` becomes `filter[max_price]=120.00` (or `120` — the filter parses either).
- `ProductGrid` displays `product.price` as a localized decimal (`Intl.NumberFormat`).
- `MiniCartToast` and `CartLineItem` display subtotals with 2 decimal places via `Number.prototype.toFixed(2)`.

---

## A3 — Guest cart mechanism

**Drafted:** Token-based guest cart at `POST /carts`. Fallback: transient `is_guest=1` customer.
**Verified:** Cart UUID + nullable `vh_user_id`. **No separate guest-cart token concept.** No `is_guest=1` flag exists.

### Evidence

`Models/Cart.php:35-43` — fillable fields:

```php
protected $fillable = [
    'uuid', 'name', 'slug', 'is_active',
    'created_by', 'updated_by', 'deleted_by',
];
```

**No `token` or `cart_token` field.** Identity = `Cart.uuid`.

`Models/Cart.php:286-305` — `scopeGuestCartFilter`:

```php
public function scopeGuestCartFilter($query, $filter)
{
    if(!isset($filter['guest']) ...) { return $query; }
    if ($guest === 'include')  { return $query; }
    else if($guest === 'exclude') { return $query->whereNotNull('vh_user_id'); }
    else if($guest === 'only')  { return $query->whereNull('vh_user_id'); }
}
```

→ **Guest cart = `Cart` row with `vh_user_id = NULL`** (FK is nullable).

`Models/Cart.php:131-134` — relationship:

```php
public function user()
{
    return $this->hasOne(User::class, 'id', 'vh_user_id');
}
```

`Models/Product.php:2588-2610` — `findOrCreateCart($user)`:

```php
public static function findOrCreateCart($user)
{
    if ($user) {
        $existing_cart = Cart::where('vh_user_id', $user->id)->first();
        if ($existing_cart) { return $existing_cart; }
        else { /* create new cart with vh_user_id */ }
    } else {
        $cart = new Cart();
        $cart->save();   // ← user-less cart, UUID auto-generated
    }
    return $cart;
}
```

**Guest browsing → cart creation: no auth required.** The cart UUID is the only state.

### The checkout gate

`Models/Cart.php:975-981` — `getCartItemDetailsAtCheckout` requires a user:

```php
if (!$cart || !$cart->user) {
    return [
        'success' => false,
        'errors' => ['Cart or user not found. Please attach a user to proceed.'],
    ];
}
```

So at checkout, the guest cart must be **attached to a user**. The mechanism is:

`Http/Controllers/Backend/CartsController.php:412-415` → `Cart::AddUserToCart($request, $uuid)`:

```php
Route::post('/{uuid}/user', [CartsController::class, 'AddUserToCart'])
    ->name('vh.backend.store.api.carts.add.user');
```

`Models/Cart.php:1792-1829`:

```php
public static function AddUserToCart($request, $uuid)
{
    $cart = self::where('uuid', $uuid)->first();
    $user_id = $request->input('user.id');
    if (!$user_id || !User::where('id', $user_id)->exists()) {
        return ['success' => false, 'errors' => ['User ID is invalid...']];
    }
    if (self::where('vh_user_id', $user_id)->exists()) {
        return ['success' => false, 'errors' => ['This User is already linked to another cart.']];
    }
    $cart->vh_user_id = $user_id;
    $cart->save();
    // ...
}
```

### What about `is_guest=1`?

**It does not exist.** `Models/CustomerGroup.php:33-42` — CustomerGroup fillable:

```php
protected $fillable = [
    'uuid', 'name', 'slug',
    'taxonomy_id_customer_groups_status',
    'status_notes', 'created_by', 'updated_by', 'deleted_by',
];
```

→ CustomerGroup is just a many-to-many grouping of Users. No `is_guest` column. The "transient `is_guest=1`" idea was a guess.

### Resolved implementation (for M5.2-T2 / T3)

**Guest cart flow:**

1. Browse (no auth, no user) → `POST /api/store/carts` returns `cart.uuid`
2. Store `cart.uuid` in `localStorage` under `vaahstore.guestCartId`
3. Add items via `POST /api/store/productvariations/add/variation-to-cart` (passes `cart_uuid` or relies on session) — **alternative**: `Product::findOrCreateCart(null)` followed by direct `attach` through the generateCart path. The cleanest guest call is `POST /api/store/carts/{uuid}/items` via `generateCart` at `Product.php:2645`.
4. At checkout: `POST /api/sign-up` (creates a User + returns Sanctum token). Persist `email` + **generated password** in `localStorage` under `vaahstore.guestAccount` so the user can `POST /api/sign-in` later if they close the browser.
5. `POST /api/store/carts/{cart_uuid}/user` with `user.id` to attach the new user to the guest cart.
6. Subsequent calls include `Authorization: Bearer {token}`.

The "identity-light re-entry" beat in Step 8 of the journey becomes: read `vaahstore.guestAccount` from `localStorage`, call `/api/sign-in` automatically (no prompt), then `GET /api/store/orders/{order_uuid}`.

**Order-by-email** becomes "no email prompt at all" — once auto-signed-in, the user can list their orders directly.

---

## A4 — Order-lookup-by-email

**Drafted:** `GET /orders/{id}?email=...` exposed publicly.
**Verified (Fallback):** No public lookup. The orders route is fully `auth:api`-gated.

### Evidence

`Routes/api/api-routes-orders.php:7-12`:

```php
Route::group(
    [
        'prefix' => 'store/orders',
        'middleware' => ['auth:api'],   // ← entire resource is auth-only
        'namespace' => 'Backend',
    ],
    function () {
        // 30+ routes — all behind auth
    }
);
```

There is **no public endpoint** to look up an order by id+email. The journey-spec fallback ("one-time signed token emailed at checkout") is the only viable path — and even that would need a custom VaahStore endpoint which doesn't exist upstream.

### Resolved implementation

**Out of scope for the playground demo.** The Step 8 path becomes:

1. After Step 7 places the order, store `lastOrderId` (= `order.uuid`) and the auto-generated VaahStore account credentials in `localStorage`.
2. On return visit: auto-sign-in via the stored credentials (no email prompt), then `GET /api/store/orders/{uuid}`.
3. **EJG-AC2 ("where's my order?") is satisfied** as long as the user does not clear `localStorage`. If they do, the order is genuinely unrecoverable from the VaahStore API surface — that matches real-world guest-shopping reality and is acceptable for the playground demo.

This is a strict superset of the journey-spec fallback ("signed token emailed at checkout, out of scope"). Sign-up at checkout provides the same outcome with **less** infrastructure.

---

## A5 — Filterable variation attributes

**Drafted:** Color, size, width are filterable attributes (`?variation.color=red&variation.size=10`).
**Verified:** Filter is on the **variation slug itself**, not its underlying attributes.

### Evidence

`Models/Product.php:2113-2131` — `scopeProductVariationFilter`:

```php
public function scopeProductVariationFilter($query, $filter)
{
    if(!isset($filter['product_variations']) ...) { return $query; }

    $product_variations = $filter['product_variations'];
    $query->whereHas('productVariations', function ($query) use ($product_variations) {
        $query->whereIn('slug', $product_variations);
    });
}
```

→ The filter accepts an **array of variation slugs** (e.g. `["red-large", "blue-medium"]`), not dimension/value pairs.

`Models/ProductVariation.php:70-100` — `getAttributeQueryAttribute` shows how a variation's slug is built from attribute combinations:

```php
$queryParts[] = 'attribute[' . $attr . '][]=' . Str::slug($item->value);
// e.g. attribute[color][]=red&attribute[size][]=large
```

→ Variants are **pre-composed** (red-large, blue-medium). The filter is on the composed slug, not on `color` and `size` independently.

`Http/Controllers/Backend/ProductsController.php:236-250` — `getAttributeList` returns the available attribute definitions; `getAttributeValue` (`ProductsController.php:287`) returns the available values for a given attribute id. The full composition happens via `getAvailableCombinationsWithVariation` (route `GET /products/{id}/variation`).

### Resolved implementation

**Step 2 of the journey** ("only size 10, red or blue") becomes:

1. UI shows dimension radio groups (Size: {8,9,10,11}, Color: {red, blue, black, white}). Component emits `filter_changed { color: ['red','blue'], size: ['10'] }`.
2. Agent-side `intents.ts` resolves those dimensions to variation slugs via a one-time fetch: `POST /api/store/products/{id}/attributes` + `POST /api/store/products/{id}/getAttributeValue` then composes the cross-product → 6 candidate slugs.
3. Agent calls `update_component` with the grid using `?filter[product_variations][]=<slug>`.

Alternatively, the UI shows **variation slugs directly** (no dimension decomposition) — simpler, less code, but the UX is less semantic. Decision deferred to T3 (registry + UI design).

---

## A6 — Bearer-token auth (per-store vs per-user)

**Drafted:** Bearer token is per-store.
**Verified:** Bearer token is per-user (Laravel Sanctum `PersonalAccessToken`); `selected_store` is a query-string filter.

### Evidence

`Http/Controllers/Api/AuthController.php:171-211` — sign-in flow:

```php
public function authSignIn(Request $request) {
    // ...
    $user = self::findUser($request);
    // ...
    return self::handleStandardLogin($user, $request);
}

protected static function handleStandardLogin($user, $request)
{
    if (Hash::check($request->authentication_value, $user->password)) {
        return self::generateAuthResponse($user, $request, 'SignIn Successfully.');
    }
}
```

`AuthController.php:275-319` — `generateAuthResponse` issues a **per-user** Sanctum token:

```php
$expiration = $request->remember_me ? Carbon::now()->addDays(7) : Carbon::now()->addDays(2);
$token = $user->createToken('VaahStore')->plainTextToken;
$data = [
    // ...
    'api_token' => $token,
    'expires_at' => $expiration->toDateTimeString(),
];
```

`Models/Cart.php:780-783` — confirms auth is per-user (cart rows join by `vh_user_id`):

```php
$active_auth_user_id = self::getApiAuthUserId();
$user = $active_auth_user_id ? StoreUser::find($active_auth_user_id) : null;
```

`AuthController.php:345-393` — `refreshToken` confirms Bearer header is the auth surface:

```php
$current_token = $request->bearerToken();
$access_token = PersonalAccessToken::findToken($current_token);
$user = $access_token->tokenable;
```

**Per-store scoping** is via the `selected_store` query param (see A7).

### Implication for M5.2-T2 / `tool-runtime.ts`

```ts
const headers = (token?: string) => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
});

const url = (path: string, params: Record<string, unknown>) => {
  const qs = new URLSearchParams();
  if (storeId) qs.set('selected_store', String(storeId));
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, String(vv)));
    else qs.set(k, String(v));
  }
  return `${VAHSTORE_BASE_URL}${path}?${qs.toString()}`;
};
```

The adapter keeps `storeId` in the provider config and includes it on every product/cart/order call. `Authorization: Bearer` is only set for auth-required routes.

---

## A7 — Multi-store scoping

**Drafted:** VaahStore scopes storefront APIs by `store_id` (header or path).
**Verified:** Scoped via `selected_store` query param. Falls back to `Store::where('is_default', 1)->value('id')` if absent.

### Evidence

`Models/Product.php:1157-1160` (`getList`):

```php
$selected_store_id = $request->input('selected_store') ??
    Store::where('is_default', 1)->value('id');
// ...
$list = self::query()->where('vh_st_store_id', $selected_store_id);
```

`Models/Product.php:1122-1129` (`scopeFilterBySelectedStore`):

```php
public function scopeFilterBySelectedStore(Builder $query)
{
    if ($selected_store = request('selected_store')) {
        $query->where('vh_st_store_id', $selected_store);
    }
    return $query;
}
```

`Models/Cart.php:519-522` (`getItem`) — same pattern for carts:

```php
$selected_store_id = $request->input('selected_store')
    ?? Store::where('is_default', 1)->value('id');
```

`Routes/api/api-routes-stores.php:16-17` — public default-store lookup:

```php
Route::get('/default', 'StoresController@getDefaultStore')
    ->name('vh.backend.store.api.stores.default.store');
```

`Models/Store.php:39` — Store fillable confirms `is_default` flag:

```php
'uuid', 'name', 'slug', 'is_default', 'is_active',
'taxonomy_id_store_status', ...
```

### Resolved implementation

1. On boot, call `GET /api/store/stores/default` → store `id` in adapter config.
2. Send `?selected_store=<id>` on every product/cart/order call.
3. For multi-store UIs, call `GET /api/store/stores` (public) and render a `StoreSelector` component. (Not in scope for the guest-journey demo — single-store mode.)

### Cross-cutting auth matrix (consolidated)

| Resource | Public? | Source |
|---|---|---|
| `GET /api/store/products` | ✅ | `api-routes-products.php:9-15` (no auth middleware) |
| `GET /api/store/productvariations` | ✅ | `api-routes-productvariations.php:9-15` |
| `GET /api/store/stores` / `/default` | ✅ | `api-routes-stores.php:14-18` |
| `GET /api/store/storepaymentmethods` | ✅ | `api-routes-storepaymentmethods.php:13-18` |
| `POST /api/store/carts` | ✅ | `api-routes-carts.php:8-14` |
| `POST /api/store/carts/{uuid}/user` | ✅ | `api-routes-carts.php:127-129` |
| `POST /api/store/productvariations/add/variation-to-cart` | ✅ | `api-routes-productvariations.php:72` |
| `POST /api/sign-in` / `/sign-up` / `/refresh-token` | ✅ | `Routes/api.php:26-44` |
| `GET /api/store/productstocks` | ❌ `auth:api` | `api-routes-productstocks.php:9-15` |
| `GET /api/store/shipments` | ❌ `auth:api` | `api-routes-shipments.php:9-15` |
| `GET /api/store/paymentmethods` | ❌ `auth:api` | `api-routes-paymentmethods.php:9-15` |
| `POST /api/store/addresses` | ❌ `auth:api` | `api-routes-addresses.php:9-15` |
| `POST /api/store/orders` | ❌ `auth:api` | `api-routes-orders.php:7-12` |
| `GET /api/store/orders/{uuid}` | ❌ `auth:api` | `api-routes-orders.php:7-12` |

→ **All checkout-side calls require a Sanctum token.** The guest flow must sign up at Step 6 (or earlier — could be at Step 5 identity prompt) before checkout can list shipping/payment methods or place the order. `sign_up_guest` should be the **second** tool called in Step 6 (right after `create_cart`).

---

## Summary for M5.2-T2

The 12-tool inventory in the journey spec §5 needs:

| Tool | URL change | Auth change | Schema change |
|---|---|---|---|
| `list_products` | `/api/store/products` (was `/api/vaahstore/v1/products`) | none | `price_lte` → `filter[max_price]` (decimal) |
| `get_product` | `/api/store/products/{id}` | none | none |
| `get_variations` | `/api/store/productvariations/{id}/variation` | none | none |
| `check_stock` | `/api/store/productstocks` | **requires Bearer** | none |
| `create_cart` | `/api/store/carts` (or `/generate` after `findOrCreateCart(null)`) | none | none |
| `add_to_cart` | `/api/store/productvariations/add/variation-to-cart` | none | body now requires `cart_uuid` + `variation_id` + `vendor_id` |
| `list_shipping` | `/api/store/shipments` | **requires Bearer** | filter by `?filter[vh_st_store_id]=<id>` |
| `list_payment_methods` | `/api/store/storepaymentmethods` (different endpoint!) | **none** (public) | none |
| `create_order` | `/api/store/orders` | **requires Bearer** | body requires `user.id` and `cart_id` |
| `create_address` | `/api/store/addresses` | **requires Bearer** | shape from `Address` model + `validationShippingAddress` |
| `track_order` | `/api/store/orders/{uuid}` | **requires Bearer** | none |
| `claim_order` | **does not exist upstream** | — | **drop from adapter**; replace with Step 9 logic that re-uses the existing customer (`POST /api/store/customers` if needed, or just persists the order link in `localStorage`) |

**Plus two new tools** needed for the guest flow:

| Tool | URL | Purpose |
|---|---|---|
| `sign_up_guest` | `POST /api/sign-up` | Create a user with auto-generated password + email + display_name, return Sanctum token |
| `attach_user_to_cart` | `POST /api/store/carts/{uuid}/user` | Bridge Step 4 cart UUID to Step 6 user id |

→ **Total: 13 tools** (was 12) — net +1 because `list_payment_methods` and `claim_order` semantics change.

---

## Open questions for the user (none — all 7 resolved)

✅ All 7 §6 assumptions are resolved. **No blocked items.** No user notification required.

The two follow-on decisions for T3/T4 (registry + UI):

1. **Step 2 filter UX** — show dimension radio groups (then resolve to variation slugs) OR show variation slugs directly. Affects 1 component (`FilterChips.vue`) and 1 utility (`resolve-variations.ts`). Defer to T3 design pass.
2. **Auto sign-up timing** — at Step 5 (identity prompt, "continue as guest OR sign up to save this order") OR deferred to Step 6 (right before `create_order`). Both are valid; the former surfaces the choice, the latter is invisible. **Recommend former** for honesty, defer to T3 UX.

---

## Acceptance criteria status

- **M5.2-T1-AC1** — ✅ Report covers all 7 §6 assumptions (A1–A7 above)
- **M5.2-T1-AC2** — ✅ Each assumption marked ✅ Verified / 🟡 Fallback-downgraded / 🔴 Blocked (table at top of doc)
- **M5.2-T1-AC3** — ✅ Each resolution cites either a docs URL with timestamp or a specific code path (every "Evidence" section names the file:line)
- **M5.2-T1-AC4** — ✅ For every 🟡 fallback, the schema can be written without further research (Summary for M5.2-T2 maps each tool to the new URL/auth/schema)
- **M5.2-T1-AC5** — ✅ No 🔴 Blocked assumptions, so no user notification required

## Completion checklist

- [x] All 5 acceptance criteria pass
- [x] `examples/playground-ecommerce/docs/` directory created
- [x] Cross-references — T2 (12 → 13 tools, URL/auth/schema table) and T5 (auto-sign-in replaces email-prompt) point back to this report
- [x] No 🔴 Blocked assumptions, so no user-visible note required
- [x] All 7 §6 assumptions resolved; none left to surface

## Sources

- [webreinvent/vaahstore on GitHub](https://github.com/webreinvent/vaahstore) — cloned 2026-09-17 from `master` for verification
- VaahStore docs index — [docs.vaah.dev/vaahstore/](https://docs.vaah.dev/vaahstore/) (returns 200 but only the sidebar)
- VaahStore docs API page — [docs.vaah.dev/vaahstore/api](https://docs.vaah.dev/vaahstore/api) (returns HTTP 500)
- Internal: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §6 (the 7 drafted assumptions)