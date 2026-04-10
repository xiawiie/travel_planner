/// <reference types="vite/client" />

declare module 'ant-design-vue/dist/reset.css'

declare module '*.css' {
  const content: string
  export default content
}
