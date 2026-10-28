/**
 * data.js
 * -----------------------------------------------------------------------
 * Carga de datos. Cada capa se descarga UNA sola vez (fetch perezoso:
 * la de provincias se carga de inmediato porque es la vista inicial;
 * el resto se carga la primera vez que realmente se necesita) y se
 * guarda en caché en memoria para no volver a pedirla al servidor.
 * -----------------------------------------------------------------------
 */

const DataStore = (() => {

  const cache = {};

  async function cargar(nombre, ruta) {
    if (cache[nombre]) return cache[nombre];
    const resp = await fetch(ruta);
    if (!resp.ok) {
      throw new Error(`No se pudo cargar ${ruta} (HTTP ${resp.status})`);
    }
    const geojson = await resp.json();
    cache[nombre] = geojson;
    return geojson;
  }

  return {
    provincias: () => cargar('provincias', CONFIG.DATA.provincias),
    cantones: () => cargar('cantones', CONFIG.DATA.cantones),
    parroquias: () => cargar('parroquias', CONFIG.DATA.parroquias),
    inseguridad: () => cargar('inseguridad', CONFIG.DATA.inseguridad),
    unidadesAtencion: () => cargar('unidadesAtencion', CONFIG.DATA.unidadesAtencion),

    // Acceso directo a lo ya cacheado, sin disparar una nueva carga
    // (útil para módulos que solo deben leer datos que YA deberían existir)
    obtenerCache: (nombre) => cache[nombre] || null
  };

})();
