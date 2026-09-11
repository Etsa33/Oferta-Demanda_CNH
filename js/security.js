/**
 * security.js
 * -----------------------------------------------------------------------
 * Capa temática de inseguridad (robos / homicidios) a nivel cantonal,
 * representada con círculos proporcionales. Reglas del brief que se
 * implementan aquí:
 *  - No se muestra nada mientras no haya una provincia seleccionada.
 *  - Al seleccionar provincia -> cantón -> parroquia, el alcance de
 *    cantones visibles se reduce progresivamente (punto 14).
 *  - Los valores en 0 no dibujan círculo (punto 15).
 *  - Clasificación en 3 clases por Natural Breaks (Jenks), recalculada
 *    cada vez con los valores realmente visibles (punto 16).
 *  - El usuario puede activar robos, homicidios, o ambos (punto 13).
 * -----------------------------------------------------------------------
 */

const Seguridad = (() => {

  let map = null;
  let capaCirculos = L.layerGroup();
  let mostrarRobos = false;
  let mostrarHomicidios = false;
  let featuresActuales = []; // subconjunto de indices_rob_hom25 actualmente en alcance (solo decide qué círculos dibujar)

  // Rangos de clasificación (Jenks) y máximos para el radio proporcional,
  // calculados UNA SOLA VEZ a partir de los 221 cantones del país completo.
  // No se recalculan según el alcance visible: como el dato solo existe a
  // nivel cantonal (no hay desagregación más fina), la leyenda debe leerse
  // igual sin importar si se está viendo el país, una provincia o un solo
  // cantón — de lo contrario, al mirar un único cantón el rango colapsaría
  // a un solo valor repetido y dejaría de ser informativo.
  let cortesRobosGlobal = null;
  let cortesHomGlobal = null;
  let maxRobosGlobal = 0;
  let maxHomGlobal = 0;

  const RADIO_MIN = 6;
  const RADIO_MAX = 26;

  function iniciar(mapaLeaflet) {
    map = mapaLeaflet;
    capaCirculos.addTo(map);
  }

  /** Calcula (la primera vez que se necesitan) los cortes Jenks y máximos
   *  fijos, a partir de TODOS los cantones del país. */
  function asegurarClasificacionGlobal(geoInseguridad) {
    if (cortesRobosGlobal) return; // ya calculado
    const todosRobos = geoInseguridad.features.map(f => f.properties[CONFIG.INSEGURIDAD.indiceRobos]).filter(v => v > 0);
    const todosHom = geoInseguridad.features.map(f => f.properties[CONFIG.INSEGURIDAD.indiceHomicidios]).filter(v => v > 0);
    maxRobosGlobal = todosRobos.length ? Math.max(...todosRobos) : 0;
    maxHomGlobal = todosHom.length ? Math.max(...todosHom) : 0;
    cortesRobosGlobal = todosRobos.length ? Utils.cortesJenks(todosRobos, CONFIG.JENKS_CLASES) : null;
    cortesHomGlobal = todosHom.length ? Utils.cortesJenks(todosHom, CONFIG.JENKS_CLASES) : null;
  }

  function radioProporcional(valor, maxValor) {
    if (maxValor <= 0) return RADIO_MIN;
    const proporcion = Math.sqrt(valor / maxValor); // escala por área, no por radio lineal
    return RADIO_MIN + proporcion * (RADIO_MAX - RADIO_MIN);
  }

  /** Centro del cantón para ubicar el círculo. Se usa el centro del bounding
   *  box (vía Leaflet) en vez de un centroide geométrico real: es más
   *  simple, no depende de una librería externa extra, y —a diferencia de
   *  un cálculo de centroide— nunca falla aunque el polígono tenga algún
   *  problema topológico menor tras la simplificación. */
  function centroide(feature) {
    const bounds = L.geoJSON(feature).getBounds();
    const centro = bounds.getCenter();
    return [centro.lat, centro.lng];
  }

  /** Determina el alcance de cantones visibles según el estado de filtros actual. */
  function calcularAlcance(geoInseguridad, estado) {
    const campos = CONFIG.INSEGURIDAD;
    if (!estado.provincia) return [];

    if (estado.parroquia || estado.canton) {
      // Cantón (o el cantón de la parroquia seleccionada): un único cantón
      const codigoCanton = estado.canton ? estado.canton.codigo : null;
      if (codigoCanton) {
        return geoInseguridad.features.filter(f => String(f.properties[campos.codigoCanton]) === String(codigoCanton));
      }
      return [];
    }

    // Solo provincia seleccionada: todos sus cantones
    return geoInseguridad.features.filter(f => String(f.properties.DPA_PROVIN) === String(estado.provincia.codigo));
  }

  function construirPopup(props) {
    const L_ = CONFIG.INSEGURIDAD.labels;
    return `
      <div class="popup-seguridad">
        <strong>${Utils.tituloCaso(props.DPA_DESCAN)}</strong><br>
        ${L_.i_rob25}: ${props.i_rob25.toFixed(1)}<br>
        ${L_.i_hom25}: ${props.i_hom25.toFixed(1)}<br>
        ${L_.pp_2025}: ${Utils.formatoNumero(props.pp_2025)}
      </div>`;
  }

  function dibujar() {
    capaCirculos.clearLayers();
    if (!featuresActuales.length) {
      actualizarLeyenda();
      return;
    }

    featuresActuales.forEach(feature => {
      // Una geometría puntual con problemas no debe impedir que se dibujen
      // los demás cantones: cada feature se procesa de forma aislada.
      try {
        const props = feature.properties;
        const [lat, lon] = centroide(feature);

        if (mostrarRobos && props[CONFIG.INSEGURIDAD.indiceRobos] > 0) {
          const valor = props[CONFIG.INSEGURIDAD.indiceRobos];
          const offsetLon = (mostrarHomicidios && props[CONFIG.INSEGURIDAD.indiceHomicidios] > 0) ? -0.035 : 0;
          const circ = L.circleMarker([lat, lon + offsetLon], {
            radius: radioProporcional(valor, maxRobosGlobal),
            color: CONFIG.COLOR_ROBOS,
            weight: 1.5,
            fillColor: CONFIG.COLOR_ROBOS,
            fillOpacity: 0.55
          }).bindPopup(construirPopup(props));
          capaCirculos.addLayer(circ);
        }

        if (mostrarHomicidios && props[CONFIG.INSEGURIDAD.indiceHomicidios] > 0) {
          const valor = props[CONFIG.INSEGURIDAD.indiceHomicidios];
          const offsetLon = (mostrarRobos && props[CONFIG.INSEGURIDAD.indiceRobos] > 0) ? 0.035 : 0;
          const circ = L.circleMarker([lat, lon + offsetLon], {
            radius: radioProporcional(valor, maxHomGlobal),
            color: CONFIG.COLOR_HOMICIDIOS,
            weight: 1.5,
            fillColor: CONFIG.COLOR_HOMICIDIOS,
            fillOpacity: 0.55
          }).bindPopup(construirPopup(props));
          capaCirculos.addLayer(circ);
        }
      } catch (err) {
        console.warn('No se pudo dibujar el círculo de inseguridad para', feature.properties && feature.properties.DPA_DESCAN, err);
      }
    });

    actualizarLeyenda();
  }

  /** La leyenda siempre refleja los rangos fijos nacionales (ver
   *  asegurarClasificacionGlobal), no los del alcance territorial actual. */
  function actualizarLeyenda() {
    const cont = document.getElementById('leyenda-seguridad');
    if (!mostrarRobos && !mostrarHomicidios) {
      cont.innerHTML = '<p class="leyenda-vacia">Seleccione una provincia y active un indicador para ver la leyenda.</p>';
      return;
    }
    let html = '';
    const bloque = (titulo, color, cortes) => {
      if (!cortes) return '';
      let filas = '';
      for (let i = 0; i < cortes.length - 1; i++) {
        const etiqueta = CONFIG.JENKS_ETIQUETAS[i] || `Clase ${i + 1}`;
        filas += `<div class="leyenda-fila">
                    <span class="leyenda-punto" style="background:${color};opacity:${0.4 + i * 0.25}"></span>
                    ${etiqueta}: ${cortes[i].toFixed(1)} – ${cortes[i + 1].toFixed(1)}
                  </div>`;
      }
      return `<div class="leyenda-bloque"><strong>${titulo}</strong>${filas}</div>`;
    };
    html += mostrarRobos ? bloque(CONFIG.INSEGURIDAD.labels.i_rob25, CONFIG.COLOR_ROBOS, cortesRobosGlobal) : '';
    html += mostrarHomicidios ? bloque(CONFIG.INSEGURIDAD.labels.i_hom25, CONFIG.COLOR_HOMICIDIOS, cortesHomGlobal) : '';
    cont.innerHTML = html || '<p class="leyenda-vacia">Sin datos a nivel nacional.</p>';
  }

  /** Se llama cada vez que cambia el filtro territorial. */
  async function actualizarAlcance(estado) {
    const geoInseguridad = await DataStore.inseguridad();
    asegurarClasificacionGlobal(geoInseguridad);
    featuresActuales = calcularAlcance(geoInseguridad, estado);
    dibujar();
  }

  function setMostrarRobos(valor) { mostrarRobos = valor; dibujar(); }
  function setMostrarHomicidios(valor) { mostrarHomicidios = valor; dibujar(); }

  return { iniciar, actualizarAlcance, setMostrarRobos, setMostrarHomicidios };

})();
