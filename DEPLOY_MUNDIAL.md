# Deploy Konek Fun to the World 🚀

Esta es la guía definitiva para poner a **Konek Fun** en línea con tu dominio `https://konek.fun/`.

## 1. Subir a GitHub (Recomendado)

Render y Railway necesitan tu código en GitHub para funcionar.
1. Crea un repositorio en GitHub llamado `konek-fun`.
2. En tu terminal local:
   ```bash
   git init
   git add .
   git commit -m "🚀 Ready for worldwide deployment"
   git branch -M main
   git remote add origin TU_URL_DE_GITHUB
   git push -u origin main
   ```

## 2. Despliegue en Render (Gratis o Bajo Costo)

1. Ve a [Render.com](https://render.com) y crea un **Web Service**.
2. Conecta tu repositorio de GitHub.
3. Configuración:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. **Configurar Persistencia (IMPORTANTE)**:
   - Ve a la pestaña **Disk**.
   - Haz clic en **Add Disk**.
   - Name: `data`
   - Mount Path: `/opt/render/project/src/data` (Solo un ejemplo, mejor configurar env vars)
   - Ve a **Environment Vars** y agrega:
     - `PERSISTENT_DATA_PATH`: `/opt/render/project/src/server/data` (Donde guardaremos la DB)

## 3. Conectar Dominio Konek.fun

1. En Render, ve a **Settings** -> **Custom Domains**.
2. Agrega `konek.fun` y `www.konek.fun`.
3. En tu panel de Hostinger (DNS):
   - **Registro A**: Nombre `@` -> Apuntar a la IP de Render (Ejemplo: `216.24.57.1`).
   - **Registro CNAME**: Nombre `www` -> Apuntar al host de Render (Ejemplo: `konek-fun.onrender.com`).

---

## 🛠 Solución de Errores Comunes

### 1. Error: "The train has not arrived at the station" (Railway 404)
Si ves este mensaje con el logo de **Railway**, significa que tu dominio `konek.fun` todavía está apuntando a los servidores de Railway en lugar de los de Render.
- **Causa**: Tienes un registro **A** o **CNAME** antiguo en Hostinger que apunta a Railway.
- **Solución**: Borra todos los registros DNS que apunten a Railway y asegúrate de que solo existan los de Render (IP `216.24.57.1` o la que te indique Render en su panel).

### 2. El servidor no inicia o "Firestore no disponible"
- **Causa**: No has agregado las Variables de Entorno en el panel de Render/Railway.
- **Solución**: Ve a **Environment Variables** en el dashboard y agrega:
  - `PORT`: `5000` (Render lo asigna solo, pero es bueno tenerlo).
  - `FIREBASE_SERVICE_ACCOUNT`: El contenido JSON de tu archivo de credenciales de Firebase.

### 3. El servidor se "duerme" en Render (Plan Gratis)
Render apaga el servidor si nadie lo usa por 15 minutos. 
**Truco para que esté 24/7 despierto:**
1. Ve a **[cron-job.org](https://cron-job.org/)** (es gratis).
2. Crea un nuevo Cronjob.
3. Pon la URL: `https://konek.fun/api/ping`
4. Pon que se ejecute cada **10 minutos**.
5. ¡Listo! Render nunca se dormirá y el chat será instantáneo.

---

## ⚡ Alternativa Mejor: Zeabur (Gratis y No se Duerme)

Si no quieres lidiar con que Render se apague, **Zeabur** es excelente para proyectos como Konek:
1. Entra en [Zeabur](https://zeabur.com/).
2. Conecta tu GitHub.
3. Selecciona tu repositorio "Konek".
4. **Lo mejor**: No hiberna y detecta automáticamente que es una app de Node.js + React.
5. Agrega las mismas variables de entorno y ¡estás listo!

---
🚀 ¡Tu aplicación estará en línea y segura con HTTPS en pocos minutos!
