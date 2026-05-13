import uniminutoLogo from '../../assets/Logo uniminuto H.png'
import minisimLogo from '../../assets/MiniSim-Color-Transparente.png'

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-16 px-4 sm:px-6 flex items-center justify-center bg-white/70 backdrop-blur-md border-b border-[rgba(159,152,143,0.15)]">
      <div className="flex items-center gap-4 sm:gap-6">
        <img
          src={uniminutoLogo}
          alt="Corporación Universitaria Minuto de Dios"
          className="h-8 w-auto object-contain"
        />
        <div className="w-px h-8 bg-[rgba(159,152,143,0.25)]" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <img
            src={minisimLogo}
            alt="SymbioTIC"
            className="w-10 h-10 rounded-full object-cover border border-[rgba(159,152,143,0.2)] bg-white"
          />
          <a
            href="https://symbioticstartup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-sm font-bold text-[#10612E] tracking-tight hover:opacity-70 hover:underline underline-offset-4 transition-opacity"
          >
            SymbioTIC
          </a>
        </div>
      </div>
    </header>
  )
}
