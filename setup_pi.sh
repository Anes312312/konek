#!/bin/bash

# Script de instalación para Konek en Raspberry Pi
echo "--- Instalando Konek ---"

# 1. Instalar Node.js y NPM si no existen
if ! command -v node &> /dev/null
then
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Instalar dependencias del servidor
echo "Configurando el servidor..."
cd server
npm install
cd ..

# 3. Instalar dependencias del frontend y compilar
echo "Configurando el frontend..."
npm install --legacy-peer-deps
npm run build

# 4. Iniciar servicios
echo "Iniciando servidor backend en puerto 5000..."
cd server
node index.js &

echo "Sirviendo frontend en puerto 5173 (usando Vite)..."
cd ..
npm run dev -- --host 0.0.0.0
