from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, properties, favorites, alerts, comunas, admin
from app.routers import feedback  # paso 81: opiniones
from app.routers import admin_panel  # paso 84: panel del administrador
from app.routers import admin_usuarios  # paso 85: usuarios para el administrador
from app.routers import announcements  # paso 87: anuncios
from app.routers import reportes  # paso 109: reportes (administrador y analista)
from app.routers import reportes_buscador  # paso 123d: buscador de remates y personas en Reportes
from app.routers import auditoria  # paso 111: registro de actividad para el administrador
from app.routers import admin_catalogo  # paso 114: quitar una publicación del catálogo y volver a publicarla
from app.routers import recuperacion  # paso 117: recuperar la contraseña con un código por correo
from app.routers import precio_comuna  # paso 120b: precio del remate frente a su comuna
from app.routers import admin_cargas  # paso 121: historial de las cargas de remates
from app.routers import pagos  # paso 122d: pago del plan Premium con Webpay
from app.routers import admin_pagos  # paso 122e: pagos del plan Premium para el administrador
from app.routers import mapa  # paso 124a: ubicación de los remates en el mapa
from app.routers import descargas  # paso A16: descargar la app para Android desde la web

app = FastAPI(title="HouseGreen API")

# Paso A0: desde qué páginas el navegador puede llamar a la API (CORS). Cualquier otro sitio queda fuera.
ORIGENES_PERMITIDOS = [
    "http://localhost:5173",  # la web (npm run dev)
    "http://localhost:4200",  # la app en el navegador (npm start en HouseGreenM)
    "http://localhost:8100",  # la app con "ionic serve", por si se usa
    "https://localhost",  # la app instalada en Android (Capacitor, con su configuración por defecto)
    "http://localhost",  # paso A15: la app instalada en Android, como la arma HouseGreenM (androidScheme http)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(favorites.router)
app.include_router(alerts.router)
app.include_router(comunas.router)
app.include_router(admin.router)
app.include_router(feedback.router)
app.include_router(feedback.router_admin)  # paso 83: opiniones para el administrador
app.include_router(admin_panel.router)
app.include_router(admin_usuarios.router)
app.include_router(announcements.router_admin)
app.include_router(announcements.router)  # paso 89: anuncios para quien los recibe
app.include_router(reportes.router)  # paso 109
app.include_router(auditoria.router)  # paso 111
app.include_router(admin_catalogo.router)  # paso 114
app.include_router(recuperacion.router)  # paso 117
app.include_router(precio_comuna.router)  # paso 120b
app.include_router(admin_cargas.router)  # paso 121
app.include_router(pagos.router)  # paso 122d
app.include_router(admin_pagos.router)  # paso 122e
app.include_router(mapa.router)  # paso 124a
app.include_router(reportes_buscador.router)  # paso 123d
app.include_router(descargas.router)  # paso A16

admin.CARPETA_UPLOADS.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=admin.CARPETA_UPLOADS), name="uploads")

@app.get("/")
def read_root():
    return {"mensaje": "HouseGreen API funcionando"}
