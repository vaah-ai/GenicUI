# VaahStore Fixtures

JSON fixtures consumed by `packages/server/src/chat/providers/vaahstore.ts`
when `VITE_VAAHSTORE_LIVE=0` (the default).

| Fixture | VaahStore tool | Sourced from §5 of |
| --- | --- | --- |
| `list_products.json` | `list_products` | journey §5 row 1 |
| `get_product.json` | `get_product` | §5 row 2 |
| `get_variations.json` | `get_variations` | §5 row 3 |
| `check_stock.json` | `check_stock` | §5 row 4 |
| `create_cart.json` | `create_cart` | §5 row 5 |
| `add_to_cart.json` | `add_to_cart` | §5 row 6 |
| `list_shipping.json` | `list_shipping` | §5 row 7 |
| `list_payment_methods.json` | `list_payment_methods` | §5 row 8 |
| `create_order.json` | `create_order` | §5 row 9 |
| `create_address.json` | `create_address` | §5 row 10 |
| `track_order.json` | `track_order` | §5 row 11 |
| `claim_order.json` | `claim_order` | §5 row 12 |

Each fixture is sized to drive a Playwright end-to-end run without
needing live VaahStore credentials — see the pricing and `vh_user_id`
shape notes in `../docs/vaahstore-api-verification.md`.

Set `VITE_VAAHSTORE_LIVE=1` to bypass this directory and hit the live
`{VAAHSTORE_BASE_URL}/api/store/<resource>` endpoints.
