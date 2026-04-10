<template>
  <div class="home-layout" :class="{ 'sidebar-open': drawerOpen }">

    <!-- Mobile overlay -->
    <div v-if="drawerOpen" class="mobile-drawer-overlay" @click="drawerOpen = false" />

    <!-- ═══════════ LEFT SIDEBAR ═══════════ -->
    <aside class="sidebar">
      <!-- Logo header -->
      <div class="sidebar-header">
        <span class="logo-icon">✈️</span>
        <div>
          <div class="logo-title">智能旅行助手</div>
          <div class="logo-sub">AI-Powered Trip Planning</div>
        </div>
      </div>

      <!-- ── Scroll body ── -->
      <div class="sidebar-body">
        <!-- Planning form -->
        <div v-if="!loading" class="stagger">

          <!-- 1. Destination & Dates -->
          <section class="form-section">
            <div class="section-label">📍 目的地与日期</div>

            <a-input
              v-model:value="form.city"
              placeholder="搜索城市，例如：北京、成都"
              size="large"
              allow-clear
              class="city-input"
              @change="onCityInput"
            >
              <template #prefix><span style="font-size:16px;margin-right:4px">🏙️</span></template>
            </a-input>

            <div class="date-row">
              <a-date-picker v-model:value="form.start_date" placeholder="出发日期" size="large" :allow-clear="false" style="flex:1" />
              <span class="date-sep">→</span>
              <a-date-picker v-model:value="form.end_date" placeholder="返回日期" size="large" :allow-clear="false" style="flex:1" />
              <span v-if="form.travel_days > 0" class="days-badge">{{ form.travel_days }}天</span>
            </div>
          </section>

          <!-- 2. Transportation -->
          <section class="form-section">
            <div class="section-label">🚇 交通方式</div>
            <div class="chip-grid">
              <button
                v-for="t in transportOpts" :key="t.value"
                type="button" class="chip"
                :class="{ 'chip--active': form.transportation === t.value }"
                @click="form.transportation = t.value"
              >
                <span class="chip-icon">{{ t.icon }}</span>
                <span>{{ t.label }}</span>
              </button>
            </div>
          </section>

          <!-- 3. Accommodation -->
          <section class="form-section">
            <div class="section-label">🏨 住宿偏好</div>
            <div class="chip-grid">
              <button
                v-for="a in accomOpts" :key="a.value"
                type="button" class="chip"
                :class="{ 'chip--active': form.accommodation === a.value }"
                @click="form.accommodation = a.value"
              >
                <span class="chip-icon">{{ a.icon }}</span>
                <span>{{ a.label }}</span>
              </button>
            </div>
          </section>

          <!-- 4. Preferences -->
          <section class="form-section">
            <div class="section-label">🏷️ 旅行偏好</div>
            <div class="pref-tags">
              <button
                v-for="p in prefOpts" :key="p.value"
                type="button" class="pref-tag"
                :class="{ 'pref-tag--active': form.preferences.includes(p.value) }"
                @click="togglePref(p.value)"
              >{{ p.icon }} {{ p.label }}</button>
            </div>
          </section>

          <!-- 5. Free text -->
          <section class="form-section">
            <div class="section-label">💬 额外要求</div>
            <a-textarea
              v-model:value="form.free_text_input"
              :rows="3"
              placeholder="如：想看升旗、需要无障碍设施、不吃辣…"
              class="notes-input"
            />
          </section>
        </div>

        <!-- Loading state -->
        <div v-else class="loading-state">
          <div class="loading-city">{{ form.city }}</div>
          <div class="loading-sub">正在智能规划您的旅程…</div>

          <!-- Ring -->
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 100 100">
              <circle class="ring-track" cx="50" cy="50" r="42" />
              <circle class="ring-fill" cx="50" cy="50" r="42"
                :stroke-dasharray="`${loadPctInt * 2.639} 263.9`" />
            </svg>
            <div class="ring-label" lang="en" translate="no">{{ loadPctInt }}%</div>
          </div>

          <!-- Steps -->
          <div class="load-steps">
            <div v-for="(s, i) in loadSteps" :key="i" class="load-step"
              :class="{
                'load-step--done':   loadPctInt > s.at,
                'load-step--active': loadPctInt <= s.at && loadPctInt > (loadSteps[i-1]?.at ?? 0)
              }"
            >
              <div class="load-dot">{{ loadPctInt > s.at ? '✓' : i+1 }}</div>
              <span>{{ s.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit footer -->
      <div v-if="!loading" class="sidebar-footer">
        <button class="submit-btn" @click="handleSubmit">
          🚀 开始规划我的旅行
        </button>
      </div>
    </aside>

    <!-- ═══════════ RIGHT MAP ═══════════ -->
    <main class="map-pane">
      <div id="home-map" class="map-fill"></div>

      <!-- Map footer brand -->
      <div class="map-brand">🌏 HelloAgents 智能旅行助手</div>

      <!-- Mobile open sidebar FAB -->
      <button class="fab" @click="drawerOpen = !drawerOpen">
        {{ drawerOpen ? '✕' : '✈️' }}
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { generateTripPlan } from '@/services/api'
import type { TripFormData } from '@/types'
import type { Dayjs } from 'dayjs'

const router = useRouter()
const loading = ref(false)
const loadPct  = ref(0)
/** 0–100 整数，用于圆环与文案（避免小数与翻译插件重复插入文字） */
const loadPctInt = computed(() =>
  Math.round(Math.min(100, Math.max(0, loadPct.value)))
)
const drawerOpen = ref(false)

let mapInst: any = null
let geocoder: any = null
let cityMarker: any = null
let cityInputTimer: ReturnType<typeof setTimeout>

// ── form state ──
type HomeForm = Omit<TripFormData, 'start_date' | 'end_date'> & {
  start_date: Dayjs | undefined
  end_date: Dayjs | undefined
}

const form = reactive<HomeForm>({
  city: '', start_date: undefined, end_date: undefined, travel_days: 1,
  transportation: '公共交通', accommodation: '经济型酒店',
  preferences: [], free_text_input: '',
})

// ── options ──
const transportOpts = [
  { value: '公共交通', icon: '🚇', label: '公共交通' },
  { value: '自驾',     icon: '🚗', label: '自驾'     },
  { value: '步行',     icon: '🚶', label: '步行'     },
  { value: '混合',     icon: '🔀', label: '混合'     },
]
const accomOpts = [
  { value: '经济型酒店', icon: '💰', label: '经济型' },
  { value: '舒适型酒店', icon: '🏨', label: '舒适型' },
  { value: '豪华酒店',   icon: '⭐', label: '豪华型' },
  { value: '民宿',       icon: '🏡', label: '民宿'   },
]
const prefOpts = [
  { value: '历史文化', icon: '🏛️', label: '历史文化' },
  { value: '自然风光', icon: '🏞️', label: '自然风光' },
  { value: '美食',     icon: '🍜', label: '美食'     },
  { value: '购物',     icon: '🛍️', label: '购物'     },
  { value: '艺术',     icon: '🎨', label: '艺术'     },
  { value: '休闲',     icon: '☕', label: '休闲'     },
]
const loadSteps = [
  { label: '🔍 搜索景点信息',  at: 30 },
  { label: '🌤️ 查询天气数据', at: 55 },
  { label: '🏨 推荐酒店住宿',  at: 75 },
  { label: '📋 生成完整行程',  at: 92 },
]

const togglePref = (v: string) => {
  const i = form.preferences.indexOf(v)
  i === -1 ? form.preferences.push(v) : form.preferences.splice(i, 1)
}

// Auto-calc travel days
watch([() => form.start_date, () => form.end_date], ([s, e]) => {
  if (s && e) {
    const d = (e as Dayjs).diff(s as Dayjs, 'day') + 1
    if (d < 1 || d > 30) {
      message.warning(d < 1 ? '结束日期不能早于开始日期' : '行程不能超过30天')
      form.end_date = undefined
    } else {
      form.travel_days = d
    }
  }
})

// ── Map ──
onMounted(() => { initMap() })
onUnmounted(() => { if (mapInst) mapInst.destroy() })

async function initMap() {
  try {
    const AMap = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_WEB_JS_KEY,
      version: '2.0',
      plugins: ['AMap.Geocoder'],
    })
    mapInst = new AMap.Map('home-map', {
      zoom: 4.5,
      center: [104.195397, 35.86166],
      mapStyle: 'amap://styles/whitesmoke',
    })
    geocoder = new AMap.Geocoder()

    // Drop city pill markers
    const cities = [
      { name: '北京', pos: [116.407526, 39.90403] },
      { name: '上海', pos: [121.473701, 31.230416] },
      { name: '成都', pos: [104.066541, 30.572269] },
      { name: '西安', pos: [108.948024, 34.263161] },
      { name: '杭州', pos: [120.153576, 30.287459] },
      { name: '广州', pos: [113.280637, 23.125178] },
      { name: '重庆', pos: [106.551556, 29.563009] },
      { name: '厦门', pos: [118.089425, 24.479833] },
    ]
    cities.forEach(c => {
      new AMap.Marker({
        position: c.pos,
        content: `<div class="hp-city-pill">${c.name}</div>`,
        offset: new AMap.Pixel(-28, -14),
      }).setMap(mapInst)
    })
  } catch (e) {
    console.warn('地图加载失败', e)
  }
}

function onCityInput() {
  clearTimeout(cityInputTimer)
  const city = form.city?.trim()
  if (!city || city.length < 2 || !geocoder || !mapInst) return
  cityInputTimer = setTimeout(() => {
    geocoder.getLocation(city, (status: string, result: any) => {
      if (status === 'complete' && result.geocodes?.[0]) {
        const { lng, lat } = result.geocodes[0].location
        mapInst.setZoomAndCenter(11, [lng, lat], false, 600)
        if (cityMarker) cityMarker.setMap(null)
        const AMap = (window as any).AMap
        if (AMap) {
          cityMarker = new AMap.Marker({
            position: [lng, lat],
            content: `<div class="hp-city-pill hp-city-pill--active">${city}</div>`,
            offset: new AMap.Pixel(-28, -14),
          })
          cityMarker.setMap(mapInst)
        }
      }
    })
  }, 500)
}

// ── Submit ──
async function handleSubmit() {
  if (!form.city.trim()) { message.error('请输入目的地城市'); return }
  if (form.start_date == null)  { message.error('请选择出发日期');  return }
  if (form.end_date == null)    { message.error('请选择返回日期');  return }

  loading.value = true
  loadPct.value = 0

  const timer = setInterval(() => {
    if (loadPct.value < 90) {
      const next = loadPct.value + Math.random() * 10 + 3
      loadPct.value = Math.min(Math.round(next), 90)
    }
  }, 700)

  try {
    const req: TripFormData = {
      city:           form.city,
      start_date:     (form.start_date! as Dayjs).format('YYYY-MM-DD'),
      end_date:       (form.end_date!   as Dayjs).format('YYYY-MM-DD'),
      travel_days:    form.travel_days,
      transportation: form.transportation,
      accommodation:  form.accommodation,
      preferences:    [...form.preferences],
      free_text_input: form.free_text_input,
    }
    const res = await generateTripPlan(req)
    clearInterval(timer)
    loadPct.value = 100
    if (res.success && res.data) {
      sessionStorage.setItem('tripPlan', JSON.stringify(res.data))
      message.success('行程规划完成！')
      setTimeout(() => router.push('/result'), 400)
    } else {
      message.error(res.message || '规划失败，请重试')
    }
  } catch (err: any) {
    clearInterval(timer)
    message.error(err.message || '网络错误，请稍后重试')
  } finally {
    setTimeout(() => { loading.value = false; loadPct.value = 0 }, 800)
  }
}
</script>

<style scoped>
/* ═══════════════════════════════
   Layout
═══════════════════════════════ */
.home-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: var(--font-sans);
}

/* ═══════════════════════════════
   Sidebar
═══════════════════════════════ */
.sidebar {
  width: min(var(--sidebar-width), 92vw);
  min-width: min(360px, 100%);
  max-width: min(600px, 100%);
  height: 100vh;
  background: #fff;
  box-shadow: var(--shadow-sidebar);
  display: flex;
  flex-direction: column;
  z-index: 10;
  position: relative;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.logo-icon  { font-size: 28px; line-height: 1; }
.logo-title { font-size: 17px; font-weight: 700; color: var(--color-primary-dark); }
.logo-sub   { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 22px 0;
}

.sidebar-footer {
  padding: 14px 22px 22px;
  border-top: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

/* ═══════════════════════════════
   Form sections
═══════════════════════════════ */
.form-section { margin-bottom: 22px; }

.section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

/* City input */
.city-input :deep(.ant-input-affix-wrapper) {
  border-radius: var(--radius-md) !important;
  border: 1.5px solid var(--color-border) !important;
  transition: all var(--ease-base);
}
.city-input :deep(.ant-input-affix-wrapper:hover),
.city-input :deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 3px rgba(8,145,178,0.12) !important;
}

/* Date row */
.date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.date-sep { color: var(--color-text-muted); flex-shrink: 0; }
.days-badge {
  flex-shrink: 0;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

:deep(.ant-picker) {
  border-radius: var(--radius-md) !important;
  border: 1.5px solid var(--color-border) !important;
  width: 100%;
}
:deep(.ant-picker:hover), :deep(.ant-picker-focused) {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 3px rgba(8,145,178,0.12) !important;
}

/* Chip group (transport/accom) */
.chip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-page);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: all var(--ease-base);
}
.chip:hover         { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-pale); }
.chip--active       { border-color: var(--color-primary) !important; background: var(--color-primary-light) !important; color: var(--color-primary-dark) !important; }
.chip-icon          { font-size: 20px; }

/* Preference pill tags */
.pref-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.pref-tag {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: all var(--ease-base);
}
.pref-tag:hover          { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-pale); }
.pref-tag--active        { background: var(--color-primary) !important; border-color: var(--color-primary) !important; color: #fff !important; }

/* Textarea */
.notes-input :deep(.ant-input) {
  border-radius: var(--radius-md) !important;
  border: 1.5px solid var(--color-border) !important;
  font-family: var(--font-sans);
  resize: none;
}
.notes-input :deep(.ant-input:hover),
.notes-input :deep(.ant-input:focus) {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 3px rgba(8,145,178,0.12) !important;
}

/* Submit button */
.submit-btn {
  width: 100%;
  height: 50px;
  border-radius: var(--radius-pill);
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-sans);
  box-shadow: 0 6px 20px rgba(8,145,178,0.38);
  transition: transform var(--ease-base), box-shadow var(--ease-base);
}
.submit-btn:hover  { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(8,145,178,0.48); }
.submit-btn:active { transform: translateY(0); }

/* ═══════════════════════════════
   Loading state
═══════════════════════════════ */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 0;
  gap: 24px;
}
.loading-city { font-size: 28px; font-weight: 800; color: var(--color-primary-dark); }
.loading-sub  { font-size: 13px; color: var(--color-text-muted); margin-top: -16px; }

/* Ring */
.ring-wrap { position: relative; width: 120px; height: 120px; }
.ring-svg  { width: 120px; height: 120px; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: var(--color-border); stroke-width: 8; }
.ring-fill  {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}
.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary-dark);
}

/* Steps */
.load-steps { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.load-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  transition: background var(--ease-base), opacity var(--ease-base);
}
.load-step--active  { background: var(--color-primary-pale); }
.load-step--done    { opacity: 0.45; }
.load-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background var(--ease-base);
}
.load-step--done .load-dot { background: var(--color-success); }

/* ═══════════════════════════════
   Map pane
═══════════════════════════════ */
.map-pane { flex: 1; position: relative; overflow: hidden; }
.map-fill  { width: 100%; height: 100%; }

.map-brand {
  position: absolute;
  bottom: 14px;
  right: 14px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(8px);
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-sm);
  pointer-events: none;
}

/* FAB (hidden on desktop) */
.fab {
  display: none;
  position: absolute;
  bottom: 28px;
  right: 20px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  font-size: 22px;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(8,145,178,0.45);
  z-index: 15;
  align-items: center;
  justify-content: center;
  transition: transform var(--ease-spring), box-shadow var(--ease-base);
}
.fab:hover  { transform: scale(1.1); }
.fab:active { transform: scale(0.94); }

/* ═══════════════════════════════
   Mobile responsive
═══════════════════════════════ */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    height: 100vh;
    width: 90vw !important;
    max-width: 380px !important;
    z-index: 50;
    transition: left 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .home-layout.sidebar-open .sidebar { left: 0; }
  .map-pane { width: 100vw; flex: none; }
  .fab { display: flex; }
  /* 触控目标约 44px（WCAG 2.5.5 建议） */
  .submit-btn {
    min-height: 44px;
  }
}
</style>

<!-- Global: AMap custom city markers -->
<style>
.hp-city-pill {
  background: #fff;
  border: 2px solid #0891B2;
  color: #0C4A6E;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  font-family: -apple-system, 'Inter', sans-serif;
  transition: all 0.2s;
}
.hp-city-pill--active {
  background: #0891B2;
  color: #fff;
  border-color: #0C4A6E;
  transform: scale(1.1);
}
</style>
