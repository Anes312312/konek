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
3. En tu panel de Hostinger:
   - Crea un registro **CNAME** para `www` apuntando al host de Render (ej: `konek-fun.onrender.com`).
   - Crea un registro **A** apuntando a la IP que te proporcione Render.

---
🚀 ¡Tu aplicación estará en línea y segura con HTTPS en pocos minutos!
