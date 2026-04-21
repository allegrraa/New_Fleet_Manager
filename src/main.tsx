/*
 * main.tsx
 *
 * Application entry point. This file is the very first JavaScript executed
 * by the browser. It mounts the React application onto the <div id="root">
 * element defined in index.html.
 *
 * StrictMode wraps the app during development only — it intentionally
 * double-invokes certain lifecycle functions to help surface side-effect bugs.
 * It has no effect in production builds.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'   // Tailwind CSS global styles
import App from './App.tsx'

// Attach the React component tree to the DOM root element.
// The non-null assertion (!) is safe because index.html always contains #root.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
