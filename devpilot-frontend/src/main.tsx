import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const savedTheme = window.localStorage.getItem('devpilot-theme')
  const isDark = savedTheme === 'dark'
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', isDark)
} catch {
  document.documentElement.dataset.theme = 'light'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
