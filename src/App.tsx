import TradenceApp from './EdgebookApp'
import LandingPage from './LandingPage'
import './App.css'
import './Edgebook.css'
import './LandingPage.css'

function App() {
  return window.location.pathname.startsWith('/app') ? <TradenceApp /> : <LandingPage />
}

export default App
