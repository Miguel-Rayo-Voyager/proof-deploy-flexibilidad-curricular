# Índice de Flexibilidad Curricular — I(f)

Plataforma para la medición del **Índice de Flexibilidad Curricular** (_I(f)_) en programas académicos de educación superior. Evalúa cinco dimensiones de flexibilidad —créditos académicos, transversalidad, proyección social, investigación e inclusión tecnológica— y produce un índice ponderado según la modalidad del programa (Presencial o Distancia).

---

## Arquitectura

```
┌─────────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Frontend (React 19)   │────▶│  Backend (FastAPI)    │────▶│  Supabase (REST)  │
│   Vite + Tailwind CSS   │◀────│  Uvicorn :8000        │◀────│  PostgreSQL + RLS │
│   localhost:5173        │     │  /api/v1              │     │  PL/pgSQL RPC     │
└─────────────────────────┘     └──────────────────────┘     └──────────────────┘
```

| Capa | Tecnología | Descripción |
|------|-----------|-------------|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 + Framer Motion | Formulario dinámico de 9 secciones con vista previa en tiempo real del I(f). |
| **Backend** | FastAPI (Python 3.14) + Uvicorn | API REST para cálculo, persistencia y consulta. Cliente Supabase propio sobre `httpx`. |
| **Base de datos** | PostgreSQL (Supabase) | 1 tabla principal + 8 sub-tablas, triggers de sincronización, vistas analíticas y funciones PL/pgSQL transaccionales vía RPC. |

---

## Estructura del proyecto

```
├── README.md
├── .gitignore
│
├── doc/
│   ├── POC.html                                  # Prototipo visual del formulario
│   └── Mapeo del formulario - FLEXIBILIDAD CURRICULAR.docx  # Especificación de campos y dimensiones
│
├── backend/
│   ├── .env                                      # Credenciales de Supabase (no committear)
│   ├── requirements.txt                          # Dependencias Python
│   ├── app/
│   │   ├── main.py                               # Punto de entrada FastAPI + CORS + /health
│   │   ├── core/
│   │   │   ├── config.py                         # Configuración vía Pydantic Settings (.env)
│   │   │   └── supabase_client.py                # Cliente Supabase REST asíncrono sobre httpx
│   │   ├── models/
│   │   │   └── registro.py                       # Modelos Pydantic (validación de formulario)
│   │   ├── services/
│   │   │   └── indicators_engine.py              # Motor de cálculo del I(f) por dimensiones
│   │   └── api/
│   │       └── routes/
│   │           └── registros.py                  # Endpoints REST: calcular, crear, actualizar
│   └── venv/                                     # Entorno virtual Python 3.14
│
├── frontend/
│   ├── .env                                      # Variables de entorno frontend
│   ├── package.json                              # Dependencias npm
│   ├── vite.config.js                            # Configuración Vite + proxy API
│   └── src/
│       ├── main.jsx                              # Entry point React
│       ├── App.jsx                               # Componente raíz
│       ├── index.css                             # Tailwind v4 + design tokens Navy/Gold
│       ├── hooks/
│       │   └── useFormStore.js                   # Estado del formulario (useReducer)
│       ├── lib/
│       │   └── supabase.js                       # Cliente JS de Supabase
│       ├── services/
│       │   └── api.js                            # Comunicación con backend FastAPI
│       └── components/
│           ├── form/DynamicForm.jsx              # Formulario paginado de 9 secciones
│           ├── results/ResultsPanel.jsx          # Panel de resultados (dimensiones + I(f))
│           └── ui/                               # Componentes reutilizables (FormField, TiltCard, etc.)
│
└── supabase/
    └── migrations/
        ├── 20260506000000_initial_schema.sql     # Esquema inicial: tablas, triggers, vistas, RLS
        ├── 20260506000001_insert_procedure.sql   # PL/pgSQL: inserción atómica transaccional
        └── 20260507000000_update_procedure.sql   # PL/pgSQL: actualización atómica transaccional
```

---

## Modelo de cálculo — Dimensiones del I(f)

El Índice de Flexibilidad Curricular se compone de **5 dimensiones**, cada una con indicadores normalizados en el intervalo [0, 1]. El índice final _I(f)_ es la suma ponderada de los promedios de cada dimensión.

### Ponderaciones por modalidad

| Dimensión | Presencial | Distancia |
|-----------|-----------|-----------|
| **D1** Créditos Académicos | 30% | 35% |
| **D2** Transversalidad | 15% | 25% |
| **D3** Proyección Social | 15% | 20% |
| **D4** Investigación | 15% | 20% |
| **D5** Inclusión Tecnológica | 25% | — |

### Indicadores por dimensión

| Dimensión | Indicadores |
|-----------|------------|
| **D1** Créditos Académicos | 1.1.1 Específicos/Total, 1.2.1 Electivos/Total, 1.3.1 Prerrequisito/Total, 1.4.1 Correquisito/Total |
| **D2** Transversalidad | 2.1.1 Núcleo Común, 2.2.1 Hom. Mismo Nivel Int., 2.2.2 Hom. Nivel Sup. Int., 2.3.1 Hom. Mismo Nivel Ext., 2.3.2 Hom. Nivel Sup. Ext. |
| **D3** Proyección Social | 3.1.1 Trabajo en Comunidad, 3.2.1 Modalidades de Grado PS/6 |
| **D4** Investigación | 4.1.1 Ruta de Investigación, 4.2.1 Modalidades de Grado INV/3 |
| **D5** Inclusión Tecnológica | 5.1.1 Créditos Híbridos/Total, 5.2.1 Créditos Virtuales/Total |

---

## API Endpoints

Todos los endpoints van bajo el prefijo `/api/v1`.

### `GET /health`

Health check. Retorna `{"status": "ok"}`.

### `POST /api/v1/registros/calcular`

Cálculo en tiempo real del I(f) sin persistir en base de datos.

- **Body**: `RegistroCreate` (todos los campos del formulario).
- **Response**: `{modalidad, indice_flexibilidad, dimensiones: [{nombre, peso, promedio, indicadores}]}`
- **Uso**: Vista previa en vivo en el frontend (debounced a 600 ms).

### `POST /api/v1/registros`

Persiste el formulario completo en Supabase y retorna el I(f) calculado.

- **Body**: `RegistroCreate`
- **Status**: `201 Created`
- **Response**: `{id (UUID), modalidad, indice_flexibilidad, dimensiones: [...]}`
- **Flujo**: Validación Pydantic → Cálculo Python → Inserción atómica vía RPC PL/pgSQL → Respuesta combinada.

### `PATCH /api/v1/registros/{registro_id}`

Actualiza un registro existente y recalcula el I(f).

- **Body**: `RegistroCreate`
- **Status**: `200 OK`
- **Response**: `{id, modalidad, indice_flexibilidad, dimensiones: [...]}`

---

## Base de datos

### Tabla principal: `registros`

Almacena los 33+ campos del formulario agrupados en las 9 secciones, con restricciones `CHECK` de integridad y columnas generadas (`n9`, `n28`, `n29`).

### Sub-tablas (1:N con `registros`, `ON DELETE CASCADE`)

| Tabla | Descripción |
|-------|------------|
| `hom_mismo_nivel_int` | Homologaciones — mismo nivel, internas |
| `hom_nivel_sup_int` | Homologaciones — nivel superior, internas |
| `hom_mismo_nivel_ext` | Homologaciones — mismo nivel, externas |
| `hom_nivel_sup_ext` | Homologaciones — nivel superior, externas |
| `cursos_trabajo_comunidad` | Cursos de trabajo con la comunidad (D3) |
| `cursos_investigacion` | Cursos de ruta de investigación (D4) |
| `cursos_virtuales` | Cursos en modalidad virtual (D5) |
| `cursos_hibridos` | Cursos en modalidad híbrida (D5) |

### Funciones PL/pgSQL (invocadas vía RPC desde el backend)

- **`fn_insertar_registro_completo(payload JSONB)`**: Inserta en `registros` + las 8 sub-tablas en una única transacción atómica.
- **`fn_actualizar_registro_completo(p_id UUID, payload JSONB)`**: Actualiza `registros`, elimina sub-registros existentes y los re-inserta.

### Vistas

- **`v_indicadores`**: Calcula los 14 indicadores atómicos mediante agregaciones con `LEFT JOIN`.
- **`v_indice_flexibilidad`**: Calcula promedios por dimensión y el I(f) final ponderado.

### Triggers

9 triggers mantienen sincronizadas automáticamente las columnas derivadas de la tabla principal (contadores y promedios desde las sub-tablas) ante cualquier INSERT/UPDATE/DELETE.

---

## Puesta en marcha

### Requisitos previos

- **Python 3.12+** (desarrollado sobre 3.14)
- **Node.js 20+** (con npm)
- Cuenta de **Supabase** (o PostgreSQL propio) con las migraciones ejecutadas

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url>
cd indice-de-flexibilidad-curricular-project
```

Crear `backend/.env`:

```
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_KEY=sb_publishable_<tu-key>
```

Crear `frontend/.env`:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_<tu-key>
VITE_API_URL=http://localhost:8000
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

El backend se levanta en `http://localhost:8000`.

Documentación interactiva: `http://localhost:8000/docs`

### 3. Base de datos (migraciones Supabase)

Ejecutar las migraciones en el orden numerado desde `supabase/migrations/` usando la CLI de Supabase o el SQL Editor del dashboard:

```
supabase migration up
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se levanta en `http://localhost:5173` y se comunica con el backend a través del proxy de Vite.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción |
|----------|------------|
| `SUPABASE_URL` | URL del proyecto Supabase (https://xxx.supabase.co) |
| `SUPABASE_KEY` | Publishable key (anon key) de Supabase |

### Frontend (`frontend/.env`)

| Variable | Descripción |
|----------|------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (anon key) de Supabase |
| `VITE_API_URL` | URL del backend (default: `http://localhost:8000`) |

---

## Tecnologías

| Propósito | Tecnología |
|-----------|-----------|
| Frontend framework | React 19 |
| Bundler | Vite 8 |
| Estilos | Tailwind CSS 4 |
| Animaciones | Framer Motion |
| Backend framework | FastAPI |
| Validación de datos | Pydantic 2 + Pydantic Settings |
| Cliente HTTP (backend) | httpx |
| Base de datos | PostgreSQL (Supabase) |
| Seguridad | Row Level Security (RLS) |
