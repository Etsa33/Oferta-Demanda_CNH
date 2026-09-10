# Geoportal Oferta – Demanda CNH

Geoportal web estático (HTML + CSS + JavaScript + Leaflet) para visualizar
las alertas de prioridad 1 y 2 del CNH por provincia, cantón y parroquia,
junto con los índices de inseguridad cantonal y la red de Unidades de
Atención. No requiere backend ni base de datos: todo corre en el navegador
a partir de archivos GeoJSON.

## 1. Estructura del proyecto

```
geoportal-cnh/
├── index.html
├── css/style.css
├── js/
│   ├── config.js      Mapeo de campos y parámetros institucionales
│   ├── utils.js       Funciones auxiliares (totales, CSV, clasificación Jenks)
│   ├── data.js        Carga perezosa (lazy) de cada capa GeoJSON
│   ├── filters.js      Estado y cascada de filtros territoriales
│   ├── map.js          Mapa Leaflet, coropléticos, capa de UA
│   ├── security.js     Círculos proporcionales de inseguridad
│   ├── charts.js        Los 3 gráficos de barras
│   ├── downloads.js     Exportación a CSV
│   └── app.js            Orquestador que conecta todo lo anterior
├── data/  (los 5 GeoJSON — ver sección 3)
├── assets/ (logo-mtdh.png, logo-gob-ec.png)
└── README.md
```

## 2. Ejecutar localmente

Como el navegador bloquea `fetch()` sobre archivos abiertos directamente
(`file://`), necesitas un servidor local mínimo. Con Python ya instalado:

```bash
cd geoportal-cnh
python -m http.server 8000
```

Abre `http://localhost:8000` en el navegador.

Si usas VS Code, la extensión **Live Server** hace lo mismo con un clic.

## 3. Datos

Los 5 archivos de `data/` ya vienen incluidos y listos:

| Archivo | Contenido | Nivel |
|---|---|---|
| `i01_alertas_09.geojson` | Alertas por provincia | Provincia |
| `i02_alertas_09.geojson` | Alertas por cantón | Cantón |
| `i03_alertas_09.geojson` | Alertas por parroquia | Parroquia |
| `indices_rob_hom25.geojson` | Índices de robos/homicidios | Cantón |
| `unidades_atencion.geojson` | Unidades de Atención (puntos) | — |

**Nota técnica:** las geometrías originales venían con una precisión de
coordenadas muy superior a la necesaria para un mapa web (más de 15
decimales, equivalente a fracciones de milímetro). Se simplificaron con
Mapshaper (conservando el 100% de las entidades — incluidas las
parroquias de Galápagos, que al usar la limpieza automática por
defecto de Mapshaper se eliminaban por error al tratarlas como
"islas residuales") y se redondeó la precisión a ~1 metro. Esto redujo
el peso total de ~20 MB a 5 MB sin alterar la lectura visual del mapa
ni ninguno de los valores de las alertas.

Para actualizar los datos el próximo mes: genera los nuevos GeoJSON con
la misma estructura de columnas (ver `js/config.js`, sección
`CAMPOS_ALERTA_POR_NIVEL` y `CAMPOS_TERRITORIALES`) y reemplaza los
archivos en `data/` manteniendo los mismos nombres. Si los nombres de
columna cambiaran, ajusta únicamente `config.js` — el resto del código
no necesita tocarse.

## 4. Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser privado o público).
2. Sube el contenido completo de esta carpeta a la raíz del repositorio.
3. Ve a **Settings → Pages**.
4. En "Source", elige la rama principal (`main`) y la carpeta `/root`.
5. Guarda. GitHub te da una URL tipo `https://tuusuario.github.io/tu-repo/`.

No hay pasos adicionales: no hay backend, ni build, ni variables de entorno.

## 5. Campos a revisar o configurar

- **`js/config.js` → `CAMPOS_ALERTA_POR_NIVEL`**: si el nombre de las
  columnas de alerta cambia entre cortes mensuales (por ejemplo, si el
  shapefile trunca los nombres de forma distinta), ajusta aquí.
- **`js/config.js` → `TOTAL_GENERAL.valor`**: el total institucional fijo
  que se muestra en el panel (actualmente 651,075). Debe actualizarse
  manualmente cada corte, ya que el brief pide un valor institucional
  visible, no uno recalculado en vivo.
- **`js/config.js` → `UA_LABELS` / `UA_ORDEN_CAMPOS`**: si se agregan o
  renombran columnas en la base de Unidades de Atención, se ajustan aquí
  y el popup se actualiza automáticamente (no hay que tocar `map.js`).

## 6. Funcionalidades implementadas

- Filtro territorial en cascada (provincia → cantón → parroquia) con
  botón "Limpiar filtros".
- Sincronización bidireccional mapa ↔ filtros: seleccionar en el `<select>`
  actualiza el mapa, y hacer clic en el mapa actualiza el `<select>`.
- Coroplético dinámico (colores por clasificación Jenks de 5 clases)
  que cambia de nivel territorial según el filtro activo.
- Panel de totales por provincia / cantón / parroquia, según el nivel activo.
- Total general institucional fijo.
- Tres gráficos de barras (provincial, cantonal, parroquial) con las 8
  categorías de alerta, actualizados dinámicamente.
- Capa de Unidades de Atención con agrupamiento (cluster) para no saturar
  el navegador con más de 4,200 puntos, y popup dinámico con todos los
  campos disponibles según el diccionario de variables.
- Herramienta de selección de Unidades de Atención (clic para
  seleccionar/deseleccionar) y descarga de la selección.
- Capa de inseguridad (robos/homicidios) con círculos proporcionales,
  clasificación Jenks de 3 clases recalculada dinámicamente, y reglas de
  visibilidad progresiva (provincia → cantón → parroquia).
- Descarga en CSV: todo el detalle parroquial, solo el filtro activo, o
  solo las Unidades de Atención seleccionadas.

## 7. Instructivo de uso rápido

1. Al abrir el Geoportal, verás el mapa con el coroplético de las 24
   provincias y sus totales de alerta.
2. Elige una provincia (en el panel izquierdo o haciendo clic en el mapa):
   el mapa se acerca a esa provincia, el coroplético cambia a sus
   cantones, y el gráfico y panel de totales provinciales se activan.
3. Elige un cantón: el coroplético cambia a las parroquias de ese cantón.
4. Elige una parroquia: se resalta en amarillo sobre el mapa y se
   actualiza el gráfico y total correspondiente.
5. Activa "Mostrar Unidades de Atención" para ver los puntos de servicio;
   haz clic sobre cualquiera para ver toda su información.
6. Activa "Índice de robos" y/o "Índice de homicidios" (con una provincia
   seleccionada) para ver los círculos de inseguridad cantonal.
7. Usa los botones de descarga en cualquier momento para exportar la
   información a CSV.

## 8. Supuestos de diseño a validar

- Al seleccionar una **parroquia**, el mapa sigue mostrando todas las
  parroquias de su cantón (para que puedas hacer clic directo en otra
  parroquia vecina), resaltando en amarillo la seleccionada y haciendo
  zoom hacia ella — en vez de ocultar por completo las demás. Si
  prefieres que solo se muestre esa única parroquia sin las vecinas,
  es un ajuste sencillo en `app.js` (función `renderizarMapaSegunEstado`).
- Los círculos de robos y homicidios, cuando ambos están activos sobre
  el mismo cantón, se dibujan ligeramente separados (no superpuestos)
  para que ambos sean visibles y clicables por separado.
