# Konek - WhatsApp para Raspberry Pi con Archivos Ilimitados

Esta es tu aplicación lista para ser usada en la Raspberry Pi.

## Cómo instalar en tu Raspberry Pi (192.168.0.53)

1. **Copia esta carpeta** (`Konek`) a tu Raspberry Pi. Puedes usar una memoria USB o el comando `scp`.
2. **Entra en la terminal** de la Raspberry Pi.
3. **Navega hasta la carpeta**: `cd Konek`
4. **Dale permisos al script**: `chmod +x setup_pi.sh`
5. **Ejecuta la instalación**: `./setup_pi.sh`

## Notas Importantes

- **Almacenamiento**: Los archivos se guardan en `Konek/server/uploads`. Si vas a enviar archivos de 90GB, te recomiendo mover esta carpeta a un disco duro externo:
  `ln -s /media/tu_disco_externo/uploads server/uploads`
- **Acceso**: Una vez encendida, entra desde cualquier dispositivo en tu casa usando:
  `http://192.168.0.53:5173`

## Funcionalidades
- **Estilo WhatsApp**: Interfaz oscura premium.
- **Archivos de 90GB+**: El sistema divide los archivos en trozos de 10MB para que no fallen nunca.
- **Privacidad Local**: Todo queda guardado en tu propia Raspberry Pi.
