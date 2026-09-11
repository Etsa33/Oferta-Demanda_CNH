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
  let featuresActuales = []; // subconjunto de indices_rob_hom25 actualmente en alcance

  const RADIO_MIN = 6;
  const RADIO_MAX = 26;

  function iniciar(mapaLeaflet) {
    map = mapaLeaflet;
    capaCirculos.addTo(map);
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
      actualizarLeyenda(null, null);
      return;
    }

    const valoresRobos = featuresActuales.map(f => f.properties[CONFIG.INSEGURIDAD.indiceRobos]).filter(v => v > 0);
    const valoresHom = featuresActuales.map(f => f.properties[CONFIG.INSEGURIDAD.indiceHomicidios]).filter(v => v > 0);
    const maxRobos = valoresRobos.length ? Math.max(...valoresRobos) : 0;
    const maxHom = valoresHom.length ? Math.max(...valoresHom) : 0;
    const cortesRobos = valoresRobos.length ? Utils.cortesJenks(valoresRobos, CONFIG.JENKS_CLASES) : null;
    const cortesHom = valoresHom.length ? Utils.cortesJenks(valoresHom, CONFIG.JENKS_CLASES) : null;

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
            radius: radioProporcional(valor, maxRobos),
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
            radius: radioProporcional(valor, maxHom),
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

    actualizarLeyenda(
      mostrarRobos ? { cortes: cortesRobos, max: maxRobos } : null,
      mostrarHomicidios ? { cortes: cortesHom, max: maxHom } : null
    );
  }

  function actualizarLeyenda(robos, homicidios) {
    const cont = document.getElementById('leyenda-seguridad');
    if (!robos && !homicidios) {
      cont.innerHTML = '<p class="leyenda-vacia">Seleccione una provincia y active un indicador para ver la leyenda.</p>';
      return;
    }
    let html = '';
    const bloque = (titulo, color, info) => {
      if (!info || !info.cortes) return '';
      let filas = '';
      for (let i = 0; i < info.cortes.length - 1; i++) {
        const etiqueta = CONFIG.JENKS_ETIQUETAS[i] || `Clase ${i + 1}`;
        filas += `<div class="leyenda-fila">
                    <span class="leyenda-punto" style="background:${color};opacity:${0.4 + i * 0.25}"></span>
                    ${etiqueta}: ${info.cortes[i].toFixed(1)} – ${info.cortes[i + 1].toFixed(1)}
                  </div>`;
      }
      return `<div class="leyenda-bloque"><strong>${titulo}</strong>${filas}</div>`;
    };
    html += bloque(CONFIG.INSEGURIDAD.labels.i_rob25, CONFIG.COLOR_ROBOS, robos);
    html += bloque(CONFIG.INSEGURIDAD.labels.i_hom25, CONFIG.COLOR_HOMICIDIOS, homicidios);
    cont.innerHTML = html || '<p class="leyenda-vacia">Sin datos para el alcance actual.</p>';
  }

  /** Se llama cada vez que cambia el filtro territorial. */
  async function actualizarAlcance(estado) {
    const geoInseguridad = await DataStore.inseguridad();
    featuresActuales = calcularAlcance(geoInseguridad, estado);
    dibujar();
  }

  function setMostrarRobos(valor) { mostrarRobos = valor; dibujar(); }
  function setMostrarHomicidios(valor) { mostrarHomicidios = valor; dibujar(); }

  return { iniciar, actualizarAlcance, setMostrarRobos, setMostrarHomicidios };

})();
