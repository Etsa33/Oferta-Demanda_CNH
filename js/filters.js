/**
 * filters.js
 * -----------------------------------------------------------------------
 * Estado del filtro territorial en cascada, y la lógica que llena los
 * tres <select> dependientes. No conoce nada de Leaflet ni de Chart.js:
 * solo mantiene el estado (provincia/cantón/parroquia seleccionados) y
 * avisa a quien esté escuchando (app.js) cada vez que cambia algo, vía
 * un pequeño bus de eventos basado en CustomEvent.
 * -----------------------------------------------------------------------
 */

const Bus = document.createElement('div'); // "bus" de eventos minimalista

const Estado = (() => {

  let provincia = null; // { codigo, nombre }
  let canton = null;     // { codigo, nombre }
  let parroquia = null;  // { codigo, nombre }

  function emitirCambio() {
    Bus.dispatchEvent(new CustomEvent('estado:cambio', {
      detail: { provincia, canton, parroquia }
    }));
  }

  return {
    get provincia() { return provincia; },
    get canton() { return canton; },
    get parroquia() { return parroquia; },

    setProvincia(p) {
      provincia = p;
      canton = null;
      parroquia = null;
      emitirCambio();
    },
    setCanton(c) {
      canton = c;
      parroquia = null;
      emitirCambio();
    },
    setParroquia(p) {
      parroquia = p;
      emitirCambio();
    },
    limpiar() {
      provincia = null;
      canton = null;
      parroquia = null;
      emitirCambio();
    }
  };
})();


const Filtros = (() => {

  const selProvincia = document.getElementById('sel-provincia');
  const selCanton = document.getElementById('sel-canton');
  const selParroquia = document.getElementById('sel-parroquia');
  const btnLimpiar = document.getElementById('btn-limpiar-filtros');

  function opcionesDesde(features, campoCodigo, campoNombre) {
    const vistos = new Set();
    const items = [];
    features.forEach(f => {
      const cod = f.properties[campoCodigo];
      if (vistos.has(cod)) return;
      vistos.add(cod);
      items.push({ codigo: cod, nombre: Utils.tituloCaso(f.properties[campoNombre]) });
    });
    items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return items;
  }

  function llenarSelect(select, items, placeholder) {
    select.innerHTML = '';
    const optPlaceholder = document.createElement('option');
    optPlaceholder.value = '';
    optPlaceholder.textContent = placeholder;
    select.appendChild(optPlaceholder);
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.codigo;
      opt.textContent = item.nombre;
      select.appendChild(opt);
    });
  }

  async function inicializar() {
    const geoProvincias = await DataStore.provincias();
    const camposProv = CONFIG.CAMPOS_TERRITORIALES.provincia;
    const items = opcionesDesde(geoProvincias.features, camposProv.codigo, camposProv.nombre);
    llenarSelect(selProvincia, items, 'Todas las provincias');

    selProvincia.addEventListener('change', onProvinciaChange);
    selCanton.addEventListener('change', onCantonChange);
    selParroquia.addEventListener('change', onParroquiaChange);
    btnLimpiar.addEventListener('click', limpiarTodo);
  }

  async function onProvinciaChange(e) {
    const codigo = e.target.value;
    selCanton.innerHTML = '';
    selParroquia.innerHTML = '';
    llenarSelect(selCanton, [], 'Seleccione un cantón');
    llenarSelect(selParroquia, [], 'Seleccione una parroquia');
    selCanton.disabled = true;
    selParroquia.disabled = true;

    if (!codigo) {
      Estado.setProvincia(null);
      return;
    }

    const geoProvincias = DataStore.obtenerCache('provincias');
    const feat = geoProvincias.features.find(f => String(f.properties[CONFIG.CAMPOS_TERRITORIALES.provincia.codigo]) === codigo);
    const nombre = feat ? Utils.tituloCaso(feat.properties[CONFIG.CAMPOS_TERRITORIALES.provincia.nombre]) : codigo;
    Estado.setProvincia({ codigo, nombre });

    const geoCantones = await DataStore.cantones();
    const camposCan = CONFIG.CAMPOS_TERRITORIALES.canton;
    const cantonesDeProvincia = geoCantones.features.filter(f => String(f.properties[camposCan.codigoPadre]) === codigo);
    const items = opcionesDesde(cantonesDeProvincia, camposCan.codigo, camposCan.nombre);
    llenarSelect(selCanton, items, 'Seleccione un cantón');
    selCanton.disabled = false;
  }

  async function onCantonChange(e) {
    const codigo = e.target.value;
    selParroquia.innerHTML = '';
    llenarSelect(selParroquia, [], 'Seleccione una parroquia');
    selParroquia.disabled = true;

    if (!codigo) {
      Estado.setCanton(null);
      return;
    }

    const geoCantones = DataStore.obtenerCache('cantones');
    const camposCan = CONFIG.CAMPOS_TERRITORIALES.canton;
    const feat = geoCantones.features.find(f => String(f.properties[camposCan.codigo]) === codigo);
    const nombre = feat ? Utils.tituloCaso(feat.properties[camposCan.nombre]) : codigo;
    Estado.setCanton({ codigo, nombre });

    const geoParroquias = await DataStore.parroquias();
    const camposPar = CONFIG.CAMPOS_TERRITORIALES.parroquia;
    const parroquiasDeCanton = geoParroquias.features.filter(f => String(f.properties[camposPar.codigoCanton]) === codigo);
    const items = opcionesDesde(parroquiasDeCanton, camposPar.codigo, camposPar.nombre);
    llenarSelect(selParroquia, items, 'Seleccione una parroquia');
    selParroquia.disabled = false;
  }

  function onParroquiaChange(e) {
    const codigo = e.target.value;
    if (!codigo) {
      Estado.setParroquia(null);
      return;
    }
    const geoParroquias = DataStore.obtenerCache('parroquias');
    const camposPar = CONFIG.CAMPOS_TERRITORIALES.parroquia;
    const feat = geoParroquias.features.find(f => String(f.properties[camposPar.codigo]) === codigo);
    const nombre = feat ? Utils.tituloCaso(feat.properties[camposPar.nombre]) : codigo;
    Estado.setParroquia({ codigo, nombre });
  }

  function limpiarTodo() {
    selProvincia.value = '';
    selCanton.innerHTML = '';
    selParroquia.innerHTML = '';
    llenarSelect(selCanton, [], 'Seleccione un cantón');
    llenarSelect(selParroquia, [], 'Seleccione una parroquia');
    selCanton.disabled = true;
    selParroquia.disabled = true;
    Estado.limpiar();
  }

  /** Permiten sincronizar el filtro cuando la selección se origina en un clic sobre el mapa. */
  function seleccionarProvincia(codigo) {
    selProvincia.value = codigo;
    onProvinciaChange({ target: { value: codigo } });
  }
  function seleccionarCanton(codigo) {
    selCanton.value = codigo;
    onCantonChange({ target: { value: codigo } });
  }
  function seleccionarParroquia(codigo) {
    selParroquia.value = codigo;
    onParroquiaChange({ target: { value: codigo } });
  }

  return { inicializar, seleccionarProvincia, seleccionarCanton, seleccionarParroquia };
})();
