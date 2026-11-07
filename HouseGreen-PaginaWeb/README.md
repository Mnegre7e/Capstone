# HouseGreen

Plataforma web para revisar remates de propiedades de la Región Metropolitana.
Cada remate se muestra con un semáforo de riesgo (verde, amarillo o rojo) que ayuda
al inversionista a decidir cuáles vale la pena estudiar. El detalle completo es parte del plan Premium.

## Qué contiene esta carpeta

Esta carpeta (`HouseGreen-PaginaWeb`) es la parte web del repositorio
[Capstone](https://github.com/Mnegre7e/Capstone). Todas las rutas de este README parten desde aquí.

| Carpeta | Qué es |
|---|---|
| `housegreen-api` | API en FastAPI + SQLAlchemy. Incluye la carga de remates (scraper). |
| `housegreen-web` | Sitio web en React + Vite + TypeScript. |

Servicios externos:

| Servicio | Para qué |
|---|---|
| Neon (PostgreSQL) | La base de datos. |
| Cloudinary | Las fotos de las propiedades. |
| Gmail del proyecto | Los correos (anuncios y código para cambiar la contraseña). |
| Transbank Webpay | El pago del plan Premium. |
| OpenStreetMap | El mapa y la ubicación de los remates. |
| GitHub Actions | La carga automática de los remates, todos los días. |

## Requisitos

- Git
- Python 3.11
- Node.js 20.19 o superior
- La cadena de conexión de la base en Neon
- Las credenciales de la cuenta de Cloudinary
- La llave `TWO_FA_KEY` del equipo (ver "Cuentas y seguridad")
- Opcional: la contraseña de aplicación del Gmail del proyecto (sin ella los correos solo se muestran en la terminal)
- Para entrar como administrador: un teléfono con una aplicación de autenticación
  (Google Authenticator, Microsoft Authenticator u otra parecida)

## 0. Descargar el proyecto

```
git clone https://github.com/Mnegre7e/Capstone.git
cd Capstone/HouseGreen-PaginaWeb
```

Si ya lo tienes descargado, basta con traer lo último: `git pull`.

El clon trae todo lo que está en GitHub, pero **no** trae lo que el `.gitignore` deja fuera a propósito:
el archivo `.env` (las claves), la carpeta `venv` de Python ni la carpeta `node_modules` de la web.
Esas se crean en los pasos 1 y 2.

## 1. Levantar la API

Desde la carpeta `housegreen-api`:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Si la carpeta `housegreen-api` se movió de lugar, borra su carpeta `venv` y créala de nuevo:
un entorno de Python que cambia de carpeta deja de funcionar.

Crea un archivo `.env` en `housegreen-api` (copia `.env.example` y completa los valores):

```
DATABASE_URL_NEON=postgresql://usuario:clave@servidor.neon.tech/neondb?sslmode=require
SECRET_KEY=una-clave-larga-y-aleatoria
CLOUDINARY_CLOUD_NAME=nombre-de-la-nube
CLOUDINARY_API_KEY=clave
CLOUDINARY_API_SECRET=secreto
TWO_FA_KEY=la-llave-del-equipo
CORREO_USUARIO=el-gmail-del-proyecto
CORREO_CLAVE=la-contraseña-de-aplicación-de-google
```

El archivo `.env` nunca se sube al repositorio. Si alguna vez se usó en un computador prestado
(por ejemplo, en la universidad), hay que borrarlo de ese computador al terminar.

Otras variables, que solo hacen falta si se publica HouseGreen en internet o se cobra de verdad:

| Variable | Para qué | Si no está |
|---|---|---|
| `API_URL` | Dirección pública de la API (Webpay vuelve ahí después de pagar). | `http://localhost:8000` |
| `WEB_URL` | Dirección pública de la web. | `http://localhost:5173` |
| `WEBPAY_AMBIENTE` | `integracion` o `produccion`. | `integracion` |
| `WEBPAY_CODIGO_COMERCIO` y `WEBPAY_LLAVE_SECRETA` | Las que entrega Transbank al firmar el contrato (solo producción). | Las públicas de integración |

Para iniciar la API:

```
uvicorn app.main:app --reload
```

Queda en `http://localhost:8000`. La documentación de las rutas está en `http://localhost:8000/docs`.
Si cambias el `.env`, detén la API y vuelve a iniciarla: el reinicio automático no lo lee.

## 2. Levantar la web

Desde la carpeta `housegreen-web`:

```
npm install
npm run dev
```

Queda en `http://localhost:5173`. La web busca la API en `http://localhost:8000`
(se cambia en `src/api/client.ts`).

## 3. Carga de los remates

Los remates se leen de las páginas públicas de rematesinmobiliarios.cl. Todo se hace con un solo comando,
desde `housegreen-api` con el entorno activado:

```
python -m app.scraper.ingesta
```

En orden, el comando:

1. Lee la lista de remates vigentes del sitio y se queda con los de la Región Metropolitana: crea los nuevos
   y actualiza los que cambiaron de precio o de fecha.
2. Lee la ficha de los remates nuevos y de los que cambiaron. Si un remate ya no existe en el sitio,
   queda marcado como retirado.
3. Recalcula el semáforo de lo que cambió y avisa a quien tenga una alerta que calce.
4. Esconde los remates repetidos (el sitio publica algunos más de una vez): se muestra uno solo.
5. Una vez por semana, actualiza el precio típico de venta de cada comuna (PropiedadesYa).
6. Recalcula la zona de precio del semáforo de los remates vigentes.
7. Ubica en el mapa los remates nuevos o que cambiaron de dirección (OpenStreetMap).
8. Anota la carga en la tabla `ingestion_runs`. El administrador la ve en Admin › Cargas.

**Carga automática:** GitHub Actions ejecuta el mismo comando todos los días a las 06:17 de Chile
(archivo `.github/workflows/carga-remates.yml` en la raíz del repositorio). GitHub suele atrasar las tareas
programadas varias horas. Para cargar en el momento: pestaña **Actions** › *Carga diaria de remates* ›
**Run workflow**. La conexión a Neon está guardada en GitHub como secreto (`DATABASE_URL_NEON`), no en el código.

Comandos para casos puntuales:

| Comando | Qué hace |
|---|---|
| `python -m app.scraper.duplicados` | Vuelve a revisar todos los remates repetidos. |
| `python -m app.scraper.ubicaciones` | Ubica en el mapa los remates que falten. Con `--de-nuevo`, vuelve a buscar los que quedaron en el centro de su comuna. |
| `python -m app.scraper.precios_comuna` | Actualiza ahora el precio típico de cada comuna (unos 2 minutos). |
| `python -m app.scraper.zona_precio` | Recalcula ahora la zona de precio de todos los remates vigentes. |

El scraper espera 1,5 segundos entre páginas y respeta el `robots.txt` de cada sitio.

## 4. Cómo se calcula el semáforo

Son cuatro factores. Cada uno vale 0, 1 o 2 puntos, así que el máximo es 8.

| Factor | De dónde sale | 2 puntos | 1 punto | 0 puntos |
|---|---|---|---|---|
| Precio frente a su comuna | Se calcula solo (ver abajo) | Zona verde | Zona amarilla | Zona roja o sin referencia |
| Estado legal | Tipo de dominio, leído de la ficha del remate | Exclusivo | Otro (derechos, cuota, usufructo) | No especificado |
| Dinamismo del barrio | Tabla por comuna | Verde | Amarilla | Roja |
| Seguridad de la comuna | Tabla por comuna | Verde | Amarilla | Roja |

Resultado:

- 6 a 8 puntos: riesgo bajo (verde)
- 3 a 5 puntos: riesgo medio (amarillo)
- 0 a 2 puntos: riesgo alto (rojo)

Un factor sin dato vale 0 puntos y los demás suman igual. La web muestra cuánto aportó cada factor
y qué le falta a la propiedad para subir de zona.

Hay un solo veto: si la propiedad tiene usufructo vitalicio, herencia no resuelta o prohibición,
queda en riesgo alto sin importar los puntos.

Zona de precio: se compara el precio mínimo del remate con el precio típico (mediana) de las propiedades
del mismo tipo en venta en su comuna, según PropiedadesYa.

- Verde: el precio mínimo está 40 % o más bajo el precio típico.
- Amarilla: está entre 15 % y 39,9 % más bajo.
- Roja: el descuento es menor a 15 % (o es más caro).

Solo se calcula para departamentos y casas, y solo si la fuente usó al menos 20 avisos de ese tipo en la comuna.
En los demás remates la zona queda vacía (0 puntos).

El cálculo lo hace la función `calculate_score` de la base de datos. Se ejecuta al cargar un remate nuevo,
al leer su ficha y cuando cambia su zona de precio.
Si con eso la propiedad baja su nivel de riesgo, se avisa a los inversionistas que tienen una alerta
que ahora calza (ver "Sobre las alertas").

## 5. Qué puede hacer cada tipo de cuenta

| Cuenta | Qué puede hacer |
|---|---|
| Sin cuenta (invitado) | Ver el catálogo con filtros, la página del plan Premium y la política de privacidad. |
| Inversionista | Además: su Perfil, enviar opiniones, recibir anuncios y pagar el plan Premium. |
| Inversionista Premium | Además: el semáforo y su puntaje, el detalle completo de cada remate (datos del remate, fotos, precio frente a la comuna), el mapa, favoritos y alertas con sus avisos. |
| Analista | Solo Reportes (Resumen, Subastas, Usuarios y Alcance) y el buscador de remates. Ve totales, nunca nombres ni correos. |
| Administrador | Todo lo del Premium y además los apartados de abajo. |

Apartados del administrador:

| Apartado | Para qué sirve |
|---|---|
| Panel | Resumen: usuarios, publicaciones, vistas, guardados, plan Premium, última carga de remates y accesos a los demás apartados. |
| Publicaciones | Lista con vistas y guardados; quién vio y quién guardó cada una; fotos y descripción; quitar una del catálogo. |
| Semáforo | Consulta: cómo quedó el semáforo de cada remate vigente y cuáles no tienen precio de referencia. |
| Opiniones | Promedio y calificaciones recibidas, con filtros. Se puede responder solo a quien lo autorizó. |
| Anuncios | Mensajes para todos los inversionistas, para una persona o para quienes vieron o guardaron una publicación; también por correo. Muestra cuántos lo leyeron. |
| Usuarios | Personas registradas, su plan y su actividad. Se puede deshabilitar o reactivar una cuenta. |
| Reportes | Las mismas pantallas del analista, con los nombres: personas más activas, quiénes pagaron y quiénes dejaron de pagar, y el buscador de remates y personas. |
| Pagos | Todos los intentos de pago con Webpay y su resultado. |
| Cargas | Cada carga de remates: cuándo, cuánto duró y qué encontró. |
| Auditoría | Registro de actividad (inicios de sesión, cambios, anuncios...). No se puede modificar ni borrar. |

Sobre el plan Premium:

- Cuesta $9.990 por 30 días. Es un pago único con Webpay: no se renueva solo.
- Si la persona ya tenía Premium, los 30 días se suman al final.
- HouseGreen no ve ni guarda el número de la tarjeta: solo los últimos 4 dígitos.
- Mientras `WEBPAY_AMBIENTE` sea `integracion`, se paga con las tarjetas de prueba que publica Transbank
  en su sitio para desarrolladores. Conviene probar un pago en la misma red donde se va a presentar.

Sobre las alertas:

- Cada inversionista Premium puede guardar hasta 10 alertas. Cada alerta tiene al menos una de estas condiciones:
  comuna, nivel de riesgo máximo que acepta y precio máximo.
- La página Alertas muestra cuántos remates vigentes cumplen hoy cada alerta.
- Se recibe un aviso cuando entra un remate nuevo que calza y cuando un remate baja su nivel de riesgo
  y ahora calza.
- Aunque un remate calce con varias alertas de la misma persona, ella recibe un solo aviso.
- Los avisos llegan dentro de HouseGreen, no por correo.

Sobre los anuncios:

- El inversionista los ve en la página Alertas, y el número rojo del encabezado le avisa cuántos
  anuncios y avisos tiene sin leer. Si el administrador lo marca, también llegan por correo.
- Un anuncio cuenta como leído cuando la persona lo abre.
- Solo los reciben los inversionistas con la cuenta habilitada.
- Un anuncio enviado no se puede retirar ni borrar desde la web.

Sobre el catálogo y el mapa:

- No muestran los remates que ya se realizaron, los que el sitio de origen retiró ni los repetidos.
  Siguen en la base y aparecen en Favoritos con una etiqueta.
- El filtro por tipo agrupa los nombres que usa el sitio de remates en 8 categorías
  (departamentos, casas, terrenos, parcelas, oficinas y locales, bodegas, derechos y otros).
  La agrupación está en `housegreen-web/src/components/tipoPropiedad.ts` y, para los reportes,
  en `housegreen-api/app/routers/reportes.py` (`categoria_de_tipo`): si se cambia una, se cambia la otra.
- En el mapa, cada remate está en su dirección exacta, solo en su calle o en el centro de su comuna,
  según lo que encontró OpenStreetMap.

## 6. Cuentas y seguridad

### Contraseñas

Deben tener entre 8 y 64 caracteres, con al menos una letra y un número.
La regla se aplica al registrarse y al cambiar la contraseña desde el Perfil. Está definida en dos lugares
que deben decir lo mismo:

- API: `housegreen-api/app/auth/security.py` (función `problema_de_contrasena`)
- Web: `housegreen-web/src/utils/contrasena.ts`

Después de 5 intentos fallidos en 15 minutos, ese correo debe esperar antes de volver a intentar.
Quien olvida su contraseña la cambia desde "¿Olvidaste tu contraseña?": le llega un código por correo
que vence a los 15 minutos.

### Verificación en dos pasos (2FA)

Además de la contraseña, la cuenta puede pedir un código de 6 dígitos que cambia cada 30 segundos
y que genera una aplicación en el teléfono. El código no llega por correo.

- **Inversionista:** es opcional. Se activa y se desactiva en el Perfil.
- **Administrador:** es obligatoria. Mientras no la active puede entrar a su Perfil, pero no al panel
  de administración. Una vez activada no se puede desactivar.

Para activarla: Perfil → Verificación en dos pasos → Activar, escanear el código QR con la aplicación
y confirmar con el código que muestra.

Si varias personas comparten una misma cuenta de administrador, todas deben escanear el mismo código QR
en el momento de activarla.

### La llave `TWO_FA_KEY`

La clave de dos pasos de cada persona se guarda cifrada en la base, y `TWO_FA_KEY` es la llave que la cifra.

- **Todo el equipo debe tener la misma** en su `.env`, porque la base es compartida.
  Con otra llave, la API no puede validar los códigos.
- **No se cambia.** Si se cambia, las cuentas que ya tienen 2FA dejan de poder entrar.
- **No se sube al repositorio** ni se comparte por canales públicos.

Solo si el proyecto parte desde cero (una base nueva) se genera una llave nueva con:

```
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Recuperar una cuenta que perdió su aplicación

Si alguien pierde el teléfono o borra la cuenta de su aplicación, se le quita el 2FA desde el SQL Editor
de Neon y lo vuelve a activar desde su Perfil:

```sql
UPDATE users SET two_fa_enabled = false, two_fa_secret = NULL
WHERE email = 'correo@ejemplo.com';
```

### Crear una cuenta de administrador o de analista

Las cuentas nuevas siempre se crean como inversionista. Para cambiar el tipo de una cuenta:

```sql
UPDATE users SET role_id = 3 WHERE email = 'correo@ejemplo.com';  -- administrador
UPDATE users SET role_id = 2 WHERE email = 'correo@ejemplo.com';  -- analista
```

Los roles son: 1 inversionista, 2 analista y 3 administrador.

### Privacidad

La política de privacidad está en `/privacidad` (archivo `housegreen-web/src/pages/PrivacidadPage.tsx`).
Si cambia algo de lo que HouseGreen hace con los datos personales, hay que actualizar ese texto y su versión.

## 7. Base de datos

Tablas y columnas que usa el semáforo:

| Objeto | Para qué sirve |
|---|---|
| `comuna_risk_index` | Seguridad de cada comuna. |
| `comuna_dynamism_index` | Dinamismo de cada comuna (52 comunas de la Región Metropolitana). |
| `comuna_market_prices` | Precio típico de venta por comuna y tipo (PropiedadesYa). |
| `property_financial_info.market_zone` | Zona de precio del remate (se calcula sola). |
| `property_legal_info.domain_type` | Tipo de dominio: `exclusivo`, `otro` o vacío. |
| `property_auction_info` | Datos leídos de la ficha: tribunal, rol, modalidad, garantía, anuncio. |
| `property_evaluations` | Resultado de cada evaluación. `missing_data` anota qué datos faltaban. |
| `evaluation_details` | Puntos de cada factor en cada evaluación. |
| `calculate_score(uuid)` | Función que calcula el semáforo de una propiedad. |
| `zone_points(semaforo_level)` | Convierte una zona en puntos: verde 2, amarillo 1, rojo 0. |

Remates, mapa y cargas:

| Objeto | Para qué sirve |
|---|---|
| `properties` | Los remates. `duplicate_of` apunta al remate original si es un repetido; `removed_at` si el administrador lo quitó del catálogo. |
| `property_locations` | Dónde está cada remate en el mapa y con qué precisión. |
| `comuna_locations` | Centro y borde de cada comuna. |
| `ingestion_runs` | Una fila por cada carga de remates (manual o automática). |

Tablas de usuarios y de uso de la aplicación:

| Objeto | Para qué sirve |
|---|---|
| `users` | Cuentas. `two_fa_enabled` y `two_fa_secret` guardan la verificación en dos pasos; `is_active` permite deshabilitar una cuenta; `premium_until` dice hasta cuándo tiene el plan. |
| `roles` | Los tres tipos de cuenta. |
| `payments` | Cada intento de pago con Webpay y su resultado. |
| `password_resets` | Códigos para cambiar la contraseña (solo se guarda su huella, nunca el código). |
| `audit_logs` | Registro de actividad. Un disparador impide modificarlo o borrarlo. |
| `property_views` | Cada vez que un inversionista abre el detalle de una propiedad. |
| `saved_properties` | Favoritos de cada persona. |
| `property_photos` | Fotos de cada propiedad (los archivos están en Cloudinary). |
| `feedback` | Opiniones: calificación de 1 a 5, tema, mensaje y si la persona acepta respuesta. |
| `feedback_replies` | Respuestas del administrador a las opiniones. |
| `announcements` | Anuncios enviados por el administrador: título, mensaje y a quiénes iba (`audience`). |
| `announcement_recipients` | Una fila por cada persona que recibió un anuncio. `read_at` guarda cuándo lo leyó (vacío = sin leer). |
| `saved_filters` | Alertas de cada inversionista: comuna, nivel de riesgo máximo y precio máximo. |
| `alerts` | Avisos que recibió cada inversionista y si ya los leyó. |

Para recalcular el semáforo de todas las propiedades, en el SQL Editor de Neon:

```sql
SELECT zona, count(*) AS propiedades
  FROM (SELECT calculate_score(id) AS zona FROM properties) AS t
 GROUP BY zona
 ORDER BY zona;
```

## 8. Antes de subir cambios

Dentro de `housegreen-web`, para revisar el código y confirmar que la web compila:

```
npm run lint
npm run build
```

Las dos deben terminar sin errores.

Y desde la carpeta raíz del repositorio (`Capstone`):

```
git pull
git add .
git status
git commit -m "Qué se hizo"
git push
```

El `git pull` va primero: trae lo que subieron los demás (el repositorio es compartido con la app móvil
y los documentos); si no se hace, GitHub puede rechazar el `push`.
Antes del `commit`, revisa en `git status` que no aparezca ningún archivo `.env` ni archivos que no
reconozcas. (Si pegas en la consola líneas que empiezan con `>`, la consola crea archivos vacíos con ese nombre.)

## 9. Estado del proyecto

Al 7 de noviembre de 2026.

Funcionando: carga automática diaria de los remates reales (con repetidos escondidos, precio por comuna
y ubicación en el mapa), catálogo, semáforo con sus cuatro factores calculados solos, detalle de cada remate,
mapa, plan Premium con Webpay (ambiente de integración), favoritos, alertas con sus avisos, perfil,
verificación en dos pasos, recuperar la contraseña por correo, opiniones, anuncios (también por correo),
reportes del analista y del administrador con buscador, y los apartados del administrador.

Pendiente:

- Publicar la web y la API en internet (hoy funcionan en un computador del equipo).
- Pruebas automáticas de la API (PyTest).
- Cobrar de verdad: requiere contrato con Transbank (cambiar a `produccion`).
- Autorización escrita de rematesinmobiliarios.cl para reproducir su contenido.

## 10. Fuente de los datos

Los remates provienen de las páginas públicas de [rematesinmobiliarios.cl](https://www.rematesinmobiliarios.cl).
Cada ficha de HouseGreen enlaza a la publicación original. El precio típico de cada comuna proviene de
[PropiedadesYa](https://propiedadesya.com) y el mapa, de [OpenStreetMap](https://www.openstreetmap.org).

El scraper respeta el `robots.txt` de los sitios. Los términos de rematesinmobiliarios.cl piden autorización
escrita para reproducir su contenido: el equipo tiene pendiente solicitarla.

HouseGreen es un proyecto académico. La información es de referencia y no reemplaza la revisión de los
documentos de cada remate: antes de ofertar hay que verificar las deudas, el avalúo y las inscripciones
en los sitios oficiales (la web indica cómo en cada propiedad).
