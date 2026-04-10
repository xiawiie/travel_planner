<template>
  <div class="result-layout" :class="{ 'sidebar-open': drawerOpen }">

    <!-- Mobile overlay -->
    <div v-if="drawerOpen" class="mobile-drawer-overlay" @click="drawerOpen = false" />

    <!-- ═══════════ LEFT SIDEBAR ═══════════ -->
    <aside class="sidebar">

      <!-- Top action bar -->
      <div class="topbar">
        <button class="tbtn" @click="goBack">← 返回</button>
        <div class="topbar-right">
          <template v-if="!editMode">
            <button class="tbtn tbtn--outline" @click="startEdit">✏️ 编辑</button>
            <a-dropdown placement="bottomRight">
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="exportImage">📷 导出图片</a-menu-item>
                  <a-menu-item @click="exportPdf">📄 导出PDF</a-menu-item>
                </a-menu>
              </template>
              <button class="tbtn tbtn--outline">📥 导出 ▾</button>
            </a-dropdown>
          </template>
          <template v-else>
            <button class="tbtn tbtn--primary" @click="saveEdit">💾 保存</button>
            <button class="tbtn tbtn--danger" @click="cancelEdit">✕ 取消</button>
          </template>
        </div>
      </div>

      <!-- Sidebar body -->
      <div v-if="plan" class="sidebar-body">

        <!-- Hero -->
        <header class="hero">
          <div class="hero-bg" aria-hidden="true"></div>
          <div class="hero-veil" aria-hidden="true"></div>
          <div class="hero-content">
            <p class="hero-kicker">旅行计划</p>
            <h1 class="hero-city">{{ plan.city }}</h1>
            <div class="hero-stats">
              <div class="hero-stat">
                <span class="hero-stat-ic" aria-hidden="true">📅</span>
                <div class="hero-stat-text">
                  <span class="hero-stat-label">日期</span>
                  <span class="hero-stat-val">{{ plan.start_date }} → {{ plan.end_date }}</span>
                </div>
              </div>
              <div class="hero-stat">
                <span class="hero-stat-ic" aria-hidden="true">🎯</span>
                <div class="hero-stat-text">
                  <span class="hero-stat-label">景点</span>
                  <span class="hero-stat-val">{{ totalAttractions }} 处</span>
                </div>
              </div>
              <div v-if="plan.budget" class="hero-stat hero-stat--accent">
                <span class="hero-stat-ic" aria-hidden="true">💰</span>
                <div class="hero-stat-text">
                  <span class="hero-stat-label">预估</span>
                  <span class="hero-stat-val">¥{{ formatYuan(plan.budget.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Tab nav -->
        <nav class="tab-nav" aria-label="行程内容切换">
          <div class="tab-nav-inner">
            <button
              v-for="t in TABS"
              :key="t.key"
              type="button"
              class="tab-btn"
              :class="{ active: activeTab === t.key }"
              @click="switchTab(t.key as TabKey)"
            >
              <span class="tab-btn-ic" aria-hidden="true">{{ t.icon }}</span>
              <span class="tab-btn-txt">{{ t.label }}</span>
            </button>
          </div>
        </nav>

        <!-- Tab content -->
        <div ref="scrollEl" class="tab-body">

          <!-- ── 概览 ── -->
          <div v-show="activeTab === 'overview'" class="pane pane--overview stagger">
            <section class="ov-block ov-dates">
              <div class="ov-dates-icon" aria-hidden="true">📅</div>
              <div>
                <h2 class="ov-title">行程日期</h2>
                <p class="ov-dates-range">{{ plan.start_date }} <span class="ov-dates-sep">至</span> {{ plan.end_date }}</p>
              </div>
            </section>

            <section v-if="plan.overall_suggestions" class="ov-block ov-tip">
              <div class="ov-tip-head">
                <span class="ov-tip-badge">💡</span>
                <h2 class="ov-title">整体建议</h2>
              </div>
              <p class="ov-tip-body">{{ plan.overall_suggestions }}</p>
            </section>

            <template v-if="plan.budget">
              <section class="ov-budget-head">
                <h2 class="ov-section-title">预算概览</h2>
                <p class="ov-section-sub">各项支出占比与明细（整数金额，单位：元）</p>
              </section>

              <div class="budget-bars">
                <div
                  v-for="row in budgetWithShare"
                  :key="row.key"
                  class="budget-bar-row"
                >
                  <div class="budget-bar-top">
                    <span class="budget-bar-label"><span class="budget-bar-ic">{{ row.icon }}</span>{{ row.label }}</span>
                    <span class="budget-bar-amt">¥{{ formatYuan(row.val) }}</span>
                  </div>
                  <div class="budget-bar-track">
                    <div
                      class="budget-bar-fill"
                      :class="`budget-bar-fill--${row.key}`"
                      :style="{ width: row.pct + '%' }"
                    />
                  </div>
                  <div class="budget-bar-pct">{{ row.pct }}%</div>
                </div>
              </div>

              <div class="budget-mini-grid">
                <div
                  v-for="row in budgetWithShare"
                  :key="'m-' + row.key"
                  class="budget-mini"
                >
                  <span class="budget-mini-ic">{{ row.icon }}</span>
                  <span class="budget-mini-label">{{ row.label }}</span>
                  <span class="budget-mini-val">¥{{ formatYuan(row.val) }}</span>
                </div>
              </div>

              <div class="budget-total-card">
                <div class="budget-total-left">
                  <span class="budget-total-kicker">合计</span>
                  <span class="budget-total-note">含门票、住宿、餐饮与交通</span>
                </div>
                <div class="budget-total-val">¥{{ formatYuan(plan.budget.total) }}</div>
              </div>
            </template>
          </div>

          <!-- ── 行程 ── -->
          <div v-show="activeTab === 'itinerary'" class="pane">
            <!-- Day pills -->
            <div class="day-pills">
              <button v-for="(d, i) in plan.days" :key="i"
                class="day-pill" :class="{ active: activeDay === i }"
                @click="switchDay(i)"
              >第{{ d.day_index + 1 }}天</button>
            </div>

            <!-- Current day detail -->
            <div v-if="curDay" class="day-detail stagger">
              <!-- Day meta -->
              <div class="day-meta-card">
                <div class="day-meta-date">{{ curDay.date }}</div>
                <div class="day-meta-row" v-if="curDay.description">
                  <span>📝</span><span>{{ curDay.description }}</span>
                </div>
                <div class="day-meta-row">
                  <span>🚗</span><span>{{ curDay.transportation }}</span>
                </div>
                <div class="day-meta-row">
                  <span>🏨</span><span>{{ curDay.accommodation }}</span>
                </div>
              </div>

              <!-- 景点较多时可在 .timeline 上接入虚拟列表以减轻 DOM 压力 -->
              <div class="section-label" style="margin-top:16px">🎯 景点安排</div>
              <div class="timeline">
                <div
                  v-for="(attr, idx) in curDay.attractions"
                  :key="attr.name + idx"
                  :ref="el => setRef(el, activeDay, idx)"
                  class="titem"
                  :class="{ 'titem--focus': focused?.d === activeDay && focused?.a === idx }"
                  :data-d="activeDay"
                  :data-a="idx"
                  @click="onAttrClick(activeDay, idx)"
                >
                  <div class="tdot" :class="{ 'tdot--focus': focused?.d === activeDay && focused?.a === idx }">
                    {{ idx + 1 }}
                  </div>
                  <div class="attr-card">
                    <!-- Image -->
                    <div class="attr-img-wrap">
                      <img :src="imgFor(attr.name, idx)" :alt="attr.name"
                        class="attr-img" loading="lazy" @error="onImgErr" />
                      <div v-if="attr.ticket_price" class="attr-price">¥{{ attr.ticket_price }}</div>
                      <div class="attr-map-hint">🗺️ 查看地图</div>
                    </div>
                    <div class="attr-body">
                      <div class="attr-name">{{ attr.name }}</div>

                      <!-- Edit mode -->
                      <template v-if="editMode">
                        <div class="edit-label">地址</div>
                        <a-input v-model:value="attr.address" size="small" style="margin-bottom:6px" />
                        <div class="edit-label">游览时长（分钟）</div>
                        <a-input-number v-model:value="attr.visit_duration" :min="10" :max="480" size="small" style="width:100%;margin-bottom:6px" />
                        <div class="edit-label">描述</div>
                        <a-textarea v-model:value="attr.description" :rows="2" size="small" style="margin-bottom:6px" />
                        <div class="edit-actions">
                          <a-button size="small" :disabled="idx===0" @click.stop="mvAttr(activeDay,idx,'up')">↑</a-button>
                          <a-button size="small" :disabled="idx===curDay.attractions.length-1" @click.stop="mvAttr(activeDay,idx,'down')">↓</a-button>
                          <a-button size="small" danger @click.stop="rmAttr(activeDay,idx)">🗑️</a-button>
                        </div>
                      </template>

                      <!-- View mode -->
                      <template v-else>
                        <div class="attr-meta">
                          <span>📍 {{ attr.address }}</span>
                          <span>⏱ {{ attr.visit_duration }}分钟</span>
                          <span v-if="attr.rating">⭐ {{ attr.rating }}</span>
                        </div>
                        <div class="attr-desc">{{ attr.description }}</div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hotel -->
              <template v-if="curDay.hotel">
                <div class="section-label" style="margin-top:20px">🏨 住宿推荐</div>
                <div class="hotel-card">
                  <div class="hotel-name">{{ curDay.hotel.name }}</div>
                  <div class="hotel-grid">
                    <span class="mkey">地址</span><span>{{ curDay.hotel.address }}</span>
                    <span class="mkey">类型</span><span>{{ curDay.hotel.type }}</span>
                    <span class="mkey">价格</span><span>{{ curDay.hotel.price_range }}</span>
                    <span class="mkey">评分</span><span>{{ curDay.hotel.rating }}⭐</span>
                  </div>
                </div>
              </template>

              <!-- Meals -->
              <div class="section-label" style="margin-top:20px">🍽️ 餐饮安排</div>
              <div class="meal-list">
                <div v-for="m in curDay.meals" :key="m.type" class="meal-item">
                  <span class="meal-type">{{ mealLabel(m.type) }}</span>
                  <div>
                    <div class="meal-name">{{ m.name }}</div>
                    <div v-if="m.description" class="meal-desc">{{ m.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── 预算 ── -->
          <div v-show="activeTab === 'budget'" class="pane pane--budget stagger">
            <template v-if="plan.budget">
              <p class="ov-section-sub ov-section-sub--solo">各分类支出与合计（整数）</p>
              <div class="budget-grid budget-grid--page">
                <div
                  v-for="b in budgetWithShare"
                  :key="b.key"
                  class="budget-cell budget-cell--lg"
                >
                  <div class="budget-cell-icon">{{ b.icon }}</div>
                  <div class="budget-cell-label">{{ b.label }}</div>
                  <div class="budget-cell-val">¥{{ formatYuan(b.val) }}</div>
                  <div class="budget-cell-pct">占总额 {{ b.pct }}%</div>
                </div>
              </div>
              <div class="budget-total-card budget-total-card--tab">
                <div class="budget-total-left">
                  <span class="budget-total-kicker">预估总费用</span>
                </div>
                <div class="budget-total-val">¥{{ formatYuan(plan.budget.total) }}</div>
              </div>
            </template>
            <div v-else class="app-empty-panel">
              <a-empty description="暂无预算数据" />
            </div>
          </div>

          <!-- ── 天气 ── -->
          <div v-show="activeTab === 'weather'" class="pane stagger">
            <template v-if="plan.weather_info?.length">
              <div v-for="w in plan.weather_info" :key="w.date" class="weather-card">
                <div class="weather-date">{{ w.date }}</div>
                <div class="weather-body">
                  <div class="weather-row"><span>☀️</span><div><div class="weather-sub">白天</div><div class="weather-val">{{ w.day_weather }} {{ w.day_temp }}°C</div></div></div>
                  <div class="weather-row"><span>🌙</span><div><div class="weather-sub">夜间</div><div class="weather-val">{{ w.night_weather }} {{ w.night_temp }}°C</div></div></div>
                  <div class="weather-wind">💨 {{ w.wind_direction }} {{ w.wind_power }}</div>
                </div>
              </div>
            </template>
            <div v-else class="app-empty-panel">
              <a-empty description="暂无天气数据" />
            </div>
          </div>

        </div><!-- /tab-body -->
      </div><!-- /sidebar-body -->

      <!-- Empty state -->
      <div v-else class="sidebar-empty app-empty-panel">
        <a-empty description="暂无行程数据，请先规划">
          <template #image><div style="font-size:60px">🗺️</div></template>
          <a-button type="primary" @click="goBack">返回首页</a-button>
        </a-empty>
      </div>
    </aside>

    <!-- ═══════════ RIGHT MAP ═══════════ -->
    <main class="map-pane">
      <div id="result-map" class="map-fill"></div>

      <!-- Weather overlay (map top-right) -->
      <transition name="weather-slide">
        <div v-if="curWeather && activeTab === 'itinerary'" class="weather-overlay">
          <div class="wo-date">{{ curWeather.date }}</div>
          <div class="wo-body">
            <div class="wo-row"><span>☀️</span><div><div class="wo-sub">白天</div><div class="wo-val">{{ curWeather.day_weather }} {{ curWeather.day_temp }}°C</div></div></div>
            <div class="wo-row"><span>🌙</span><div><div class="wo-sub">夜间</div><div class="wo-val">{{ curWeather.night_weather }} {{ curWeather.night_temp }}°C</div></div></div>
            <div class="wo-wind">💨 {{ curWeather.wind_direction }} {{ curWeather.wind_power }}</div>
          </div>
        </div>
      </transition>

      <!-- Day legend (map bottom-left) -->
      <div v-if="plan && activeTab === 'itinerary'" class="day-legend">
        <button v-for="(d,i) in plan.days" :key="i"
          class="day-legend-btn" :class="{ active: activeDay === i }"
          @click="switchDay(i)"
        >第{{ d.day_index + 1 }}天</button>
      </div>
    </main>

    <!-- Mobile FAB -->
    <button class="fab" @click="drawerOpen = !drawerOpen">
      {{ drawerOpen ? '✕' : '🗺️' }}
    </button>

    <!-- Back to top -->
    <a-back-top :target="backTopTarget" :visibility-height="200">
      <div class="back-top">↑</div>
    </a-back-top>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import type { TripPlan } from '@/types'

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let id: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (id) clearTimeout(id)
    id = setTimeout(() => {
      id = undefined
      fn(...args)
    }, wait)
  }
}

// ─── types ───────────────────────────────
type TabKey = 'overview' | 'itinerary' | 'budget' | 'weather'

const TABS = [
  { key: 'overview',  icon: '📋', label: '概览'  },
  { key: 'itinerary', icon: '📅', label: '行程'  },
  { key: 'budget',    icon: '💰', label: '预算'  },
  { key: 'weather',   icon: '🌤️', label: '天气' },
]

// ─── state ───────────────────────────────
const router    = useRouter()
const plan      = ref<TripPlan | null>(null)
const editMode  = ref(false)
const backup    = ref<TripPlan | null>(null)
const photos    = ref<Record<string, string>>({})
const activeTab = ref<TabKey>('overview')
const activeDay = ref(0)
const drawerOpen = ref(false)
const scrollEl  = ref<HTMLElement | null>(null)
const focused   = ref<{ d: number; a: number } | null>(null)

// ─── map internals ──────────────────────
let map: any = null
let AMap: any = null
let mapResizeObserver: ResizeObserver | null = null
let fitDayTimer: ReturnType<typeof setTimeout> | null = null
const markers:   Record<string, any> = {}
const infoWins:  Record<string, any> = {}
const polylines: Record<number, any> = {}
const cardRefs:  Record<string, HTMLElement> = {}
let observer: IntersectionObserver | null = null

// ─── computed ───────────────────────────
const curDay = computed(() => plan.value?.days[activeDay.value] ?? null)

const totalAttractions = computed(() =>
  plan.value?.days.reduce((n, d) => n + d.attractions.length, 0) ?? 0
)

const curWeather = computed(() => {
  if (!plan.value?.weather_info?.length) return null
  return plan.value.weather_info[activeDay.value] ?? plan.value.weather_info[0]
})

/** 金额格式化为整数并加分位 */
function formatYuan(v: unknown): string {
  const n = Math.round(Number(v) || 0)
  return n.toLocaleString('zh-CN')
}

type BudgetRow = {
  key: string
  icon: string
  label: string
  val: number
  pct: number
}

const budgetWithShare = computed((): BudgetRow[] => {
  const b = plan.value?.budget
  if (!b) return []
  const totalRaw = Math.max(0, Math.round(Number(b.total) || 0))
  const denom = totalRaw > 0 ? totalRaw : 1
  const rows: Omit<BudgetRow, 'pct'>[] = [
    { key: 'attr', icon: '🎫', label: '景点门票', val: Math.round(Number(b.total_attractions) || 0) },
    { key: 'hotel', icon: '🏨', label: '酒店住宿', val: Math.round(Number(b.total_hotels) || 0) },
    { key: 'meal', icon: '🍜', label: '餐饮费用', val: Math.round(Number(b.total_meals) || 0) },
    { key: 'trans', icon: '🚇', label: '交通费用', val: Math.round(Number(b.total_transportation) || 0) },
  ]
  return rows.map((r) => ({
    ...r,
    pct: totalRaw > 0 ? Math.min(100, Math.round((r.val / denom) * 100)) : 0,
  }))
})

// ─── lifecycle ──────────────────────────
onMounted(async () => {
  const raw = sessionStorage.getItem('tripPlan')
  if (raw) {
    plan.value = JSON.parse(raw)
    await loadPhotos()
    await nextTick()
    await initMap()
    await nextTick()
    setupObserver()
  }
})

onUnmounted(() => {
  if (fitDayTimer) clearTimeout(fitDayTimer)
  mapResizeObserver?.disconnect()
  mapResizeObserver = null
  if (map) map.destroy()
  if (observer) observer.disconnect()
})

// ─── navigation ─────────────────────────
const goBack = () => router.push('/')

function backTopTarget() {
  return scrollEl.value ?? document.body
}

function switchTab(key: TabKey) {
  activeTab.value = key
  if (key === 'itinerary') {
    nextTick(() => highlightDay(activeDay.value))
  } else {
    resetHighlight()
  }
}

function switchDay(i: number) {
  activeDay.value = i
  focused.value = null
  highlightDay(i)
  // Re-observe after day switch (new DOM elements)
  nextTick(() => {
    if (observer) observer.disconnect()
    setupObserver()
  })
}

// ─── edit ───────────────────────────────
function startEdit() {
  backup.value = JSON.parse(JSON.stringify(plan.value))
  editMode.value = true
  message.info('进入编辑模式')
}
function saveEdit() {
  editMode.value = false
  if (plan.value) sessionStorage.setItem('tripPlan', JSON.stringify(plan.value))
  message.success('修改已保存')
  nextTick(() => { rebuildMap() })
}
function cancelEdit() {
  if (backup.value) plan.value = JSON.parse(JSON.stringify(backup.value))
  editMode.value = false
  message.info('已取消编辑')
}

function rmAttr(di: number, ai: number) {
  const day = plan.value?.days[di]
  if (!day) return
  if (day.attractions.length <= 1) { message.warning('每天至少保留一个景点'); return }
  day.attractions.splice(ai, 1)
}
function mvAttr(di: number, ai: number, dir: 'up' | 'down') {
  const attrs = plan.value?.days[di]?.attractions
  if (!attrs) return
  if (dir === 'up' && ai > 0)
    [attrs[ai], attrs[ai - 1]] = [attrs[ai - 1], attrs[ai]]
  else if (dir === 'down' && ai < attrs.length - 1)
    [attrs[ai], attrs[ai + 1]] = [attrs[ai + 1], attrs[ai]]
}

// ─── helpers ────────────────────────────
const mealLabel = (t: string) =>
  ({ breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍵 小吃' }[t] ?? t)

const setRef = (el: any, d: number, a: number) => {
  if (el) cardRefs[`${d}-${a}`] = el as HTMLElement
}

// ─── photos ─────────────────────────────
async function loadPhotos() {
  if (!plan.value) return
  const tasks: Promise<void>[] = []
  plan.value.days.forEach(day =>
    day.attractions.forEach(attr => {
      tasks.push(
        fetch(`http://localhost:8000/api/poi/photo?name=${encodeURIComponent(attr.name)}`)
          .then(r => r.json())
          .then(d => { if (d.success && d.data?.photo_url) photos.value[attr.name] = d.data.photo_url })
          .catch(() => {})
      )
    })
  )
  await Promise.allSettled(tasks)
}

function imgFor(name: string, idx: number): string {
  if (photos.value[name]) return photos.value[name]
  const colors = [
    ['#0891B2', '#0C4A6E'], ['#0E7490', '#164E63'],
    ['#0369A1', '#1E3A5F'], ['#7C3AED', '#4C1D95'],
    ['#10B981', '#064E3B'],
  ]
  const [s, e] = colors[idx % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${s}"/><stop offset="100%" stop-color="${e}"/>
    </linearGradient></defs>
    <rect width="400" height="200" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-size="18" font-weight="bold" fill="rgba(255,255,255,0.92)" font-family="sans-serif">${name}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

function onImgErr(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="%23E2E8F0"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394A3B8" font-size="14" font-family="sans-serif">加载失败</text></svg>`
}

// ─── interaction ────────────────────────
function onAttrClick(d: number, a: number) {
  if (editMode.value) return
  focused.value = { d, a }
  flyTo(d, a)
  openIW(d, a)
}

function flyTo(d: number, a: number) {
  if (!map) return
  const attr = plan.value?.days[d]?.attractions[a]
  if (!attr?.location?.longitude) return
  map.setZoomAndCenter(15, [attr.location.longitude, attr.location.latitude], false, 500)
  // Bounce marker
  const key = `${d}-${a}`
  const mk = markers[key]
  if (mk) {
    mk.setContent(mkContent(a + 1, true, true))
    setTimeout(() => mk.setContent(mkContent(a + 1, true, false)), 500)
  }
}

function openIW(d: number, a: number) {
  const key = `${d}-${a}`
  Object.values(infoWins).forEach(w => w.close())
  if (infoWins[key] && markers[key]) {
    infoWins[key].open(map, markers[key].getPosition())
  }
}

function scrollToAttr(d: number, a: number) {
  const el = cardRefs[`${d}-${a}`]
  if (el && scrollEl.value) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// ─── map ────────────────────────────────
async function initMap() {
  try {
    AMap = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_WEB_JS_KEY,
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.InfoWindow'],
    })
    map = new AMap.Map('result-map', {
      zoom: 12,
      center: [116.397128, 39.916527],
      mapStyle: 'amap://styles/whitesmoke',
    })
    const mapEl = document.getElementById('result-map')
    if (mapEl && typeof ResizeObserver !== 'undefined') {
      mapResizeObserver?.disconnect()
      const onMapResize = debounce(() => {
        map?.resize()
      }, 200)
      mapResizeObserver = new ResizeObserver(onMapResize)
      mapResizeObserver.observe(mapEl)
    }
    buildMarkers()
  } catch (e) {
    console.warn('地图加载失败', e)
    message.error('地图加载失败')
  }
}

async function rebuildMap() {
  if (!map) return
  map.clearMap()
  Object.keys(markers).forEach(k => delete markers[k])
  Object.keys(infoWins).forEach(k => delete infoWins[k])
  Object.keys(polylines).forEach(k => delete polylines[Number(k)])
  buildMarkers()
}

const DAY_COLORS = ['#0891B2', '#F59E0B', '#10B981', '#7C3AED', '#EF4444', '#EC4899']

function mkContent(num: number, active: boolean, bounce: boolean) {
  const cls = ['result-dot', active ? '' : 'result-dot--dim', bounce ? 'result-dot--bounce' : ''].filter(Boolean).join(' ')
  return `<div class="${cls}">${num}</div>`
}

function buildMarkers() {
  if (!plan.value || !map || !AMap) return
  const allAttrs: any[] = []
  plan.value.days.forEach((day, di) =>
    day.attractions.forEach((attr, ai) => {
      if (attr.location?.longitude && attr.location?.latitude)
        allAttrs.push({ ...attr, di, ai })
    })
  )

  allAttrs.forEach(attr => {
    const key = `${attr.di}-${attr.ai}`
    const isActive = attr.di === activeDay.value
    const mk = new AMap.Marker({
      position: [attr.location.longitude, attr.location.latitude],
      content: mkContent(attr.ai + 1, isActive, false),
      offset: new AMap.Pixel(-16, -16),
      zIndex: isActive ? 120 : 80,
    })

    const iw = new AMap.InfoWindow({
      content: `<div style="padding:12px;font-family:-apple-system,'Inter',sans-serif;min-width:190px">
        <div style="font-size:14px;font-weight:700;color:#0C4A6E;margin-bottom:5px">${attr.name}</div>
        <div style="font-size:12px;color:#64748B;margin-bottom:3px">📍 ${attr.address}</div>
        <div style="font-size:12px;color:#64748B">⏱ ${attr.visit_duration}分钟 · 第${attr.di + 1}天</div>
        ${attr.ticket_price ? `<div style="margin-top:6px;display:inline-block;background:#F59E0B;color:#fff;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600">¥${attr.ticket_price}</div>` : ''}
      </div>`,
      offset: new AMap.Pixel(0, -36),
    })

    mk.on('click', () => {
      Object.values(infoWins).forEach(w => w.close())
      iw.open(map, mk.getPosition())
      // sync to sidebar
      focused.value = { d: attr.di, a: attr.ai }
      if (activeDay.value !== attr.di) {
        activeDay.value = attr.di
        if (activeTab.value !== 'itinerary') activeTab.value = 'itinerary'
      }
      nextTick(() => scrollToAttr(attr.di, attr.ai))
    })

    markers[key] = mk
    infoWins[key] = iw
    map.add(mk)
  })

  // fit view
  const allMk = Object.values(markers)
  if (allMk.length) map.setFitView(allMk)

  // polylines per day
  const dayGroup: Record<number, any[]> = {}
  allAttrs.forEach(a => { (dayGroup[a.di] ??= []).push(a) })
  Object.entries(dayGroup).forEach(([di, group]) => {
    if (group.length < 2) return
    const poly = new AMap.Polyline({
      path: group.map(a => [a.location.longitude, a.location.latitude]),
      strokeColor: DAY_COLORS[Number(di) % DAY_COLORS.length],
      strokeWeight: 3.5,
      strokeOpacity: Number(di) === activeDay.value ? 0.85 : 0.2,
      strokeStyle: 'dashed',
      showDir: true,
    })
    poly.setMap(map)
    polylines[Number(di)] = poly
  })

  if (activeTab.value === 'itinerary') highlightDay(activeDay.value)
}

function highlightDay(di: number) {
  if (!map) return
  Object.keys(markers).forEach(key => {
    const [d, a] = key.split('-').map(Number)
    const active = d === di
    markers[key].setContent(mkContent(a + 1, active, false))
    markers[key].setzIndex(active ? 120 : 80)
  })
  Object.keys(polylines).forEach(k => {
    polylines[Number(k)].setOptions({ strokeOpacity: Number(k) === di ? 0.85 : 0.15 })
  })
  if (fitDayTimer) clearTimeout(fitDayTimer)
  fitDayTimer = setTimeout(() => {
    fitDayTimer = null
    const dayMks = Object.keys(markers).filter(k => k.startsWith(`${di}-`)).map(k => markers[k])
    if (dayMks.length && map) map.setFitView(dayMks, false, [60, 60, 60, 60], 14)
  }, 200)
}

function resetHighlight() {
  Object.keys(markers).forEach(key => {
    const [, a] = key.split('-').map(Number)
    markers[key].setContent(mkContent(a + 1, true, false))
    markers[key].setzIndex(100)
  })
  Object.keys(polylines).forEach(k => {
    polylines[Number(k)].setOptions({ strokeOpacity: 0.6 })
  })
}

// ─── IntersectionObserver: scroll → map pan ──
function setupObserver() {
  if (!scrollEl.value) return
  if (observer) observer.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (activeTab.value !== 'itinerary' || editMode.value) return
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        const d = Number(el.dataset.d)
        const a = Number(el.dataset.a)
        if (isNaN(d) || isNaN(a)) continue
        const attr = plan.value?.days[d]?.attractions[a]
        if (attr?.location?.longitude && map) {
          map.panTo([attr.location.longitude, attr.location.latitude], 400)
          focused.value = { d, a }
        }
        break
      }
    },
    { root: scrollEl.value, rootMargin: '-15% 0px -60% 0px', threshold: 0.3 }
  )
  nextTick(() => {
    document.querySelectorAll('.titem[data-d]').forEach(el => observer!.observe(el))
  })
}

// ─── export ─────────────────────────────
async function exportImage() {
  try {
    message.loading({ content: '生成图片中…', key: 'exp', duration: 0 })
    const { default: html2canvas } = await import('html2canvas')
    const el = document.querySelector('.sidebar-body') as HTMLElement
    if (!el) throw new Error('找不到内容')
    const canvas = await html2canvas(el, { backgroundColor: '#F8FAFC', scale: 2, useCORS: true, allowTaint: true, logging: false })
    const a = document.createElement('a')
    a.download = `旅行计划_${plan.value?.city}_${Date.now()}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
    message.success({ content: '图片已导出！', key: 'exp' })
  } catch (e: any) {
    message.error({ content: `导出失败: ${e.message}`, key: 'exp' })
  }
}

async function exportPdf() {
  try {
    message.loading({ content: '生成PDF中…', key: 'exp', duration: 0 })
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const el = document.querySelector('.sidebar-body') as HTMLElement
    if (!el) throw new Error('找不到内容')
    const canvas = await html2canvas(el, { backgroundColor: '#F8FAFC', scale: 2, useCORS: true, allowTaint: true, logging: false })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = 210, ph = (canvas.height * pw) / canvas.width
    let y = 0, rem = ph
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, y, pw, ph)
    rem -= 297
    while (rem > 0) { y = rem - ph; pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, y, pw, ph); rem -= 297 }
    pdf.save(`旅行计划_${plan.value?.city}_${Date.now()}.pdf`)
    message.success({ content: 'PDF已导出！', key: 'exp' })
  } catch (e: any) {
    message.error({ content: `导出失败: ${e.message}`, key: 'exp' })
  }
}
</script>

<style scoped>
/* ════════════════════════════════
   Layout
════════════════════════════════ */
.result-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: var(--font-sans);
}

/* ════════════════════════════════
   Sidebar
════════════════════════════════ */
.sidebar {
  width: min(var(--sidebar-width), 92vw);
  min-width: min(360px, 100%);
  max-width: min(600px, 100%);
  height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  box-shadow: var(--shadow-sidebar);
  display: flex;
  flex-direction: column;
  z-index: 10;
  border-right: 1px solid rgba(226, 232, 240, 0.85);
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
  gap: 8px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
}
.topbar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }

.tbtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 15px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text);
  font-family: inherit;
  transition: all var(--ease-base);
  white-space: nowrap;
  box-shadow: var(--shadow-xs);
}
.tbtn:hover            { border-color: var(--color-primary); color: var(--color-primary); }
.tbtn--primary         { background: var(--color-primary);   color: #fff; border-color: var(--color-primary); box-shadow: 0 4px 14px rgba(8, 145, 178, 0.35); }
.tbtn--primary:hover   { background: var(--color-primary-hover); }
.tbtn--outline         { border-color: rgba(8, 145, 178, 0.45); color: var(--color-primary); background: var(--color-primary-pale); }
.tbtn--outline:hover   { background: var(--color-primary-light); }
.tbtn--danger          { border-color: var(--color-danger);  color: var(--color-danger); }
.tbtn--danger:hover    { background: var(--color-danger-light); }

/* Hero */
.sidebar-body  { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.hero {
  position: relative;
  min-height: 148px;
  flex-shrink: 0;
  background: linear-gradient(145deg, #0e7490 0%, #0891b2 42%, #06b6d4 100%);
  overflow: hidden;
}
.hero-bg {
  position: absolute; inset: 0;
  background: url('https://images.unsplash.com/photo-1508804052814-c5e17b309090?w=900') center/cover;
  opacity: 0.22;
}
.hero-veil {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 120% 80% at 20% 0%, rgba(255,255,255,0.15) 0%, transparent 50%),
    linear-gradient(180deg, rgba(12, 74, 110, 0.35) 0%, rgba(8, 145, 178, 0.25) 100%);
}
.hero-content { position: relative; z-index: 1; padding: 20px 22px 22px; color: #fff; }
.hero-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.75;
}
.hero-city {
  margin: 0 0 16px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.15);
}
.hero-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hero-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
}
.hero-stat--accent {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
}
.hero-stat-ic { font-size: 20px; line-height: 1; flex-shrink: 0; }
.hero-stat-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hero-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.8; }
.hero-stat-val   { font-size: 13px; font-weight: 700; letter-spacing: 0.01em; word-break: break-all; }

/* Tab nav */
.tab-nav {
  flex-shrink: 0;
  padding: 12px 14px 10px;
  background: var(--color-bg-page);
  border-bottom: 1px solid var(--color-border-light);
}
.tab-nav-inner {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: var(--radius-lg);
  background: #e2e8f0;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);
}
.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
  padding: 8px 4px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.tab-btn-ic { font-size: 16px; line-height: 1; }
.tab-btn-txt { line-height: 1.2; }
.tab-btn:hover  { color: var(--color-primary-dark); }
.tab-btn.active {
  color: var(--color-primary-dark);
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(0,0,0,0.04);
  transform: translateY(-1px);
}

/* Tab body */
.tab-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(8, 145, 178, 0.08) 0%, transparent 55%),
    linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #f8fafc 100%);
}
.pane { padding: 20px 18px 28px; }
.pane--overview { padding-bottom: 32px; }

/* ════════════════════════════════
   Overview
════════════════════════════════ */
.section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

.ov-block {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(226, 232, 240, 0.9);
}
.ov-dates {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 18px 20px;
}
.ov-dates-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: linear-gradient(135deg, var(--color-primary-pale), #fff);
  border: 1px solid var(--color-primary-light);
  flex-shrink: 0;
}
.ov-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.02em;
}
.ov-dates-range {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.02em;
  line-height: 1.45;
}
.ov-dates-sep { font-weight: 600; color: var(--color-text-muted); margin: 0 4px; }

.ov-tip { padding: 0; overflow: hidden; border-left: 4px solid var(--color-primary); }
.ov-tip-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 0;
}
.ov-tip-head .ov-title { margin: 0; }
.ov-tip-badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--color-primary-pale);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.ov-tip-body {
  margin: 0;
  padding: 10px 16px 18px 58px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.ov-budget-head { margin: 22px 0 14px; }
.ov-section-title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.02em;
}
.ov-section-sub {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.45;
}
.ov-section-sub--solo { margin-bottom: 14px; }

/* Budget bars */
.budget-bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
}
.budget-bar-row {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
}
.budget-bar-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.budget-bar-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.budget-bar-ic { font-size: 15px; }
.budget-bar-amt {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary-dark);
  font-variant-numeric: tabular-nums;
}
.budget-bar-track {
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.budget-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.33, 1, 0.68, 1);
}
.budget-bar-fill--attr  { background: linear-gradient(90deg, #0891b2, #22d3ee); }
.budget-bar-fill--hotel { background: linear-gradient(90deg, #0d9488, #5eead4); }
.budget-bar-fill--meal  { background: linear-gradient(90deg, #d97706, #fbbf24); }
.budget-bar-fill--trans { background: linear-gradient(90deg, #6366f1, #a5b4fc); }
.budget-bar-pct {
  margin-top: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.budget-mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.budget-mini {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: #fff;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-xs);
}
.budget-mini-ic { font-size: 20px; }
.budget-mini-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
.budget-mini-val {
  font-size: 17px;
  font-weight: 800;
  color: var(--color-primary-dark);
  font-variant-numeric: tabular-nums;
}

.budget-total-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #0c4a6e 0%, #0e7490 55%, #0891b2 100%);
  color: #fff;
  box-shadow: 0 12px 32px rgba(8, 145, 178, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.budget-total-card--tab { margin-top: 8px; }
.budget-total-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.budget-total-kicker { font-size: 15px; font-weight: 800; letter-spacing: 0.02em; }
.budget-total-note { font-size: 11px; opacity: 0.82; line-height: 1.35; }
.budget-total-val {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* Budget tab grid */
.budget-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.budget-grid--page { gap: 14px; }
.budget-cell {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 16px 14px;
  text-align: left;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(226, 232, 240, 0.95);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.budget-cell:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.budget-cell--lg .budget-cell-icon { font-size: 26px; margin-bottom: 8px; }
.budget-cell-label  { font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 6px; }
.budget-cell-val    { font-size: 20px; font-weight: 800; color: var(--color-primary-dark); font-variant-numeric: tabular-nums; }
.budget-cell-pct    { margin-top: 8px; font-size: 11px; color: var(--color-text-muted); font-weight: 500; }

/* ════════════════════════════════
   Itinerary / Day
════════════════════════════════ */
.day-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.day-pill {
  padding: 7px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all var(--ease-base);
  box-shadow: var(--shadow-xs);
}
.day-pill:hover  { border-color: var(--color-primary); color: var(--color-primary); }
.day-pill.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(8, 145, 178, 0.35);
}

.day-meta-card  {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 16px 16px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(226, 232, 240, 0.95);
}
.day-meta-date  { font-size: 12px; color: var(--color-text-muted); margin-bottom: 7px; }
.day-meta-row   { display: flex; gap: 7px; font-size: 13px; color: var(--color-text); margin-bottom: 4px; line-height: 1.4; }

/* Timeline */
.timeline { position: relative; padding-left: 18px; }
.timeline::before {
  content: '';
  position: absolute;
  left: 9px; top: 16px; bottom: 16px;
  width: 2px;
  background: repeating-linear-gradient(to bottom, var(--color-primary) 0 5px, transparent 5px 10px);
}

.titem {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  cursor: pointer;
}
.titem--focus .attr-card {
  box-shadow: 0 0 0 2px var(--color-primary), var(--shadow-md);
  transform: translateY(-1px);
}

.tdot {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-left: -5px;
  z-index: 1;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px var(--color-primary-light);
  transition: transform var(--ease-spring), background var(--ease-base);
}
.tdot--focus { background: var(--color-primary-dark); transform: scale(1.18); }

.attr-card {
  flex: 1;
  background: #fff;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform var(--ease-base), box-shadow var(--ease-base);
}
.attr-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.attr-img-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: var(--surface-muted, #f1f5f9);
}
.attr-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}
.attr-card:hover .attr-img { transform: scale(1.05); }

.attr-price {
  position: absolute; top: 9px; right: 9px;
  background: var(--color-accent); color: #fff;
  padding: 2px 9px; border-radius: var(--radius-pill);
  font-size: 11px; font-weight: 600;
  box-shadow: var(--shadow-xs);
}
.attr-map-hint {
  position: absolute; inset: 0;
  background: rgba(8,145,178,0.68);
  color: #fff; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity var(--ease-base);
}
.attr-card:hover .attr-map-hint { opacity: 1; }

.attr-body { padding: 11px 13px; }
.attr-name { font-size: 14px; font-weight: 700; color: var(--color-text); margin-bottom: 5px; }
.attr-meta { display: flex; flex-wrap: wrap; gap: 5px; font-size: 11px; color: var(--color-text-muted); margin-bottom: 5px; }
.attr-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; }

.edit-label   { font-size: 11px; color: var(--color-text-muted); margin: 5px 0 2px; }
.edit-actions { display: flex; gap: 6px; margin-top: 6px; }

/* Hotel */
.hotel-card  { background: var(--color-primary-pale); border: 1px solid var(--color-primary-light); border-radius: var(--radius-md); padding: 13px; }
.hotel-name  { font-size: 14px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 9px; }
.hotel-grid  { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 12px; }
.mkey        { color: var(--color-text-muted); font-weight: 500; }

/* Meals */
.meal-list { display: flex; flex-direction: column; gap: 7px; }
.meal-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: #fff; border-radius: var(--radius-md);
  padding: 9px 13px; box-shadow: var(--shadow-xs);
}
.meal-type { font-size: 12px; font-weight: 600; color: var(--color-primary-dark); white-space: nowrap; min-width: 52px; }
.meal-name { font-size: 13px; font-weight: 500; color: var(--color-text); }
.meal-desc { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

/* ════════════════════════════════
   Weather tab
════════════════════════════════ */
.weather-card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  margin-bottom: 12px;
}
.weather-date {
  background: linear-gradient(135deg, #0c4a6e 0%, #0891b2 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 10px 16px;
}
.weather-body     { padding: 14px 16px; }
.weather-row      { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 20px; }
.weather-sub      { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.weather-val      { font-size: 14px; font-weight: 700; color: var(--color-primary-dark); }
.weather-wind     { font-size: 12px; color: var(--color-text-muted); border-top: 1px solid var(--color-border-light); padding-top: 10px; margin-top: 4px; }

/* Empty */
.sidebar-empty { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }

/* ════════════════════════════════
   Map
════════════════════════════════ */
.map-pane { flex: 1; position: relative; overflow: hidden; }
.map-fill  { width: 100%; height: 100%; }

/* Weather overlay */
.weather-overlay {
  position: absolute;
  top: 14px; right: 14px;
  background: rgba(255,255,255,0.93);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-primary-light);
  box-shadow: var(--shadow-md);
  min-width: 165px;
  overflow: hidden;
  z-index: 20;
}
.wo-date { background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary)); color: #fff; font-size: 11px; font-weight: 600; padding: 7px 13px; }
.wo-body { padding: 11px 13px; }
.wo-row  { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 18px; }
.wo-sub  { font-size: 10px; color: var(--color-text-muted); }
.wo-val  { font-size: 12px; font-weight: 600; color: var(--color-primary-dark); }
.wo-wind { font-size: 11px; color: var(--color-text-muted); border-top: 1px solid var(--color-border-light); padding-top: 7px; }

/* Weather transition */
.weather-slide-enter-active, .weather-slide-leave-active { transition: all 0.3s ease; }
.weather-slide-enter-from { opacity: 0; transform: translateX(16px); }
.weather-slide-leave-to   { opacity: 0; transform: translateX(16px); }

/* Day legend */
.day-legend { position: absolute; bottom: 32px; left: 14px; display: flex; flex-direction: column; gap: 5px; z-index: 20; }
.day-legend-btn {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  font-size: 12px; font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: all var(--ease-base);
  box-shadow: var(--shadow-xs);
}
.day-legend-btn:hover  { border-color: var(--color-primary); color: var(--color-primary); }
.day-legend-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; box-shadow: 0 2px 8px rgba(8,145,178,0.4); }

/* Back to top */
.back-top {
  width: 42px; height: 42px;
  background: var(--color-primary);
  color: #fff; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: bold;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all var(--ease-base);
}
.back-top:hover { background: var(--color-primary-dark); transform: scale(1.1); }

/* FAB */
.fab {
  display: none;
  position: fixed;
  bottom: 22px; right: 18px;
  width: 54px; height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff; font-size: 22px;
  border: none; cursor: pointer;
  box-shadow: 0 6px 20px rgba(8,145,178,0.48);
  z-index: 45;
  align-items: center; justify-content: center;
  transition: transform var(--ease-spring), box-shadow var(--ease-base);
  font-family: var(--font-sans);
}
.fab:hover  { transform: scale(1.1); box-shadow: 0 10px 28px rgba(8,145,178,0.6); }
.fab:active { transform: scale(0.94); }

/* ════════════════════════════════
   Desktop — 加宽侧栏与横向 Hero 统计
════════════════════════════════ */
@media (min-width: 900px) {
  .hero { min-height: auto; }
  .hero-stats {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 10px;
  }
  .hero-stat {
    flex: 1;
    min-width: 0;
    padding: 10px 10px;
  }
  .hero-stat-val { font-size: 12px; }
  .tab-btn {
    flex-direction: row;
    gap: 8px;
    min-height: 44px;
    padding: 10px 12px;
  }
  .tab-btn-ic { font-size: 15px; }
  .tab-btn-txt { font-size: 12px; }
}

/* ════════════════════════════════
   Mobile responsive
════════════════════════════════ */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    height: 100vh;
    width: 90vw !important;
    max-width: 380px !important;
    z-index: 50;
    transition: left 0.32s cubic-bezier(0.4,0,0.2,1);
  }
  .result-layout.sidebar-open .sidebar { left: 0; }
  .map-pane { width: 100vw; flex: none; }
  .fab { display: flex; }
  .weather-overlay { top: 10px; right: 10px; min-width: 145px; }
  .day-legend { bottom: 80px; }
  .hero-city { font-size: 24px; }
  .budget-mini-grid { grid-template-columns: 1fr; }
  .tbtn {
    min-height: 44px;
  }
}
</style>

<!-- Global: map marker styles -->
<style>
.result-dot {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #0891B2;
  color: #fff;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(8,145,178,0.5), 0 0 0 3px #fff;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.25s ease;
}
.result-dot:hover { transform: scale(1.2); }
.result-dot--dim  { opacity: 0.28; background: #94A3B8; box-shadow: 0 2px 6px rgba(0,0,0,0.12), 0 0 0 2px #fff; }

@keyframes dotBounce {
  0%   { transform: scale(0.6); }
  55%  { transform: scale(1.35); }
  80%  { transform: scale(0.92); }
  100% { transform: scale(1); }
}
.result-dot--bounce { animation: dotBounce 0.44s cubic-bezier(0.34,1.56,0.64,1) both; }
</style>
