/**
 * downloads.js
 * -----------------------------------------------------------------------
 * Herramientas de descarga (punto 11 del brief):
 *  - Descargar todo: el detalle completo a nivel parroquial (el más
 *    desagregado disponible), con todas sus 8 categorías y el total.
 *  - Descargar filtro actual: el mismo detalle, pero acotado al alcance
 *    territorial que esté activo (provincia / cantón / parroquia).
 *  - Descargar Unidades de Atención seleccionadas: las UA marcadas con
 *    la herramienta de selección del mapa, con todos sus campos.
 * -----------------------------------------------------------------------
 */

const Descargas = (() => {

  function filaDesdeFeatureParroquia(feature) {
    const props = feature.properties;
    const campos = CONFIG.CAMPOS_TERRITORIALES.parroquia;
    const fila = {
      codigo_provincia: props[campos.codigoProvincia],
      provincia: Utils.tituloCaso(props[campos.nombreProvincia]),
      codigo_canton: props[campos.codigoCanton],
      canton: Utils.tituloCaso(props[campos.nombreCanton]),
      codigo_parroquia: props[campos.codigo],
      parroquia: Utils.tituloCaso(props[campos.nombre])
    };
    CONFIG.CATEGORIAS_ALERTA.forEach(cat => {
      fila[cat.label] = Utils.valorCategoria(props, 'parroquia', cat.key);
    });
    fila['Total'] = Utils.totalFeature(props, 'parroquia');
    return fila;
  }

  async function descargarTodo() {
    const geo = await DataStore.parroquias();
    const filas = geo.features.map(filaDesdeFeatureParroquia);
    Utils.descargarTexto(Utils.aCSV(filas), 'alertas_cnh_todas_las_parroquias.csv');
  }

  async function descargarFiltroActual() {
    const geo = await DataStore.parroquias();
    const campos = CONFIG.CAMPOS_TERRITORIALES.parroquia;
    let features = geo.features;

    if (Estado.parroquia) {
      features = features.filter(f => String(f.properties[campos.codigo]) === String(Estado.parroquia.codigo));
    } else if (Estado.canton) {
      features = features.filter(f => String(f.properties[campos.codigoCanton]) === String(Estado.canton.codigo));
    } else if (Estado.provincia) {
      features = features.filter(f => String(f.properties[campos.codigoProvincia]) === String(Estado.provincia.codigo));
    }

    if (!features.length) {
      alert('No hay registros para el filtro territorial actual.');
      return;
    }

    const filas = features.map(filaDesdeFeatureParroquia);
    const sufijo = Estado.parroquia ? Estado.parroquia.nombre
      : Estado.canton ? Estado.canton.nombre
      : Estado.provincia ? Estado.provincia.nombre
      : 'todas';
    Utils.descargarTexto(Utils.aCSV(filas), `alertas_cnh_${sufijo.replace(/\s+/g, '_').toLowerCase()}.csv`);
  }

  function descargarUASeleccionadas() {
    const seleccionadas = MapModule.getUASeleccionadas();
    if (!seleccionadas.length) {
      alert('No ha seleccionado ninguna Unidad de Atención en el mapa. Active la herramienta de selección y haga clic sobre los puntos que necesite.');
      return;
    }
    const filas = seleccionadas.map(f => {
      const fila = {};
      CONFIG.UA_ORDEN_CAMPOS.forEach(campo => {
        fila[CONFIG.UA_LABELS[campo] || campo] = f.properties[campo];
      });
      return fila;
    });
    Utils.descargarTexto(Utils.aCSV(filas), 'unidades_atencion_seleccionadas.csv');
  }

  return { descargarTodo, descargarFiltroActual, descargarUASeleccionadas };

})();
