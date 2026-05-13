# Guía de despliegue en Render (plan gratuito)

## Resumen de servicios

| Servicio | Tipo en Render | Plan | ¿Se duerme? |
|----------|---------------|------|-------------|
| Frontend | Static Site | Gratis | No |
| Backend | Web Service (Python) | Gratis | Sí (tras 15 min de inactividad) |
| Base de datos | — | Supabase | Ya está configurada ✅ |

---

## Paso 1: Commit de los cambios de configuración

Los siguientes archivos fueron creados/modificados para soportar Render:

- `backend/Procfile` — comando de inicio para Render
- `backend/runtime.txt` — versión de Python
- `backend/app/core/config.py` — soporte para `CORS_ORIGINS` por variable de entorno
- `frontend/src/services/api.js` — usa `VITE_API_URL` para apuntar al backend en producción
- `render.yaml` — Blueprint para crear ambos servicios automáticamente

Haz commit y push:

```bash
git add .
git commit -m "chore: configurar despliegue en Render"
git push
```

> **Nota**: Los archivos `.env` (tanto en `backend/` como en `frontend/`) están en `.gitignore` y **NO se subirán a GitHub**. Esto es correcto por seguridad. Las variables las configurarás directamente en el dashboard de Render.

---

## Paso 2: Crear los servicios en Render

Hay dos formas:

### Opción A — Blueprint (automática, recomendada)

1. Ve a tu dashboard de Render: https://dashboard.render.com/
2. Haz clic en **"New +"** → **"Blueprint"**
3. Conecta tu repositorio de GitHub/GitLab
4. Render leerá el `render.yaml` y creará ambos servicios automáticamente
5. Render te pedirá que ingreses las variables de entorno marcadas como `sync: false`

### Opción B — Manual

#### Backend (Web Service)

1. **New +** → **Web Service**
2. Conecta tu repositorio
3. Configura:
   - **Name**: `flexibilidad-curricular-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Selecciona el plan **Free**
5. En **Environment Variables**, agrega las variables del paso 3
6. Haz clic en **Deploy Web Service**

#### Frontend (Static Site)

1. **New +** → **Static Site**
2. Conecta tu repositorio
3. Configura:
   - **Name**: `flexibilidad-curricular-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. En **Environment Variables**, agrega las variables del paso 3
5. Haz clic en **Deploy Static Site**

---

## Paso 3: Variables de entorno en Render

### ¿Qué cambia y qué se mantiene?

| Variable | ¿Cambia? | Razón |
|----------|----------|-------|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | ❌ No | Supabase es un servicio externo, la URL es la misma en local y producción |
| `SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY` | ❌ No | La clave de Supabase es la misma en cualquier entorno |
| `VITE_API_URL` | ✅ Sí | En local apunta a `localhost:8000`, en Render debe apuntar al backend desplegado |
| `CORS_ORIGINS` | ✅ Sí | Variable **nueva** que no existe en tu `.env` local. Define qué frontend puede comunicarse con el backend |

### Backend — Variables de entorno

Ve a tu **Web Service** en Render → **Environment** y agrega:

| Variable | Valor en Render |
|----------|-----------------|
| `SUPABASE_URL` | `https://jjffdfvjoitftveptavk.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_H5GAk7jCbDnW3igzq24c6Q_RnNx2K3o` |
| `CORS_ORIGINS` | `https://flexibilidad-curricular-frontend.onrender.com` |

> **Nota sobre `CORS_ORIGINS`**: Debe contener la URL **exacta** de tu frontend en Render, con `https://` y **sin barra al final**. Si necesitas múltiples orígenes (por ejemplo, también el dominio personalizado que agregues luego), sepáralos con comas: `https://app1.onrender.com, https://app2.onrender.com`

> Si aún no creaste el frontend, puedes usar `*` temporalmente como valor de `CORS_ORIGINS`, pero **cámbialo inmediatamente** cuando tengas la URL del frontend por seguridad.

### Frontend — Variables de entorno

Ve a tu **Static Site** en Render → **Environment** y agrega:

| Variable | Valor en Render |
|----------|-----------------|
| `VITE_SUPABASE_URL` | `https://jjffdfvjoitftveptavk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_H5GAk7jCbDnW3igzq24c6Q_RnNx2K3o` |
| `VITE_API_URL` | `https://flexibilidad-curricular-backend.onrender.com` |

> **Nota sobre `VITE_API_URL`**: Debe ser la URL **completa** de tu backend en Render, con `https://` y **sin barra al final**.

---

## Paso 4: Configurar CORS del backend con la URL del frontend

Una vez que el frontend esté desplegado y tengas su URL final (ej: `https://flexibilidad-curricular-frontend.onrender.com`):

1. Ve al **Web Service del backend** en Render
2. Ve a **Environment**
3. Edita la variable `CORS_ORIGINS` y pon la URL exacta de tu frontend
4. Render reiniciará el backend automáticamente

---

## Paso 5: Verificar el despliegue

### Backend
Visita `https://flexibilidad-curricular-backend.onrender.com/health`. Deberías ver:
```json
{"status": "ok"}
```

Visita `https://flexibilidad-curricular-backend.onrender.com/docs` para ver la documentación interactiva de FastAPI (Swagger UI).

### Frontend
Visita `https://flexibilidad-curricular-frontend.onrender.com`. Deberías ver la aplicación funcionando.

Abre las herramientas de desarrollador (F12) → **Network** y verifica que las peticiones a `/api/v1/...` lleguen correctamente al backend.

---

## Variables de entorno resumen

### Backend

| Variable | Valor local (`backend/.env`) | Valor en Render |
|----------|------------------------------|-----------------|
| `SUPABASE_URL` | `https://jjffdfvjoitftveptavk.supabase.co` | **Igual** |
| `SUPABASE_KEY` | `sb_publishable_H5GAk7jCbDnW3igzq24c6Q_RnNx2K3o` | **Igual** |
| `CORS_ORIGINS` | *(no existe en local)* | `https://flexibilidad-curricular-frontend.onrender.com` |

### Frontend

| Variable | Valor local (`frontend/.env`) | Valor en Render |
|----------|-------------------------------|-----------------|
| `VITE_SUPABASE_URL` | `https://jjffdfvjoitftveptavk.supabase.co` | **Igual** |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_H5GAk7jCbDnW3igzq24c6Q_RnNx2K3o` | **Igual** |
| `VITE_API_URL` | `http://localhost:8000` | `https://flexibilidad-curricular-backend.onrender.com` |

> **Importante**: en local, `VITE_API_URL` apunta a `localhost:8000` y el proxy de Vite en `vite.config.js` también redirige `/api` al backend. En Render, `VITE_API_URL` debe ser la URL pública completa del backend para que el frontend sepa a dónde enviar las peticiones.

---

## Solución de problemas comunes

### "Failed to fetch" o errores de CORS en el frontend
- Verifica que `CORS_ORIGINS` en el backend incluya la URL exacta del frontend (con `https://` y sin `/` al final).
- Verifica que `VITE_API_URL` en el frontend sea la URL del backend (sin `/` al final).
- Revisa la consola del navegador (F12) para ver el error exacto de CORS.

### El backend no arranca
- Verifica que `SUPABASE_URL` y `SUPABASE_KEY` estén configurados correctamente en las variables de entorno de Render.
- Revisa los logs del Web Service en el dashboard de Render.

### El frontend se ve en blanco
- Revisa los logs del build del Static Site en Render.
- Asegúrate de que `dist/index.html` exista (Vite genera `dist/` correctamente).
- Verifica que no haya errores de compilación en el build.

---

## Límites del plan gratuito de Render

- **Web Service**: Se duerme después de 15 minutos de inactividad. El primer request tras dormir tarda ~30-60 segundos en despertar.
- **Static Site**: Sin límites de uso, siempre activo.
- **Base de datos**: Supabase tiene su propio plan gratuito (ya lo tienes configurado).

---

## Comandos útiles para desarrollo local

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
