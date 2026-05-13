import { useState, useEffect } from 'react'
import uniminutoLogo from '../../assets/Logo uniminuto H.png'
import minisimLogo from '../../assets/MiniSim-Color-Transparente.png'

export function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2000)
    const t2 = setTimeout(() => onDone?.(), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden={fading}
    >
      {/* Mascot */}
      <div className="animate-[splash-float_3s_ease-in-out_infinite]">
        <img
          src={minisimLogo}
          alt="SymbioTIC Mascot"
          className="w-32 h-32 sm:w-40 sm:h-40 object-contain animate-[splash-fade-in_0.6s_ease-out_both]"
        />
      </div>

      {/* Brand text */}
      <p className="mt-6 text-lg sm:text-xl font-bold text-[#10612E] font-serif tracking-tight animate-[splash-fade-in-up_0.6s_ease-out_both] [animation-delay:300ms]">
        SymbioTIC <span className="text-[#9F988F] font-normal">by</span> UNIMINUTO
      </p>

      {/* Client logo */}
      <div className="mt-8 animate-[splash-fade-in-up_0.6s_ease-out_both] [animation-delay:500ms]">
        <img
          src={uniminutoLogo}
          alt="UNIMINUTO"
          className="h-9 sm:h-10 w-auto object-contain opacity-80"
        />
      </div>
    </div>
  )
}
