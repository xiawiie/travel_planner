import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ConfigProvider from 'ant-design-vue/es/config-provider'
import 'ant-design-vue/dist/reset.css'
import './styles/variables.css'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: () => import('./views/Home.vue') },
    { path: '/result', name: 'Result', component: () => import('./views/Result.vue') },
  ],
})

const app = createApp(App)
app.component('AConfigProvider', ConfigProvider)
app.use(router)
app.mount('#app')
