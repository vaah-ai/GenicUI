<script setup lang="ts">
/**
 * GenicUI landing page — Ethereal Glass + Asymmetrical Bento archetype.
 *
 * Self-contained Vue component to bypass MDC's nested-block flattening,
 * which would otherwise break the asymmetric bento grid.
 *
 * Design archetype: Ethereal Glass (dark, OLED-black with radial mesh
 * gradients). Pair with Asymmetrical Bento layout.
 *
 * All copy is real — no lorem ipsum. All buttons route into the IA tree
 * that M5.1-T3 wired up.
 */
import { h, nextTick, ref } from 'vue'
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

// Active tab in the "What you build" case studies. Four cases are
// rendered into a single shared surface (tabs on top, intro as a
// banner, themed chat full-width below) to compress the page height —
// the four stacked stitched-chat blocks previously pushed the bento
// grid far below the fold.
const activeCase = ref(0)
const caseCount = 4
const nextCase = () => { activeCase.value = (activeCase.value + 1) % caseCount }
const prevCase = () => { activeCase.value = (activeCase.value - 1 + caseCount) % caseCount }

// Refs to each tab button so onCaseKeydown can move focus along with
// the activeCase state. WAI-ARIA tabs pattern: focus and selection
// move together on ArrowLeft / ArrowRight / Home / End.
const tabRefs = ref<HTMLButtonElement[]>([])

function onCaseKeydown(event: KeyboardEvent, index: number) {
  let next: number | null = null
  if (event.key === 'ArrowRight') next = (index + 1) % caseCount
  else if (event.key === 'ArrowLeft') next = (index - 1 + caseCount) % caseCount
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = caseCount - 1
  if (next === null) return
  event.preventDefault()
  activeCase.value = next
  // Move focus to the newly active tab — WAI-ARIA tabs pattern keeps
  // focus and selection in lockstep so the visible focus ring always
  // sits on the active tab. Without this the focus ring stays on the
  // tab the user pressed arrow on, leaving the screen reading as
  // "focused ≠ active" — which is what the M5.1-T5 UAT caught.
  nextTick(() => tabRefs.value[next!]?.focus())
}

// Reusable chrome header (chat surface top bar). Each environment
// gets its own icon + title + status indicator so the four cases
// stay visually distinct.
const chromeHeader = (icon: string, titlePrefix: string, titleHighlight: string, accent: string, statusLabel: string) =>
  h('div', { class: 'flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-black/30' }, [
    h('div', { class: 'flex items-center gap-2 min-w-0' }, [
      h(resolveComponent('UIcon'), { name: icon, class: `size-3.5 ${accent} shrink-0` }),
      h('span', { class: 'font-mono text-[11px] text-white/70 truncate' }, [
        titlePrefix,
        h('span', { class: 'text-white/90' }, titleHighlight)
      ]),
      h('span', { class: 'px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:inline-block' }, 'live demo')
    ]),
    h('div', { class: 'flex items-center gap-1.5 shrink-0' }, [
      h('span', { class: 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' }),
      h('span', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, statusLabel)
    ])
  ])

const sparkAvatar = (gradient: string) =>
  h('div', { class: `w-8 h-8 rounded-full bg-gradient-to-br ${gradient} border border-white/10 flex items-center justify-center shrink-0` }, [
    h(resolveComponent('UIcon'), { name: 'i-lucide-sparkles', class: 'size-4 text-blue-300' })
  ])

const youAvatar = () =>
  h('div', { class: 'w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/80 shrink-0' }, 'you')

// ── UC01: E-commerce shopping assistant (chat / no chrome) ────────────
const uc01Header = () =>
  h('div', { class: 'flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.015]' }, [
    h('div', { class: 'flex items-center gap-2' }, [
      h('div', { class: 'w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/40 to-cyan-500/40 border border-white/10 flex items-center justify-center' }, [
        h(resolveComponent('UIcon'), { name: 'i-lucide-sparkles', class: 'size-3 text-blue-300' })
      ]),
      h('span', { class: 'text-xs font-medium text-white/90' }, 'Genic assistant'),
      h('span', { class: 'px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider' }, 'live demo')
    ]),
    h('div', { class: 'flex items-center gap-1.5' }, [
      h('span', { class: 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' }),
      h('span', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, 'connected')
    ])
  ])

const uc01Thread = () =>
  h('div', { class: 'px-4 py-5 sm:px-6 sm:py-6 space-y-5' }, [
    // Turn 1 — user
    h('div', { class: 'flex items-start gap-3 justify-end' }, [
      h('div', { class: 'max-w-[80%] rounded-2xl rounded-tr-md bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white' }, 'Show me my cart and apply the SUMMER25 coupon.'),
      youAvatar()
    ]),
    // Turn 2 — agent
    h('div', { class: 'flex items-start gap-3' }, [
      sparkAvatar('from-blue-500/30 to-cyan-500/30'),
      h('div', { class: 'max-w-[80%] rounded-2xl rounded-tl-md bg-blue-500/10 border border-blue-400/20 px-4 py-2.5 text-sm text-white/90' }, [
        'Pulled up your cart. Coupon applied — you saved ',
        h('span', { class: 'text-emerald-300 font-medium' }, '$14.20'),
        '. Ready to check out?'
      ])
    ]),
    // Turn 3 — render_component + cart
    h('div', { class: 'flex items-start gap-3' }, [
      h('div', { class: 'w-8 shrink-0', 'aria-hidden': 'true' }),
      h('div', { class: 'flex-1 min-w-0 space-y-2' }, [
        h('div', { class: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          h(resolveComponent('UIcon'), { name: 'i-lucide-zap', class: 'size-3 text-blue-300' }),
          ' render_component · ',
          h('span', { class: 'text-blue-300/90' }, 'CartViewer')
        ]),
        h('div', { class: 'rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5' }, [
          h('div', { class: 'flex items-center justify-between mb-4' }, [
            h('div', { class: 'flex items-center gap-2' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-shopping-cart', class: 'size-4 text-blue-300' }),
              h('span', { class: 'text-sm font-medium text-white' }, 'Your cart'),
              h('span', { class: 'px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-[var(--color-text-muted)]' }, '3 items')
            ]),
            h('span', { class: 'text-[10px] font-mono text-emerald-400 uppercase tracking-wider' }, 'cart: a8f2')
          ]),
          h('div', { class: 'space-y-2 mb-4' }, [
            cartRow('from-amber-500/20 to-orange-500/20', 'Linen field jacket', 'Sand · M', '$148.00'),
            cartRow('from-violet-500/20 to-pink-500/20', 'Cotton crew tee', 'Off-white · L', '$32.00'),
            cartRow('from-emerald-500/20 to-cyan-500/20', 'Canvas weekender', 'Olive', '$184.00')
          ]),
          h('div', { class: 'rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center justify-between mb-3' }, [
            h('div', { class: 'flex items-center gap-2 text-xs text-emerald-300' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-tag', class: 'size-3.5' }),
              h('span', null, 'SUMMER25 applied')
            ]),
            h('span', { class: 'text-xs font-mono text-emerald-300' }, '−$14.20')
          ]),
          h('div', { class: 'flex items-center justify-between mb-3' }, [
            h('span', { class: 'text-xs text-[var(--color-text-muted)]' }, 'Subtotal'),
            h('span', { class: 'text-sm font-mono text-white' }, '$349.80')
          ]),
          h('button', { type: 'button', class: 'w-full rounded-lg bg-white text-black font-medium py-2 text-xs hover:bg-white/90 transition flex items-center justify-center gap-2 group' }, [
            'Checkout',
            h(resolveComponent('UIcon'), { name: 'i-lucide-arrow-right', class: 'size-3.5 transition-transform group-hover:translate-x-0.5' })
          ])
        ]),
        h('p', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          'rendered via ',
          h('span', { class: 'text-blue-300/80' }, 'render_component'),
          ' · PrimeVue DataTable + Button'
        ])
      ])
    ])
  ])

function cartRow(thumbGradient: string, name: string, sub: string, price: string) {
  return h('div', { class: 'flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5' }, [
    h('div', { class: `w-10 h-10 rounded-md bg-gradient-to-br ${thumbGradient} border border-white/10 shrink-0` }),
    h('div', { class: 'flex-1 min-w-0' }, [
      h('div', { class: 'text-sm text-white truncate' }, name),
      h('div', { class: 'text-xs text-[var(--color-text-muted)]' }, sub)
    ]),
    h('div', { class: 'text-sm font-mono text-white shrink-0' }, price)
  ])
}

// ── UC02: Support triage — VS Code IDE assistant pane ──────────────────
const uc02Header = () =>
  chromeHeader('i-simple-icons-visualstudiocode', 'VS Code · ', 'support-assistant', 'text-violet-300', 'connected')

const uc02Thread = () =>
  h('div', { class: 'px-4 py-5 sm:px-6 sm:py-6 space-y-5' }, [
    h('div', { class: 'flex items-start gap-3 justify-end' }, [
      h('div', { class: 'max-w-[80%] rounded-2xl rounded-tr-md bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white' }, 'Handle the most urgent payment ticket.'),
      youAvatar()
    ]),
    h('div', { class: 'flex items-start gap-3' }, [
      h(resolveComponent('UIcon'), { name: 'i-simple-icons-visualstudiocode', class: 'size-8 rounded-lg bg-violet-500/15 border border-violet-400/30 p-1.5 text-violet-300 shrink-0' }),
      h('div', { class: 'max-w-[80%] rounded-2xl rounded-tl-md bg-violet-500/10 border border-violet-400/20 px-4 py-2.5 text-sm text-white/90' }, 'Triage summary in. Customer is high-LTV, third payment issue this month. I’d recommend escalating — want me to route it to billing?')
    ]),
    h('div', { class: 'flex items-start gap-3' }, [
      h('div', { class: 'w-8 shrink-0', 'aria-hidden': 'true' }),
      h('div', { class: 'flex-1 min-w-0 space-y-2' }, [
        h('div', { class: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          h(resolveComponent('UIcon'), { name: 'i-lucide-zap', class: 'size-3 text-violet-300' }),
          ' render_component · ',
          h('span', { class: 'text-violet-300/90' }, 'TicketCard')
        ]),
        h('div', { class: 'rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5' }, [
          h('div', { class: 'flex items-center justify-between mb-3' }, [
            h('div', { class: 'flex items-center gap-2' }, [
              h('span', { class: 'px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono text-rose-300 uppercase tracking-wider' }, 'urgent'),
              h('span', { class: 'text-sm font-medium text-white' }, 'Ticket #C-2847')
            ]),
            h('span', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, '3m ago')
          ]),
          h('h4', { class: 'text-base text-white mb-1.5' }, 'Payment failed for order #1092'),
          h('p', { class: 'text-xs text-[var(--color-text-muted,#A1A1AA)] mb-4 leading-relaxed' }, 'Customer reports Visa ending 4291 declined twice. Three prior tickets this month.'),
          h('div', { class: 'rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 mb-4' }, [
            h('div', { class: 'text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-2' }, 'Customer history'),
            h('div', { class: 'space-y-1 text-xs' }, [
              historyRow('Lifetime value', '$2,840'),
              historyRow('Prior tickets (30d)', '3'),
              historyRow('Plan', 'Pro · annual')
            ])
          ]),
          h('div', { class: 'grid grid-cols-2 gap-2' }, [
            h('button', { type: 'button', class: 'rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/10 transition flex items-center justify-center gap-2' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-check', class: 'size-3.5 text-emerald-400' }), 'Resolve'
            ]),
            h('button', { type: 'button', class: 'rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/10 transition flex items-center justify-center gap-2' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-arrow-up-right', class: 'size-3.5 text-amber-400' }), 'Escalate'
            ])
          ])
        ]),
        h('p', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          'rendered via ',
          h('span', { class: 'text-blue-300/80' }, 'render_component'),
          ' · TicketCard in IDE assistant'
        ])
      ])
    ])
  ])

function historyRow(label: string, value: string) {
  return h('div', { class: 'flex items-center justify-between' }, [
    h('span', { class: 'text-white/80' }, label),
    h('span', { class: 'font-mono text-white' }, value)
  ])
}

// ── UC03: Analytics — Slack #analytics ────────────────────────────────
const uc03Header = () =>
  chromeHeader('i-simple-icons-slack', 'genicui · ', '#analytics', 'text-emerald-300', 'online')

const uc03Thread = () =>
  h('div', { class: 'px-4 py-5 sm:px-6 sm:py-6 space-y-5' }, [
    h('div', { class: 'flex items-start gap-3' }, [
      h('div', { class: 'w-8 h-8 rounded-md bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/85 shrink-0' }, 'PM'),
      h('div', { class: 'min-w-0' }, [
        h('div', { class: 'flex items-center gap-2 mb-0.5' }, [
          h('span', { class: 'text-xs font-medium text-white' }, 'Priya M.'),
          h('span', { class: 'text-[10px] text-white/40 font-mono' }, '14:02')
        ]),
        h('div', { class: 'rounded-lg bg-white/5 border border-white/10 px-3.5 py-2 text-sm text-white/90 inline-block' }, 'How is revenue trending this week vs last?')
      ])
    ]),
    h('div', { class: 'flex items-start gap-3' }, [
      h('div', { class: 'w-8 h-8 rounded-md bg-gradient-to-br from-violet-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center shrink-0' }, [
        h(resolveComponent('UIcon'), { name: 'i-lucide-sparkles', class: 'size-4 text-violet-300' })
      ]),
      h('div', { class: 'min-w-0' }, [
        h('div', { class: 'flex items-center gap-2 mb-0.5' }, [
          h('span', { class: 'text-xs font-medium text-white' }, 'Genic Bot'),
          h('span', { class: 'text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' }, 'APP'),
          h('span', { class: 'text-[10px] text-white/40 font-mono' }, '14:02')
        ]),
        h('div', { class: 'rounded-lg bg-violet-500/10 border border-violet-400/20 px-3.5 py-2.5 text-sm text-white/90 inline-block' }, [
          'Up ',
          h('span', { class: 'text-emerald-300 font-medium' }, '+12.4%'),
          ' week-over-week. Strongest day was Wednesday — 3 new enterprise accounts. Posting the dashboard:'
        ])
      ])
    ]),
    h('div', { class: 'flex items-start gap-3' }, [
      h('div', { class: 'w-8 shrink-0', 'aria-hidden': 'true' }),
      h('div', { class: 'flex-1 min-w-0 space-y-2' }, [
        h('div', { class: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          h(resolveComponent('UIcon'), { name: 'i-lucide-zap', class: 'size-3 text-emerald-300' }),
          ' render_component · ',
          h('span', { class: 'text-emerald-300/90' }, 'KpiDashboard')
        ]),
        h('div', { class: 'rounded-xl border border-white/[0.08] bg-black/30 p-4 sm:p-5' }, [
          h('div', { class: 'flex items-center justify-between mb-4' }, [
            h('div', { class: 'flex items-center gap-2' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-chart-line', class: 'size-4 text-emerald-300' }),
              h('span', { class: 'text-sm font-medium text-white' }, 'Weekly revenue')
            ]),
            h('span', { class: 'px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300' }, '+12.4%')
          ]),
          h('div', { class: 'grid grid-cols-3 gap-2 mb-4' }, [
            kpiTile('This week', '$48.2k'),
            kpiTile('Orders', '312'),
            kpiTile('AOV', '$154.40')
          ]),
          h('div', { class: 'rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 mb-4' }, [
            h('svg', { viewBox: '0 0 320 80', class: 'w-full h-16', preserveAspectRatio: 'none', innerHTML: `
              <defs>
                <linearGradient id="spark-uc3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10B981" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#10B981" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,55 L40,48 L80,52 L120,40 L160,35 L200,28 L240,30 L280,18 L320,12 L320,80 L0,80 Z" fill="url(#spark-uc3)" />
              <path d="M0,55 L40,48 L80,52 L120,40 L160,35 L200,28 L240,30 L280,18 L320,12" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            ` }),
            h('div', { class: 'flex items-center justify-between mt-1.5 text-[9px] font-mono text-[var(--color-text-muted)]' }, [
              h('span', null, 'Mon'), h('span', null, 'Tue'), h('span', null, 'Wed'),
              h('span', null, 'Thu'), h('span', null, 'Fri'), h('span', null, 'Sat'), h('span', null, 'Sun')
            ])
          ]),
          h('div', { class: 'space-y-1.5' }, [
            h('div', { class: 'text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]' }, 'Top accounts (this week)'),
            accountRow('Northwind Co.', '$8,420'),
            accountRow('Acme Industrial', '$5,180'),
            accountRow('Pioneer Labs', '$3,940')
          ]),
          h('div', { class: 'mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-3 text-[10px] font-mono text-white/50' }, [
            h('span', { class: 'hover:text-white cursor-pointer' }, '↳ Reply in thread'),
            h('span', { class: 'hover:text-white cursor-pointer' }, 'Drill in'),
            h('span', { class: 'hover:text-white cursor-pointer' }, 'Export CSV')
          ])
        ]),
        h('p', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          'rendered via ',
          h('span', { class: 'text-blue-300/80' }, 'render_component'),
          ' · KpiDashboard with drill-down actions'
        ])
      ])
    ])
  ])

function kpiTile(label: string, value: string) {
  return h('div', { class: 'rounded-lg bg-white/[0.04] px-2.5 py-2' }, [
    h('div', { class: 'text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5' }, label),
    h('div', { class: 'text-sm font-mono text-white' }, value)
  ])
}

function accountRow(name: string, value: string) {
  return h('div', { class: 'flex items-center justify-between text-xs' }, [
    h('span', { class: 'text-white/80 truncate' }, name),
    h('span', { class: 'font-mono text-white' }, value)
  ])
}

// ── UC04: Form — browser-extension popup ───────────────────────────────
const uc04Header = () =>
  chromeHeader('i-lucide-chrome', 'genicui · ', 'claim-form', 'text-amber-300', 'connected')

const uc04Thread = () =>
  h('div', { class: 'px-4 py-5 sm:px-6 sm:py-6 space-y-5' }, [
    h('div', { class: 'flex items-start gap-3 justify-end' }, [
      h('div', { class: 'max-w-[80%] rounded-2xl rounded-tr-md bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white' }, 'I was rear-ended on Market St last Thursday. Help me file the claim.'),
      youAvatar()
    ]),
    h('div', { class: 'flex items-start gap-3' }, [
      h(resolveComponent('UIcon'), { name: 'i-lucide-chrome', class: 'size-8 rounded-lg bg-amber-500/15 border border-amber-400/30 p-1.5 text-amber-300 shrink-0' }),
      h('div', { class: 'max-w-[80%] rounded-2xl rounded-tl-md bg-amber-500/10 border border-amber-400/20 px-4 py-2.5 text-sm text-white/90' }, [
        'Got it. I’ve prefilled the form from your description — three fields left to confirm before you submit. Say ',
        h('em', null, '“continue”'),
        ' or tap the button on the popup.'
      ])
    ]),
    h('div', { class: 'flex items-start gap-3' }, [
      h('div', { class: 'w-8 shrink-0', 'aria-hidden': 'true' }),
      h('div', { class: 'flex-1 min-w-0 space-y-2' }, [
        h('div', { class: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          h(resolveComponent('UIcon'), { name: 'i-lucide-zap', class: 'size-3 text-amber-300' }),
          ' render_component · ',
          h('span', { class: 'text-amber-300/90' }, 'ClaimForm')
        ]),
        h('div', { class: 'rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5' }, [
          h('div', { class: 'flex items-center justify-between mb-4' }, [
            h('div', { class: 'flex items-center gap-2' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-file-pen-line', class: 'size-4 text-amber-300' }),
              h('span', { class: 'text-sm font-medium text-white' }, 'Insurance claim')
            ]),
            h('span', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, 'step 2 / 4')
          ]),
          h('div', { class: 'space-y-3 mb-4' }, [
            fieldGroup('Incident type', 'Auto collision', 'i-lucide-chevron-down'),
            fieldGroup('Date of incident', 'Sept 4, 2026', 'i-lucide-calendar'),
            h('div', null, [
              h('label', { class: 'block text-[10px] font-mono text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider' }, 'Description'),
              h('div', { class: 'rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/80 min-h-[64px]' }, 'Rear-ended at low speed on Market St. No injuries. Other driver admitted fault; police report #2026-MKT-0411...')
            ]),
            h('div', { class: 'flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2' }, [
              h(resolveComponent('UIcon'), { name: 'i-lucide-sparkles', class: 'size-3.5 text-amber-300' }),
              h('span', { class: 'text-xs text-amber-200/90' }, [
                'Agent prefilled this from your chat. ',
                h('span', { class: 'underline' }, 'Review & continue')
              ])
            ])
          ]),
          h('button', { type: 'button', class: 'w-full rounded-lg bg-white text-black font-medium py-2 text-xs hover:bg-white/90 transition flex items-center justify-center gap-2 group' }, [
            'Continue to step 3',
            h(resolveComponent('UIcon'), { name: 'i-lucide-arrow-right', class: 'size-3.5 transition-transform group-hover:translate-x-0.5' })
          ])
        ]),
        h('p', { class: 'text-[10px] font-mono text-[var(--color-text-muted)]' }, [
          'rendered via ',
          h('span', { class: 'text-blue-300/80' }, 'render_component'),
          ' · ClaimForm via browser extension'
        ])
      ])
    ])
  ])

function fieldGroup(label: string, value: string, icon: string) {
  return h('div', null, [
    h('label', { class: 'block text-[10px] font-mono text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider' }, label),
    h('div', { class: 'rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white flex items-center justify-between' }, [
      h('span', null, value),
      h(resolveComponent('UIcon'), { name: icon, class: 'size-3.5 text-[var(--color-text-muted)]' })
    ])
  ])
}

// Tab metadata + panel renderers. Each entry exposes:
//   id                — stable id used for tab/panel element ids
//   shortLabel        — text on the pill button (e.g. "E-commerce")
//   dotClass          — accent dot color (active state styling lives in tab)
//   activeText        — text-color tweak on the active pill (matches accent)
//   eyebrowClass      — color of the "Use case 0n" eyebrow on the left
//   topBorderClass    — accent border-t-{color}/60 on the chat surface
//   category          — right-side eyebrow ("Analytics · Slack")
//   headline          — h3 markup with the case's headline
//   body              — p markup with the case's intro paragraph
//   header / thread   — VNode render functions for the chrome + 3-turn thread
const caseTabs = [
  {
    id: 'ecommerce',
    shortLabel: 'E-commerce',
    dotClass: 'bg-blue-400',
    activeText: '',
    eyebrowClass: 'text-[var(--color-accent-blue)]',
    topBorderClass: '',
    category: 'E-commerce',
    headline: 'Conversational shopping.',
    body: 'The user says “show me my cart and apply the summer coupon.” The agent calls <code class="text-blue-300/90 font-mono text-sm">render_component</code> with your <code class="text-blue-300/90 font-mono text-sm">CartViewer</code>. Your PrimeVue DataTable appears inline, prefilled with their items, with a working “Apply coupon” button wired to your checkout.',
    header: uc01Header,
    thread: uc01Thread
  },
  {
    id: 'ide-triage',
    shortLabel: 'IDE triage',
    dotClass: 'bg-violet-400',
    activeText: '',
    eyebrowClass: 'text-[var(--color-accent-violet)]',
    topBorderClass: 'border-t-violet-400/60',
    category: 'Support triage · IDE',
    headline: 'Triage tickets <span class="display-serif">in</span> your IDE.',
    body: 'The agent pulls a customer’s history, summarizes the issue, and renders a fully contextual <code class="text-violet-300/90 font-mono text-sm">TicketCard</code> with Resolve / Escalate buttons — inline in your IDE assistant pane. No second tab, no tab-switch.',
    header: uc02Header,
    thread: uc02Thread
  },
  {
    id: 'slack-analytics',
    shortLabel: 'Slack analytics',
    dotClass: 'bg-emerald-400',
    activeText: '',
    eyebrowClass: 'text-[var(--color-accent-emerald)]',
    topBorderClass: 'border-t-emerald-400/60',
    category: 'Analytics · Slack',
    headline: 'Numbers, in the same thread as the team.',
    body: 'The user asks <em>“how is revenue trending this week?”</em> in the <code class="font-mono text-sm text-emerald-300/90">#analytics</code> channel. The agent renders a real <code class="text-emerald-300/90 font-mono text-sm">KpiDashboard</code> inline as a thread reply — chart, top accounts, drill-down controls — fully visible to everyone who follows the conversation.',
    header: uc03Header,
    thread: uc03Thread
  },
  {
    id: 'browser-form',
    shortLabel: 'Browser form',
    dotClass: 'bg-amber-400',
    activeText: '',
    eyebrowClass: 'text-[var(--color-accent-amber)]',
    topBorderClass: 'border-t-amber-400/60',
    category: 'Form · browser extension',
    headline: 'Fill the form <span class="display-serif">for</span> the user.',
    body: 'The user describes what happened in plain language. The agent maps it to your schema, renders the real form pre-populated, and hands control back. The user reviews, edits, and submits — and the structured values flow back to the agent on submit.',
    header: uc04Header,
    thread: uc04Thread
  }
]

async function copyInstall(event: MouseEvent) {
  const btn = event.currentTarget as HTMLButtonElement
  const command = btn.dataset.copy ?? ''
  try {
    await navigator.clipboard.writeText(command)
  } catch {
    // Fallback for non-secure contexts: select-and-copy via temp textarea
    const ta = document.createElement('textarea')
    ta.value = command
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 1800)
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div class="landing-root">
    <!-- Hero -->
    <section class="landing-hero-glow relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <!-- Two-column hero at lg+: text on the left, surface composite on the right.
             Below lg: single column, stacked vertically (text first, composite below). -->
        <div class="flex flex-col items-center text-center lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:text-left">
          <!-- Left column at lg+: headline, sub-paragraph, install pill, hero-links, trust row. -->
          <div class="flex flex-col items-center text-center w-full lg:col-span-5 lg:items-start lg:text-left">
          <div
            class="stagger relative inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-400/30 bg-violet-500/10 backdrop-blur-md text-[10px] font-mono uppercase tracking-[0.2em] text-violet-200"
            style="--i:0"
          >
            <span class="orbit-ring orbit-ring-a rounded-full" aria-hidden="true" />
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 landing-pulse" />
            <span>v0.5 · MCP-native · Apache-2.0</span>
          </div>

          <!-- Headline — one sentence + a single italic accent. The
               accent phrase "not paragraphs" mirrors the page-wide
               pattern used by the use-case and "What's next" headlines:
               "Triage tickets *in* your IDE.", "Fill the form *for*
               the user.", "Six primitives. *Compose them* however you
               like." — a single short phrase in display-serif italic.
               The anti-pattern ("let me open the app for you.") used
               to live at the end of the subhead; it's now folded into
               the headline's claim. -->
          <h1
            class="stagger mt-5 text-white max-w-5xl"
            style="--i:1"
          >
            <span class="display-sans block text-4xl sm:text-5xl lg:text-6xl text-balance">
              Agents render your UI, <span class="display-serif">not paragraphs</span>.
            </span>
          </h1>

          <p
            class="stagger mt-5 text-lg sm:text-xl text-[var(--color-text-muted,#C4C4C8)] max-w-2xl leading-relaxed"
            style="--i:2"
          >
            GenicUI is the protocol that turns a chat into your product. An agent calls one MCP tool — <code class="font-mono text-base sm:text-lg text-violet-300/90">render_component</code> — and your real React, Vue, or Web Component renders inline, in any surface that can host a message thread.
          </p>

          <!-- Sleak install header — primary action sits above secondary CTAs.
               Single command, copy-to-clipboard, pairs a code-style chip with
               a docs link. No fake telemetry, no multi-runner comparison. -->
          <div class="stagger mt-8 w-full max-w-xl mx-auto" style="--i:3">
            <div class="install-pill">
              <span class="install-prompt" aria-hidden="true">$</span>
              <code class="install-command">bun add @genicui/core @genicui/server</code>
              <button
                type="button"
                class="install-copy"
                aria-label="Copy install command to clipboard"
                data-copy="bun add @genicui/core @genicui/server"
                @click="copyInstall"
              >
                <UIcon v-if="!copied" name="i-lucide-copy" class="size-3.5" />
                <UIcon v-else name="i-lucide-check" class="size-3.5 text-emerald-400" />
              </button>
            </div>
          </div>

          <div class="stagger mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style="--i:4">
            <NuxtLink to="/getting-started/quickstart" class="hero-link">
              <UIcon name="i-lucide-book-open" class="size-3.5" />
              Quickstart guide
              <UIcon name="i-lucide-arrow-right" class="size-3 hero-link-arrow" />
            </NuxtLink>
            <NuxtLink to="/getting-started/installation" class="hero-link">
              <UIcon name="i-lucide-package" class="size-3.5" />
              npm · pnpm · yarn
            </NuxtLink>
            <a
              href="https://github.com/vaah-ai/GenicUI"
              target="_blank"
              rel="noopener"
              class="hero-link"
            >
              <UIcon name="i-simple-icons-github" class="size-3.5" />
              View on GitHub
            </a>
          </div>

          <div class="stagger mt-10 flex items-center gap-6 text-xs font-mono text-[var(--color-text-muted)]" style="--i:4">
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-circle-check" class="size-3.5 text-emerald-400" />
              Apache-2.0-licensed
            </span>
            <span class="w-px h-3 bg-white/10" />
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-circle-check" class="size-3.5 text-emerald-400" />
              Zero-config runtime
            </span>
            <span class="w-px h-3 bg-white/10" />
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-circle-check" class="size-3.5 text-emerald-400" />
              Framework-agnostic
            </span>
          </div>
          </div>

          <!-- Right column at lg+: the 4-surface composite. Below lg: stacks
               below the text column. -->
          <div class="w-full lg:col-span-7">
          <!-- 4-surface composite — hero proof-of-claim visual.
               Four real product surface chromes (chat / IDE / browser
               extension / in-app sidebar) fanned at different angles.
               IDE editor on top (+4deg, z-50). Cards are positioned
               via grid areas so each one lives in a distinct quadrant
               of the composite — no overlap. Mobile collapses to a
               single centred IDE card. The `render_component` chip
               floats between IDE (source) and Chat (target). -->
          <div class="stagger mt-12 sm:mt-14 w-full max-w-5xl mx-auto" style="--i:5">
            <div class="surface-stack relative h-[420px] sm:h-[440px] lg:h-[440px] mx-auto" style="max-width: 920px;">

              <!-- Chat panel — top-left quadrant -->
              <div
                class="surface-card hidden md:block"
                style="left: 0; top: 4%; width: 42%; z-index: 30; transform: rotate(-3deg) translateZ(0);"
              >
                <div class="glass-card rounded-2xl overflow-hidden border-t-4 border-violet-400/60">
                  <div class="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-black/30">
                    <span class="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span class="font-mono text-[10px] uppercase tracking-widest text-white/50">chat · claude</span>
                  </div>
                  <div class="p-3 space-y-2">
                    <div class="flex items-start gap-2 justify-end">
                      <div class="rounded-xl rounded-tr-sm bg-white/10 px-2.5 py-1 text-[10px] sm:text-[11px] text-white max-w-[80%]">
                        show me cart + SUMMER25
                      </div>
                      <div class="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500/40 to-pink-500/40 shrink-0" />
                    </div>
                    <div class="flex items-start gap-2">
                      <UIcon name="i-lucide-sparkles" class="size-3.5 text-blue-300 mt-1 shrink-0" />
                      <div class="rounded-xl rounded-tl-sm bg-blue-500/15 border border-blue-400/20 px-2.5 py-1 text-[10px] sm:text-[11px] text-white/90">
                        Cart rendered · coupon applied
                      </div>
                    </div>
                    <!-- mini CartViewer -->
                    <div class="rounded-md border border-white/[0.08] bg-black/40 p-2 mt-1.5">
                      <div class="flex items-center justify-between mb-1.5">
                        <UIcon name="i-lucide-shopping-cart" class="size-3 text-blue-300" />
                        <span class="text-[9px] font-mono text-emerald-400">$349.80</span>
                      </div>
                      <div class="space-y-1 text-[9px]">
                        <div class="flex items-center justify-between"><span class="text-white/70">Linen jacket</span><span class="font-mono text-white/85">$148</span></div>
                        <div class="flex items-center justify-between"><span class="text-white/70">Cotton tee</span><span class="font-mono text-white/85">$32</span></div>
                        <div class="flex items-center justify-between"><span class="text-white/70">Weekender</span><span class="font-mono text-white/85">$184</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- IDE editor — center-right, on top +4deg, z-50. Offset
                   right so it doesn't sit dead-centre and overlap chat. -->
              <div
                class="surface-card hidden md:block"
                style="left: 22%; top: 0; width: 56%; z-index: 50; transform: rotate(2deg) translateZ(60px);"
              >
                <div class="code-window">
                  <div class="code-window-header">
                    <span class="code-window-dot red" />
                    <span class="code-window-dot amber" />
                    <span class="code-window-dot green" />
                    <span class="code-window-title">cart-viewer.tsx · registry.json</span>
                    <UIcon name="i-lucide-ellipsis" class="size-3 text-white/40" />
                  </div>
                  <div class="p-3 sm:p-4 font-mono text-[10px] sm:text-xs leading-relaxed text-white/85">
                    <div class="flex gap-3 sm:gap-4">
                      <!-- file tree -->
                      <div class="hidden lg:block w-28 shrink-0 border-r border-white/[0.06] pr-3">
                        <div class="text-[10px] uppercase tracking-widest text-white/30 mb-2">registry</div>
                        <div class="space-y-1 text-white/55">
                          <div class="flex items-center gap-1.5"><UIcon name="i-lucide-folder" class="size-3 text-blue-300" /> components</div>
                          <div class="flex items-center gap-1.5 pl-3"><UIcon name="i-lucide-file-code" class="size-3 text-emerald-300" /> CartViewer</div>
                          <div class="flex items-center gap-1.5 pl-3"><UIcon name="i-lucide-file-code" class="size-3 text-violet-300" /> TicketCard</div>
                          <div class="flex items-center gap-1.5 pl-3"><UIcon name="i-lucide-file-code" class="size-3 text-amber-300" /> ClaimForm</div>
                        </div>
                      </div>
                      <!-- editor + terminal -->
                      <div class="flex-1 min-w-0">
                        <div class="space-y-0.5 mb-3">
                          <div><span class="text-violet-400">export const</span> <span class="text-blue-300">registry</span> = {'{'}</div>
                          <div class="pl-3"><span class="text-emerald-300">"CartViewer"</span>: {'{'}<span class="text-amber-200">"schema"</span>: <span class="text-violet-300">PrimeVue</span>{'}'},</div>
                          <div class="pl-3"><span class="text-emerald-300">"TicketCard"</span>: {'{'}<span class="text-amber-200">"schema"</span>: <span class="text-violet-300">Form</span>{'}'},</div>
                          <div class="pl-3"><span class="text-emerald-300">"KpiDashboard"</span>: {'{'}<span class="text-amber-200">"schema"</span>: <span class="text-violet-300">Chart</span>{'}'}</div>
                          <div>{'}'};</div>
                        </div>
                        <div class="rounded-md bg-black/60 border border-emerald-500/20 px-2.5 py-1.5 flex items-center gap-2">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 landing-pulse" />
                          <span class="text-emerald-300 truncate">$ render_component CartViewer</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Browser extension popup — middle-right, +2deg, z-20 -->
              <div
                class="surface-card hidden lg:block"
                style="right: 0; top: 8%; width: 26%; z-index: 20; transform: rotate(4deg) translateZ(0);"
              >
                <div class="glass-card rounded-2xl overflow-hidden border-t-4 border-blue-400/60">
                  <div class="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-black/30">
                    <UIcon name="i-lucide-chrome" class="size-3 text-blue-300" />
                    <span class="font-mono text-[10px] text-white/50 truncate flex-1">amazon.com/cart</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div class="p-3">
                    <div class="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-2">genicui · sidebar</div>
                    <div class="rounded-md bg-white/[0.03] border border-white/[0.08] p-2">
                      <div class="text-[10px] text-white/85 font-medium mb-1">Your cart</div>
                      <div class="text-[9px] text-white/55 mb-1.5">3 items · $349.80</div>
                      <button class="w-full rounded-md bg-white text-black text-[10px] font-medium py-1">Apply SUMMER25</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- In-app sidebar — bottom-left, -2deg, z-40 -->
              <div
                class="surface-card hidden md:block"
                style="left: 4%; bottom: 0; width: 42%; z-index: 40; transform: rotate(-1deg) translateZ(10px);"
              >
                <div class="glass-card rounded-2xl overflow-hidden border-t-4 border-amber-400/60">
                  <div class="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-black/30">
                    <UIcon name="i-lucide-layout-dashboard" class="size-3 text-amber-300" />
                    <span class="font-mono text-[10px] text-white/50">dashboard · in-app</span>
                  </div>
                  <div class="flex">
                    <div class="w-14 border-r border-white/[0.06] py-2 px-1.5 space-y-1 text-[9px] text-white/50">
                      <div class="rounded bg-white/[0.08] px-1.5 py-1 text-white/85">Reports</div>
                      <div class="px-1.5 py-1">Customers</div>
                      <div class="px-1.5 py-1">Billing</div>
                      <div class="px-1.5 py-1">Settings</div>
                    </div>
                    <div class="flex-1 p-2.5">
                      <div class="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1">weekly revenue</div>
                      <div class="text-base text-white font-mono leading-none mb-1">$48.2k</div>
                      <div class="text-[9px] text-emerald-300 font-mono mb-1.5">+12.4% wow</div>
                      <!-- mini sparkline -->
                      <svg viewBox="0 0 100 28" class="w-full h-7" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#10B981" stop-opacity="0.45" />
                            <stop offset="100%" stop-color="#10B981" stop-opacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,20 L15,18 L30,19 L45,14 L60,11 L75,9 L90,6 L100,5 L100,28 L0,28 Z" fill="url(#heroSpark)" />
                        <path d="M0,20 L15,18 L30,19 L45,14 L60,11 L75,9 L90,6 L100,5" fill="none" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Animated render_component chip — floats in the seam
                   between chat (top-left) and IDE (right). Visually
                   "travels" from IDE source to Chat target. -->
              <div
                class="hero-chip absolute top-[30%] left-[36%] hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-violet-400/40 backdrop-blur-md font-mono text-[10px] text-violet-200 z-[60]"
              >
                <UIcon name="i-lucide-zap" class="size-3 text-amber-300" />
                render_component
              </div>

            </div>
          </div>
          </div>
        </div>
      </div>
    </section>

    <!-- USE CASES — what you actually build with GenicUI -->
    <section class="relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div class="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
          <p class="font-mono text-xs tracking-[0.2em] uppercase text-[var(--color-accent-blue)] mb-3">
            What you build
          </p>
          <h2 class="display-sans text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            From <span class="display-serif">"let me check"</span><br class="hidden sm:block"> to a real, working UI.
          </h2>
          <p class="mt-4 text-base text-[var(--color-text-muted,#A1A1AA)] max-w-2xl mx-auto">
            Today, an agent tells the user <em>"I've pulled up your cart"</em> and shows a paragraph. With GenicUI, the agent renders the actual cart — interactive, connected, owned by your library. Pick a flow.
          </p>
        </div>

        <!--
          Case studies — tabbed.

          Why tabs: with all four stitched-chat blocks stacked, the section
          was ~3200px tall and pushed the bento grid and the rest of the page
          well below the fold. Tabs compress the surface area to one active
          case at a time so the visitor sees the breadth (4 environments) at
          a glance and can drill into any one of them.

          Why stacked (not side-by-side): the previous 5-column grid left an
          empty right column below the chat panel whenever the intro column
          was shorter than the chat (UC03's KpiDashboard is ~720px tall;
          UC01's intro paragraph is ~250px). Stacking intro above a
          full-width chat removes that dead space.

          Why max-w-3xl (~768px): with the section header centered on a
          1280px page, the chat panel was reading 1280px wide too — the cart
          rows in UC01 felt sparse, the KPIs in UC03 had too much horizontal
          space between them, and the eye lost the chat-as-narrative thread.
          768px is the canonical "comfortable reading column" width from the
          Bringhurst / Lupton type-scale tables; it keeps each chat turn as
          one or two lines of natural prose and gives the panel chrome room
          to breathe without the surface feeling empty. The outer section
          stays at max-w-7xl so the dark backdrop extends to the viewport
          edges, and the column sits as a focused island.

          Accessibility: pill buttons are real <button> elements with role="tab",
          a labelled tablist parent, and ArrowLeft/ArrowRight/End/Home keyboard
          nav matching the WAI-ARIA tabs pattern. Focus follows selection on
          arrow keys (nextTick + tabRefs.focus()), so the visible focus ring
          always sits on the active tab. The active panel uses role="tabpanel"
          with id wired so AT can announce the switch.

          Per-case markup stays inline (not v-html) so the visual fidelity
          of the original stitched-chat designs is preserved verbatim —
          only the framing (eyebrow + headline + paragraph above, 3-turn
          thread below) is collapsed into a single surface that swaps on
          tab activation.
        -->
        <div class="max-w-3xl mx-auto">
        <div
          role="tablist"
          aria-label="Case studies"
          class="flex flex-wrap items-center justify-center gap-2 pb-1 mb-6"
        >
          <button
            v-for="(item, i) in caseTabs"
            :key="item.id"
            :ref="el => { if (el) tabRefs[i] = el as HTMLButtonElement }"
            type="button"
            role="tab"
            :id="`case-tab-${item.id}`"
            :aria-selected="activeCase === i"
            :aria-controls="`case-panel-${item.id}`"
            :tabindex="activeCase === i ? 0 : -1"
            class="shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium font-mono uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            :class="activeCase === i
              ? `bg-white/[0.06] border-white/20 text-white ${item.activeText}`
              : 'border-white/10 text-[var(--color-text-muted)] hover:text-white hover:border-white/15'"
            @click="activeCase = i"
            @keydown="onCaseKeydown($event, i)"
          >
            <span
              class="inline-block size-1.5 rounded-full"
              :class="item.dotClass"
              aria-hidden="true"
            />
            <span class="text-[10px] tracking-[0.18em] text-white/40">0{{ i + 1 }}</span>
            <span>{{ item.shortLabel }}</span>
          </button>
        </div>

        <!-- Intro banner — single row, eyebrow + headline + 1-line blurb.
             Tightened from the previous 6-line paragraph block so the
             section's vertical real estate goes to the chat, not the copy. -->
        <div class="mb-5 space-y-3 text-center">
          <div class="flex items-center justify-center gap-3">
            <span
              class="font-mono text-[10px] tracking-[0.2em] uppercase"
              :class="caseTabs[activeCase].eyebrowClass"
            >
              Use case 0{{ activeCase + 1 }}
            </span>
            <span class="h-px w-8 bg-white/10" />
            <span class="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
              {{ caseTabs[activeCase].category }}
            </span>
          </div>
          <template v-for="(item, i) in caseTabs" :key="`intro-${item.id}`">
            <div v-show="activeCase === i" class="space-y-2">
              <h3 class="display-sans text-xl sm:text-2xl text-white" v-html="item.headline" />
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed mx-auto max-w-xl" v-html="item.body" />
            </div>
          </template>
        </div>

        <!-- Themed chat surface — full width. One panel per case; only the
             active one is visible. Switching keeps the same outer
             rounded-2xl + accent top-border so the four cases read
             as one family with environment-specific chrome. -->
        <div class="space-y-3">
          <template v-for="(item, i) in caseTabs" :key="`panel-${item.id}`">
            <div
              v-show="activeCase === i"
              role="tabpanel"
              :id="`case-panel-${item.id}`"
              :aria-labelledby="`case-tab-${item.id}`"
              :class="['rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden border-t-4', item.topBorderClass]"
            >
              <!-- Chrome header (varies per environment) -->
              <component :is="item.header" />

              <!-- Three-turn thread -->
              <component :is="item.thread" />
            </div>
          </template>

          <!-- Tab nav controls (mobile-friendly) -->
          <div class="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono text-[var(--color-text-muted)] hover:text-white transition"
              @click="prevCase"
            >
              <UIcon name="i-lucide-arrow-left" class="size-3" />
              <span>previous</span>
            </button>
            <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              {{ activeCase + 1 }} / {{ caseCount }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono text-[var(--color-text-muted)] hover:text-white transition"
              @click="nextCase"
            >
              <span>next</span>
              <UIcon name="i-lucide-arrow-right" class="size-3" />
            </button>
          </div>
        </div>
        </div>
      </div>
    </section>

    <!-- The contract — bento grid (technical primitives) -->
    <section class="relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div class="max-w-4xl mx-auto text-center mb-16 sm:mb-20">
          <p class="font-mono text-xs tracking-[0.2em] uppercase text-[var(--color-accent-blue)] mb-4">
            The contract
          </p>
          <h2 class="display-sans text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight">
            Six primitives. <span class="display-serif">Compose them</span> however you like.
          </h2>
          <p class="mt-6 text-lg text-[var(--color-text-muted,#A1A1AA)] max-w-2xl mx-auto">
            The above is what your users see. The below is what your team wires up once — the protocol every use case is built on.
          </p>
        </div>

        <div class="bento-grid">
          <!-- MCP-native — wide -->
          <div class="bento-wide stagger" style="--i:0">
            <div class="glass-card p-8 sm:p-10 lg:p-12 flex flex-col h-full">
              <div class="flex items-start justify-between mb-6">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
                  <UIcon name="i-simple-icons-modelcontextprotocol" class="text-blue-400 size-6" />
                </div>
                <div class="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">
                  01 / Tooling
                </div>
              </div>
              <h3 class="display-sans text-3xl sm:text-4xl text-white mb-3">
                MCP-native.
              </h3>
              <p class="text-base sm:text-lg text-[var(--color-text-muted,#A1A1AA)] leading-relaxed mb-6 max-w-xl">
                Four standard MCP tools — <code class="text-blue-300/90 font-mono text-[0.95em]">find_ui_component</code>, <code class="text-blue-300/90 font-mono text-[0.95em]">render_component</code>, <code class="text-blue-300/90 font-mono text-[0.95em]">update_component</code>, <code class="text-blue-300/90 font-mono text-[0.95em]">subscribe_to_events</code> — exposed over JSON-RPC. Works with Claude Code, GPT, and any MCP-capable agent.
              </p>
              <div class="mt-auto flex flex-wrap items-center gap-2 text-xs font-mono">
                <span class="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[var(--color-text-muted)]">JSON-RPC 2.0</span>
                <span class="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[var(--color-text-muted)]">streamable-http</span>
                <span class="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[var(--color-text-muted)]">stdio</span>
              </div>
            </div>
          </div>

          <!-- Web Component — narrow -->
          <div class="bento-narrow stagger" style="--i:1">
            <div class="glass-card p-6 sm:p-8 flex flex-col h-full">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mb-6">
                <UIcon name="i-lucide-component" class="text-violet-400 size-6" />
              </div>
              <h3 class="display-sans text-xl sm:text-2xl text-white mb-3">
                Web Component runtime.
              </h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed mb-4">
                <code class="font-mono text-violet-300/90">&lt;genic-element&gt;</code> renders any registry entry inside a closed Shadow DOM. JSON-Patch wires incremental updates.
              </p>
              <code class="text-xs font-mono text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/20 rounded-md px-2 py-1 inline-block w-fit">
                mount &lt; 50ms
              </code>
            </div>
          </div>

          <!-- JSON-Patch — narrow -->
          <div class="bento-narrow stagger" style="--i:2">
            <div class="glass-card p-6 sm:p-8 flex flex-col h-full">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-6">
                <UIcon name="i-lucide-git-merge" class="text-emerald-400 size-6" />
              </div>
              <h3 class="display-sans text-xl sm:text-2xl text-white mb-3">
                JSON-Patch wire format.
              </h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed mb-4">
                Every update is a <a href="https://datatracker.ietf.org/doc/html/rfc6902" class="underline underline-offset-2 hover:text-emerald-300">RFC 6902</a> operation — diffs are tiny, replay is deterministic.
              </p>
              <code class="text-xs font-mono text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/20 rounded-md px-2 py-1 inline-block w-fit">
                Last-Event-ID resume
              </code>
            </div>
          </div>

          <!-- Registry-agnostic — narrow -->
          <div class="bento-narrow stagger" style="--i:3">
            <div class="glass-card p-6 sm:p-8 flex flex-col h-full">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center mb-6">
                <UIcon name="i-lucide-layers" class="text-amber-400 size-6" />
              </div>
              <h3 class="display-sans text-xl sm:text-2xl text-white mb-3">
                Registry-agnostic.
              </h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed">
                Local files, remote URLs, tiered allow-lists. Register PrimeVue today, swap for Mantine tomorrow — the agent sees the same contract.
              </p>
            </div>
          </div>

          <!-- Trust boundary — narrow -->
          <div class="bento-narrow stagger" style="--i:4">
            <div class="glass-card p-6 sm:p-8 flex flex-col h-full">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-white/10 flex items-center justify-center mb-6">
                <UIcon name="i-lucide-shield-check" class="text-rose-400 size-6" />
              </div>
              <h3 class="display-sans text-xl sm:text-2xl text-white mb-3">
                Trust boundary.
              </h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed">
                Server-validated prop shapes, action allow-lists, tier system for remote registries. No untrusted component ever reaches the user.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- What's next — 3-step path. Nuxt-style: each step is a glass
         card with a coloured left border, a step index, the literal
         command the visitor runs, and a one-line description. A single
         primary CTA below the cards closes the loop. -->
    <section class="relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div class="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <p class="font-mono text-xs tracking-[0.2em] uppercase text-[var(--color-accent-violet)] mb-4">
            What's next
          </p>
          <h2 class="display-sans text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight mb-6">
            Ship your UI in any agentic surface,<br class="hidden sm:block">
            <span class="display-serif">in fifteen minutes.</span>
          </h2>
          <p class="text-lg text-[var(--color-text-muted,#C4C4C8)] max-w-2xl mx-auto">
            Install once. Render in chat. Render in your IDE assistant. Render in Slack. Render in the browser extension. The contract is the same — one MCP tool, one component, one protocol. Three steps below.
          </p>
        </div>

        <ol class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
          <li>
            <NuxtLink
              to="/getting-started/installation"
              class="group block h-full rounded-2xl glass-card p-6 sm:p-7 border-l-2 border-l-violet-400/70 transition-all duration-500 hover:translate-y-[-2px]"
            >
              <div class="flex items-start justify-between mb-5">
                <span class="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">Step 01</span>
                <UIcon name="i-lucide-package" class="size-4 text-violet-300/80" />
              </div>
              <div class="rounded-lg bg-black/40 border border-white/[0.06] px-3 py-2 mb-4 font-mono text-[0.78rem] text-emerald-300/90 overflow-hidden text-ellipsis whitespace-nowrap">
                bun add @genicui/core @genicui/server
              </div>
              <h3 class="display-sans text-lg text-white mb-1.5">Install the packages.</h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed">
                Two packages, one command, zero peer-deps. Works with bun, npm, pnpm, yarn.
              </p>
              <div class="mt-4 inline-flex items-center gap-1.5 text-xs text-violet-300 group-hover:text-white transition-colors">
                <span>Read the install guide</span>
                <UIcon name="i-lucide-arrow-right" class="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/getting-started/quickstart"
              class="group block h-full rounded-2xl glass-card p-6 sm:p-7 border-l-2 border-l-blue-400/70 transition-all duration-500 hover:translate-y-[-2px]"
            >
              <div class="flex items-start justify-between mb-5">
                <span class="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">Step 02</span>
                <UIcon name="i-lucide-sparkles" class="size-4 text-blue-300/80" />
              </div>
              <div class="rounded-lg bg-black/40 border border-white/[0.06] px-3 py-2 mb-4 font-mono text-[0.78rem] text-emerald-300/90 overflow-hidden text-ellipsis whitespace-nowrap">
                bunx @genicui/cli init
              </div>
              <h3 class="display-sans text-lg text-white mb-1.5">Render your first component.</h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed">
                The CLI scaffolds a registry, an MCP server, and a connected agent in 30 seconds.
              </p>
              <div class="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-300 group-hover:text-white transition-colors">
                <span>Follow the quickstart</span>
                <UIcon name="i-lucide-arrow-right" class="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/concepts/architecture"
              class="group block h-full rounded-2xl glass-card p-6 sm:p-7 border-l-2 border-l-emerald-400/70 transition-all duration-500 hover:translate-y-[-2px]"
            >
              <div class="flex items-start justify-between mb-5">
                <span class="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)]">Step 03</span>
                <UIcon name="i-lucide-book-open" class="size-4 text-emerald-300/80" />
              </div>
              <div class="rounded-lg bg-black/40 border border-white/[0.06] px-3 py-2 mb-4 font-mono text-[0.78rem] text-emerald-300/90 overflow-hidden text-ellipsis whitespace-nowrap">
                read /concepts/architecture
              </div>
              <h3 class="display-sans text-lg text-white mb-1.5">Read the contract.</h3>
              <p class="text-sm text-[var(--color-text-muted,#A1A1AA)] leading-relaxed">
                The six primitives every team wires up once. Skim the bento above; deep-dive here.
              </p>
              <div class="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-300 group-hover:text-white transition-colors">
                <span>Architecture overview</span>
                <UIcon name="i-lucide-arrow-right" class="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </NuxtLink>
          </li>
        </ol>

        <div class="mt-12 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          <UButton
            size="xl"
            to="/getting-started/quickstart"
            trailing-icon="i-lucide-arrow-right"
            class="font-medium group"
          >
            <template #trailing>
              <span class="btn-icon-nest">
                <UIcon name="i-lucide-arrow-right" class="size-3.5" />
              </span>
            </template>
            Quickstart — render your first component
          </UButton>
          <a
            href="https://github.com/vaah-ai/GenicUI"
            target="_blank"
            rel="noopener"
            class="hero-link text-sm"
          >
            <UIcon name="i-simple-icons-github" class="size-4" />
            Star on GitHub
            <UIcon name="i-lucide-arrow-up-right" class="size-3 hero-link-arrow" />
          </a>
        </div>

        <!-- Open-source line — kept concise. Apache-2.0, no telemetry, no lock-in. -->
        <p class="mt-10 sm:mt-12 text-center text-xs font-mono text-[var(--color-text-muted)]">
          <span class="text-emerald-400">Apache-2.0</span> · no telemetry · no lock-in · <a href="https://github.com/vaah-ai/GenicUI" target="_blank" rel="noopener" class="underline underline-offset-2 hover:text-white">view the source</a>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Use-case grid: two columns on lg+, single column on small screens.
 * Items are visually offset alternately (left/right) to break monotony
 * and keep the eye moving down the page.
 */
.usecase-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  align-items: start;
}

@media (min-width: 1024px) {
  .usecase-grid {
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
  }
}
</style>
