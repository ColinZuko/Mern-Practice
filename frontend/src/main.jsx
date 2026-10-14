import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The site used to have addresses like /#/readblog/<id>. Turn those (old bookmarks, shared
// links, links in emails already sent) into the new clean addresses.
function convertOldAddress() {
  if (!window.location.hash.startsWith('#/')) return false
  window.history.replaceState(null, '', window.location.hash.slice(1))
  return true
}
convertOldAddress()
// Also when an old link is opened while the site is already open (only the # part changes then)
window.addEventListener('hashchange', () => {
  if (convertOldAddress()) window.dispatchEvent(new PopStateEvent('popstate'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
