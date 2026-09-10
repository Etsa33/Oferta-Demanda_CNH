/**
 * map.js
 * -----------------------------------------------------------------------
 * Todo lo relacionado con Leaflet: el mapa base, la capa territorial
 * (coroplético de provincia, cantón o parroquia según el filtro activo),
 * el resaltado de la entidad seleccionada, y la capa de puntos de
 * Unidades de Atención con agrupamiento (cluster) para que 4,262 puntos
 * no saturen el navegador.
 * -----------------------------------------------------------------------
 */

const MapModule = (() => {

  let map = null;
  let capaTerritorial = null;   // capa GeoJSON activa (provincia | cantón | parroquia)
  let capaResaltado = null;     // contorno de la entidad seleccionada
  let capaUA = null;            // MarkerClusterGroup de Unidades de Atención
  let uaVisible = false;
  const uaSeleccionadas = new Map(); // co_siimies -> feature, para la herramienta de selección
  let modoSeleccionUA = false;

  function iniciar() {
    map = L.map('mapa', {
      center: [-1.5, -78.4],
      zoom: 6,
      minZoom: 5,
      maxZoom: 18
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    capaResaltado = L.geoJSON(null, {
      style: { color: CONFIG.COLORES.amarillo, weight: 3, fillOpacity: 0, dashArray: '4,3' }
    }).addTo(map);

    return map;
  }

  function getMap() { return map; }

  /** Construye el estilo de relleno (color) de un feature según su clase Jenks.
   *  El borde usa un tono azul oscuro semi-transparente en vez de blanco, para
   *  que el límite se distinga incluso sobre las clases más claras de la escala. */
  function estiloPorClase(valor, cortes) {
    if (valor === 0) {
      return { fillColor: CONFIG.COLORES.sinDato, color: CONFIG.COLORES.azulOscuro, weight: 1, opacity: 0.55, fillOpacity: 0.75 };
    }
    const idx = Utils.indiceClase(valor, cortes);
    return {
      fillColor: CONFIG.ESCALA_COROPLETICO[idx] || CONFIG.ESCALA_COROPLETICO[CONFIG.ESCALA_COROPLETICO.length - 1],
      color: CONFIG.COLORES.azulOscuro,
      weight: 1.3,
      opacity: 0.65,
      fillOpacity: 0.8
    };
  }

  /**
   * Dibuja la capa territorial (reemplaza la anterior si existía).
   * @param {'provincia'|'canton'|'parroquia'} nivel
   * @param {Array} features - features ya filtrados al alcance correspondiente
   * @param {function} onClickFeature - callback(codigo, nombre) al hacer clic
   */
  function renderTerritorial(nivel, features, onClickFeature) {
    if (capaTerritorial) {
      map.removeLayer(capaTerritorial);
      capaTerritorial = null;
    }
    limpiarResaltado();

    const campos = CONFIG.CAMPOS_TERRITORIALES[nivel];
    const valores = features.map(f => Utils.totalFeature(f.properties, nivel));
    const cortes = Utils.cortesJenks(valores.filter(v => v > 0), 5);

    const coleccion = { type: 'FeatureCollection', features };

    capaTerritorial = L.geoJSON(coleccion, {
      style: (feature) => {
        const total = Utils.totalFeature(feature.properties, nivel);
        return estiloPorClase(total, cortes);
      },
      onEachFeature: (feature, layer) => {
        const nombre = Utils.tituloCaso(feature.properties[campos.nombre]);
        const codigo = feature.properties[campos.codigo];
        const total = Utils.totalFeature(feature.properties, nivel);

        layer.bindTooltip(`<strong>${nombre}</strong><br>Total alertas: ${Utils.formatoNumero(total)}`, { sticky: true });

        layer.on({
          mouseover: (e) => e.target.setStyle({ weight: 3, opacity: 1, color: CONFIG.COLORES.azulOscuro }),
          mouseout: (e) => capaTerritorial.resetStyle(e.target),
          click: () => onClickFeature(codigo, nombre)
        });
      }
    }).addTo(map);

    try {
      map.fitBounds(capaTerritorial.getBounds(), { padding: [20, 20] });
    } catch (e) { /* colección vacía; se ignora */ }

    return { cortes };
  }

  /** Dibuja un contorno amarillo resaltando la entidad actualmente seleccionada. */
  function resaltarSeleccion(nivel, feature) {
    limpiarResaltado();
    if (!feature) return;
    capaResaltado.addData(feature);
  }

  function limpiarResaltado() {
    if (capaResaltado) capaResaltado.clearLayers();
  }

  // ------------------------- Unidades de Atención -------------------------

  function construirPopupUA(props) {
    const filas = CONFIG.UA_ORDEN_CAMPOS
      .filter(campo => props[campo] !== undefined && props[campo] !== null && props[campo] !== '')
      .map(campo => {
        const etiqueta = CONFIG.UA_LABELS[campo] || campo;
        let valor = props[campo];
        if (campo === 'link_ubi') {
          valor = `<a href="${valor}" target="_blank" rel="noopener">Ver en Google Maps</a>`;
        }
        return `<tr><td class="popup-ua-label">${etiqueta}</td><td class="popup-ua-valor">${valor}</td></tr>`;
      }).join('');
    return `<div class="popup-ua"><table>${filas}</table></div>`;
  }

  // Íconos de triángulo (divIcon con CSS), normal y seleccionado, creados una
  // sola vez y reutilizados en todos los marcadores para que sea eficiente.
  const iconoUANormal = L.divIcon({
    className: 'ua-icono-wrapper',
    html: '<div class="ua-triangulo"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 13],
    popupAnchor: [0, -12]
  });
  const iconoUASeleccionada = L.divIcon({
    className: 'ua-icono-wrapper',
    html: '<div class="ua-triangulo ua-triangulo--seleccionada"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 16],
    popupAnchor: [0, -14]
  });

  async function inicializarCapaUA() {
    const geojson = await DataStore.unidadesAtencion();

    capaUA = L.markerClusterGroup({
      maxClusterRadius: 45,
      disableClusteringAtZoom: 15
    });

    geojson.features.forEach(feature => {
      const [lon, lat] = feature.geometry.coordinates;
      const codigo = feature.properties.co_siimies;
      const marker = L.marker([lat, lon], { icon: iconoUANormal });
      marker.bindPopup(construirPopupUA(feature.properties), { maxWidth: 340, minWidth: 260 });
      marker.on('click', () => {
        if (!modoSeleccionUA) return;
        toggleSeleccionUA(codigo, feature, marker);
      });
      marker._uaCodigo = codigo;
      marker._uaFeature = feature;
      capaUA.addLayer(marker);
    });

    return capaUA;
  }

  function toggleSeleccionUA(codigo, feature, marker) {
    if (uaSeleccionadas.has(codigo)) {
      uaSeleccionadas.delete(codigo);
      marker.setIcon(iconoUANormal);
    } else {
      uaSeleccionadas.set(codigo, feature);
      marker.setIcon(iconoUASeleccionada);
    }
    Bus.dispatchEvent(new CustomEvent('ua:seleccion-cambio', { detail: { total: uaSeleccionadas.size } }));
  }

  function setModoSeleccionUA(activo) {
    modoSeleccionUA = activo;
  }

  function limpiarSeleccionUA() {
    uaSeleccionadas.forEach((feature, codigo) => {
      capaUA.eachLayer(m => { if (m._uaCodigo === codigo) m.setIcon(iconoUANormal); });
    });
    uaSeleccionadas.clear();
    Bus.dispatchEvent(new CustomEvent('ua:seleccion-cambio', { detail: { total: 0 } }));
  }

  function getUASeleccionadas() {
    return Array.from(uaSeleccionadas.values());
  }

  async function toggleCapaUA(visible) {
    if (!capaUA) {
      await inicializarCapaUA();
    }
    uaVisible = visible;
    if (visible) {
      map.addLayer(capaUA);
    } else if (map.hasLayer(capaUA)) {
      map.removeLayer(capaUA);
    }
  }

  return {
    iniciar, getMap, renderTerritorial, resaltarSeleccion, limpiarResaltado,
    toggleCapaUA, setModoSeleccionUA, limpiarSeleccionUA, getUASeleccionadas
  };

})();
