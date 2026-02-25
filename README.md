# Konek.fun - Mensajería de Alto Rendimiento

Konek es una plataforma de mensajería premium diseñada para el intercambio seguro de archivos grandes (90GB+) y comunicación en tiempo real.

## 🚀 Despliegue en Producción (konek.fun)

Este proyecto está configurado para ejecutarse en entornos de nube como **Render** o **Railway**.

### Configuración del Servidor
- **Puerto**: 5000 (Backend) / Dominio Principal (Frontend)
- **Dominio**: `https://konek.fun`
- **Base de Datos**: SQLite con persistencia habilitada mediante variables de entorno.

### Variables de Entorno Requeridas
- `PERSISTENT_DATA_PATH`: Ruta al directorio donde se guardará la base de datos `konek.db` y los archivos subidos.

## 🛠️ Tecnologías
- **Frontend**: React + Vite + Tailwind/CSS
- **Backend**: Node.js + Socket.io
- **Base de Datos**: SQLite3
- **Gestión de Archivos**: Sistema de fragmentación (chunking) de 10MB para archivos masivos.

## 📦 Instalación Local
1. `npm install`
2. `npm run dev` (Frontend)
3. `npm start` (Backend)

---
© 2026 Konek Fun. Todos los derechos reservados.
