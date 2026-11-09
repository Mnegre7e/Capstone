# Ícono y portada de la app para Android (paso A16)

- `res/` tiene el ícono (el semáforo de HouseGreen, igual que `public/favicon.svg` de la web) y la portada
  (la pantalla verde que se ve mientras abre la app).
- `npm run android` (y `npm run android:apk`) los copia a `android/app/src/main/res`, encima de los de Capacitor.
- Tamaños: ícono 48 a 192 px (`mipmap-*`), ícono adaptable 108 a 432 px (`ic_launcher_foreground`, solo las luces;
  el fondo verde está en `values/ic_launcher_background.xml`) y portadas de 320x480 a 1280x1920 (`drawable-*`).
- Para cambiar el color de fondo: `values/ic_launcher_background.xml` y `values/housegreen_colores.xml`.
