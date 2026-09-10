/**
 * app.js
 * -----------------------------------------------------------------------
 * Punto de entrada. Inicializa el mapa y los filtros, y conecta todo lo
 * demás (gráficos, panel de totales, capa de inseguridad, capa de UA,
 * descargas) a los cambios de estado del filtro territorial.
 * -----------------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', async () => {

  // --- Total general institucional (punto 7) ---
  document.getElementById('total-general-valor').textContent =
    `${Utils.formatoNumero(CONFIG.TOTAL_GENERAL.valor)} alertas`;
  document.getElementById('total-general-corte').textContent = CONFIG.TOTAL_GENERAL.corte;

  // --- Mapa e inseguridad ---
  const map = MapModule.iniciar();
  Seguridad.iniciar(map);

  // --- Filtros territoriales ---
  await Filtros.inicializar();

  // --- Vista inicial: coroplético de provincias ---
  await renderizarMapaSegunEstado({ provincia: null, canton: null, parroquia: null });
  actualizarTodosLosGraficos({ provincia: null, canton: null, parroquia: null });
  await actualizarPanelTotales({ provincia: null, canton: null, parroquia: null });
  Seguridad.actualizarAlcance({ provincia: null, canton: null, parroquia: null });

  // --- Reacciona a cada cambio de filtro (clic en mapa o en los <select>) ---
  Bus.addEventListener('estado:cambio', async (e) => {
    const estado = e.detail;
    await renderizarMapaSegunEstado(estado);
    actualizarTodosLosGraficos(estado);
    await actualizarPanelTotales(estado);
    Seguridad.actualizarAlcance(estado);
  });

  // --- Controles de la capa de Unidades de Atención ---
  const chkUA = document.getElementById('chk-ua');
  chkUA.addEventListener('change', (e) => MapModule.toggleCapaUA(e.target.checked));

  const chkModoSeleccion = document.getElementById('chk-modo-seleccion-ua');
  chkModoSeleccion.addEventListener('change', (e) => MapModule.setModoSeleccionUA(e.target.checked));

  document.getElementById('btn-limpiar-seleccion-ua').addEventListener('click', () => {
    MapModule.limpiarSeleccionUA();
  });

  Bus.addEventListener('ua:seleccion-cambio', (e) => {
    document.getElementById('ua-seleccion-contador').textContent =
      e.detail.total > 0 ? `${e.detail.total} unidad(es) seleccionada(s)` : '';
  });

  // --- Controles de inseguridad ---
  document.getElementById('chk-robos').addEventListener('change', (e) => Seguridad.setMostrarRobos(e.target.checked));
  document.getElementById('chk-homicidios').addEventListener('change', (e) => Seguridad.setMostrarHomicidios(e.target.checked));

  // --- Descargas ---
  document.getElementById('btn-descargar-todo').addEventListener('click', () => Descargas.descargarTodo());
  document.getElementById('btn-descargar-filtro').addEventListener('click', () => Descargas.descargarFiltroActual());
  document.getElementById('btn-descargar-ua-seleccionadas').addEventListener('click', () => Descargas.descargarUASeleccionadas());

  // -----------------------------------------------------------------------

  async function renderizarMapaSegunEstado(estado) {
    const camposProv = CONFIG.CAMPOS_TERRITORIALES.provincia;
    const camposCan = CONFIG.CAMPOS_TERRITORIALES.canton;
    const camposPar = CONFIG.CAMPOS_TERRITORIALES.parroquia;

    if (!estado.provincia) {
      const geo = await DataStore.provincias();
      MapModule.renderTerritorial('provincia', geo.features, (codigo) => Filtros.seleccionarProvincia(codigo));
      return;
    }

    if (!estado.canton) {
      const geo = await DataStore.cantones();
      const features = geo.features.filter(f => String(f.properties[camposCan.codigoPadre]) === String(estado.provincia.codigo));
      MapModule.renderTerritorial('canton', features, (codigo) => Filtros.seleccionarCanton(codigo));
      return;
    }

    // Cantón (y opcionalmente parroquia) seleccionados: se muestran las
    // parroquias de ese cantón para mantener contexto de navegación.
    const geo = await DataStore.parroquias();
    const features = geo.features.filter(f => String(f.properties[camposPar.codigoCanton]) === String(estado.canton.codigo));
    MapModule.renderTerritorial('parroquia', features, (codigo) => Filtros.seleccionarParroquia(codigo));

    if (estado.parroquia) {
      const seleccionada = features.find(f => String(f.properties[camposPar.codigo]) === String(estado.parroquia.codigo));
      if (seleccionada) {
        MapModule.resaltarSeleccion('parroquia', seleccionada);
        try {
          const bounds = L.geoJSON(seleccionada).getBounds();
          MapModule.getMap().fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
        } catch (e) { /* geometría inválida; se ignora */ }
      }
    }
  }

  function actualizarTodosLosGraficos(estado) {
    const propsProvincia = estado.provincia ? buscarProps('provincias', CONFIG.CAMPOS_TERRITORIALES.provincia.codigo, estado.provincia.codigo) : null;
    const propsCanton = estado.canton ? buscarProps('cantones', CONFIG.CAMPOS_TERRITORIALES.canton.codigo, estado.canton.codigo) : null;
    const propsParroquia = estado.parroquia ? buscarProps('parroquias', CONFIG.CAMPOS_TERRITORIALES.parroquia.codigo, estado.parroquia.codigo) : null;

    Graficos.actualizar('provincia', propsProvincia);
    Graficos.actualizar('canton', propsCanton);
    Graficos.actualizar('parroquia', propsParroquia);
  }

  function buscarProps(nombreCache, campoCodigo, codigo) {
    const geo = DataStore.obtenerCache(nombreCache);
    if (!geo) return null;
    const feat = geo.features.find(f => String(f.properties[campoCodigo]) === String(codigo));
    return feat ? feat.properties : null;
  }

  async function actualizarPanelTotales(estado) {
    const lista = document.getElementById('panel-totales-lista');
    const titulo = document.getElementById('panel-totales-titulo');
    lista.innerHTML = '';

    let nivel, features, campos, codigoActivo;

    if (!estado.provincia) {
      nivel = 'provincia';
      const geo = await DataStore.provincias();
      features = geo.features;
      campos = CONFIG.CAMPOS_TERRITORIALES.provincia;
      titulo.textContent = 'Total por provincia';
      codigoActivo = null;
    } else if (!estado.canton) {
      nivel = 'canton';
      const geo = DataStore.obtenerCache('cantones');
      features = geo.features.filter(f => String(f.properties.DPA_PROVIN) === String(estado.provincia.codigo));
      campos = CONFIG.CAMPOS_TERRITORIALES.canton;
      titulo.textContent = `Total por cantón · ${estado.provincia.nombre}`;
      codigoActivo = null;
    } else {
      nivel = 'parroquia';
      const geo = DataStore.obtenerCache('parroquias');
      features = geo.features.filter(f => String(f.properties.DPA_CANTON) === String(estado.canton.codigo));
      campos = CONFIG.CAMPOS_TERRITORIALES.parroquia;
      titulo.textContent = `Total por parroquia · ${estado.canton.nombre}`;
      codigoActivo = estado.parroquia ? estado.parroquia.codigo : null;
    }

    const filas = features
      .map(f => ({
        codigo: f.properties[campos.codigo],
        nombre: Utils.tituloCaso(f.properties[campos.nombre]),
        total: Utils.totalFeature(f.properties, nivel)
      }))
      .sort((a, b) => b.total - a.total);

    filas.forEach(fila => {
      const div = document.createElement('div');
      div.className = 'tarjeta-total' + (String(fila.codigo) === String(codigoActivo) ? ' tarjeta-total--activa' : '');
      div.innerHTML = `<span class="tarjeta-total__nombre">${fila.nombre}</span>
                        <span class="tarjeta-total__valor">${Utils.formatoNumero(fila.total)}</span>`;
      lista.appendChild(div);
    });
  }

});
