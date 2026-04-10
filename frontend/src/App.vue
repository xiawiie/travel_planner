<template>
  <a-config-provider :theme="theme" :locale="zhCN">
    <div id="app">
      <router-view v-slot="{ Component }">
        <transition name="page-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0891B2',
    borderRadius: 8,
    fontFamily:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}
</script>

<style>
#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Page transition — 尊重 prefers-reduced-motion 由全局 variables 覆盖动画时长 */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: opacity 380ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateX(32px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}

@media (prefers-reduced-motion: reduce) {
  .page-slide-enter-active,
  .page-slide-leave-active {
    transition-duration: 1ms;
  }
}
</style>
