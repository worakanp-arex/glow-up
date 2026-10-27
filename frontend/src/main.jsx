import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// The Prompt font is served from this site (Thai + Latin only), so visiting the app
// doesn't tell Google's servers who is browsing a recovery platform.
import '@fontsource/prompt/thai-300.css'
import '@fontsource/prompt/thai-400.css'
import '@fontsource/prompt/thai-500.css'
import '@fontsource/prompt/thai-600.css'
import '@fontsource/prompt/thai-700.css'
import '@fontsource/prompt/latin-300.css'
import '@fontsource/prompt/latin-400.css'
import '@fontsource/prompt/latin-500.css'
import '@fontsource/prompt/latin-600.css'
import '@fontsource/prompt/latin-700.css'
import './index.css'
import './styles/system.css'
import './styles/mobile.css'
import './styles/page-refinements.css'
import './styles/redesign.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
