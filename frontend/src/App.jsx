import { useState } from 'react'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { MainEditor } from './components/layout/MainEditor'
import { SplashScreen } from './components/layout/SplashScreen'
import { HelpFab } from './components/layout/HelpFab'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden bg-white">
          <Sidebar />
          <MainEditor />
        </div>
      </div>
      <HelpFab />
    </>
  )
}

export default App
