import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { applyAuthHeader, getStoredAuth } from './utils/auth'

// Set header auth sedini mungkin (sebelum efek komponen berjalan),
// supaya fetch di halaman yang langsung di-refresh tidak terkirim tanpa token.
applyAuthHeader(getStoredAuth()?.token)

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
