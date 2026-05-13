import { useState } from 'react'

export function HelpFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-[#10612E] text-white shadow-lg hover:bg-[#0d4f25] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        aria-label="¿Qué es esta herramienta?"
        title="¿Qué es esta herramienta?"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>

      {/* Overlay + Panel */}
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-[opacity,visibility] duration-150 ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpen(false)}
        />

        {/* Card */}
        <div
          className={`relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-xl border border-[rgba(159,152,143,0.2)] overflow-hidden flex flex-col transition-[opacity,transform] duration-150 will-change-transform ${
            open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.98] translate-y-2'
          }`}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(159,152,143,0.15)] shrink-0">
            <h2 className="text-lg font-bold text-[#10612E] font-serif">
              Acerca de esta herramienta
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9F988F] hover:text-[#10612E] hover:bg-[rgba(16,97,46,0.06)] transition-colors"
              aria-label="Cerrar panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto p-6 space-y-5 text-sm text-[#333] leading-relaxed">
            <p>
              <span className="font-semibold text-[#10612E]">
                Estimados colaboradores y gestores de la transformación educativa:
              </span>
            </p>

            <p>
              En la Corporación Universitaria Minuto de Dios, nuestra misión de servicio nos exige evolucionar constantemente. Para lograrlo, la toma de decisiones informada es nuestra herramienta más potente. Hoy, ponemos a su disposición esta plataforma diseñada para hallar el Índice de Flexibilidad Curricular (I(f)), un instrumento estratégico que traduce la complejidad de nuestros currículos en datos accionables para el bienestar de nuestra comunidad.
            </p>

            <h3 className="text-base font-bold text-[#10612E] font-serif pt-1">
              ¿Qué estamos midiendo y para qué?
            </h3>

            <p>
              El Índice de Flexibilidad no es una cifra aislada; es el reflejo de qué tan capaz es un programa de adaptarse a las necesidades del estudiante y del entorno. A través de esta herramienta, mapeamos la organización curricular bajo un concepto claro: la flexibilidad como eje de calidad.
            </p>

            <p>
              Esta herramienta, de una forma muy sencilla e intuitiva, nos permite visualizar de forma inmediata cómo estamos impactando en las dimensiones clave de nuestra oferta académica:
            </p>

            <ul className="space-y-3 pl-1">
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10612E] shrink-0" />
                <span>
                  <strong className="text-[#10612E]">Optimización de Créditos:</strong>{' '}
                  Evaluamos el equilibrio entre lo específico y lo electivo, garantizando que el estudiante tenga margen de decisión en su ruta formativa.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10612E] shrink-0" />
                <span>
                  <strong className="text-[#10612E]">Fortalecimiento de la Transversalidad:</strong>{' '}
                  Medimos la integración del Núcleo Común y la efectividad de nuestras rutas de homologación, facilitando el tránsito académico sin barreras.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10612E] shrink-0" />
                <span>
                  <strong className="text-[#10612E]">Vínculo con el Territorio:</strong>{' '}
                  Analizamos la Proyección Social a través del trabajo en comunidad y las opciones de grado que realmente transforman vidas.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10612E] shrink-0" />
                <span>
                  <strong className="text-[#10612E]">Cultura de la Investigación:</strong>{' '}
                  Monitoreamos las rutas que despiertan el espíritu crítico y la creación de conocimiento.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10612E] shrink-0" />
                <span>
                  <strong className="text-[#10612E]">Vanguardia Tecnológica:</strong>{' '}
                  En nuestros programas presenciales, cuantificamos la inclusión de metodologías híbridas y virtuales como motor de innovación.
                </span>
              </li>
            </ul>

            <h3 className="text-base font-bold text-[#10612E] font-serif pt-1">
              Decisiones con Propósito
            </h3>

            <p>
              La herramienta adapta automáticamente los pesos y métricas según la modalidad del programa (Presencial o Distancia) , entregándoles un Índice de Flexibilidad preciso que servirá como base para futuras mejoras curriculares.
            </p>

            <p>
              Cada dato ingresado es un paso hacia una comunidad educativa más conectada, inclusiva y pertinente. Los invitamos a utilizar esta herramienta con la convicción de que, detrás de cada indicador, hay un camino más claro para nuestros estudiantes y un impacto positivo real en nuestra sociedad.
            </p>

            <p className="text-center font-semibold text-[#10612E] pt-2">
              ¡Gracias por ser parte fundamental de esta evolución en UNIMINUTO!
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
