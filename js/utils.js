/**
 * utils.js
 * -----------------------------------------------------------------------
 * Funciones pequeñas y reutilizables. Nada aquí depende de Leaflet ni
 * del DOM, para que se puedan probar/reutilizar de forma aislada.
 * -----------------------------------------------------------------------
 */

const Utils = (() => {

  /** Valor de una categoría de alerta específica para un feature, según su nivel. */
  function valorCategoria(props, nivel, categoriaKey) {
    const campo = CONFIG.CAMPOS_ALERTA_POR_NIVEL[nivel][categoriaKey];
    const val = props[campo];
    return (typeof val === 'number' && !isNaN(val)) ? val : 0;
  }

  /** Total de alertas de un feature: SIEMPRE calculado sumando las 8 categorías
   *  en el momento (nunca se toma un valor "total" precargado), tal como
   *  pide el brief para evitar cifras fijas en el código. */
  function totalFeature(props, nivel) {
    return CONFIG.CATEGORIAS_ALERTA.reduce(
      (acc, cat) => acc + valorCategoria(props, nivel, cat.key), 0
    );
  }

  /** Suma de una categoría (o del total) sobre una colección de features. */
  function sumarCategoria(features, nivel, categoriaKey) {
    return features.reduce((acc, f) => acc + valorCategoria(f.properties, nivel, categoriaKey), 0);
  }

  /** Valor de un feature según la opción elegida en el filtro de categoría del
   *  coroplético: el total general, el total de un grupo (A45I3/A46I3), o
   *  una de las 8 categorías individuales. */
  function valorSegunOpcion(props, nivel, opcionId) {
    if (opcionId === 'total' || !opcionId) return totalFeature(props, nivel);
    if (opcionId === 'a45i3_total' || opcionId === 'a46i3_total') {
      const grupo = opcionId === 'a45i3_total' ? 'a45i3' : 'a46i3';
      return CONFIG.CATEGORIAS_ALERTA
        .filter(c => c.grupo === grupo)
        .reduce((acc, c) => acc + valorCategoria(props, nivel, c.key), 0);
    }
    return valorCategoria(props, nivel, opcionId);
  }

  function sumarTotal(features, nivel) {
    return features.reduce((acc, f) => acc + totalFeature(f.properties, nivel), 0);
  }

  /** Formatea un número con separador de miles en español. */
  function formatoNumero(n) {
    return new Intl.NumberFormat('es-EC').format(Math.round(n));
  }

  /** Filtra un FeatureCollection completo por un código de campo == valor. */
  function filtrarPorCodigo(geojson, campo, valor) {
    return geojson.features.filter(f => String(f.properties[campo]) === String(valor));
  }

  /** Título-caso simple para nombres de provincia/cantón/parroquia (vienen en mayúsculas). */
  function tituloCaso(texto) {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(p => p.length > 2 ? p.charAt(0).toUpperCase() + p.slice(1) : p)
      .join(' ');
  }

  /** Convierte un arreglo de objetos a texto CSV (separador coma, comillas donde haga falta). */
  function aCSV(filas) {
    if (!filas.length) return '';
    const columnas = Object.keys(filas[0]);
    const escapar = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const encabezado = columnas.join(',');
    const cuerpo = filas.map(fila => columnas.map(c => escapar(fila[c])).join(',')).join('\n');
    return encabezado + '\n' + cuerpo;
  }

  /** Dispara la descarga de un string de texto como archivo en el navegador. */
  function descargarTexto(contenido, nombreArchivo, tipoMime = 'text/csv;charset=utf-8;') {
    const blob = new Blob(['\uFEFF' + contenido], { type: tipoMime }); // BOM para acentos en Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clasificación Natural Breaks (Jenks) usando la librería simple-statistics
   * (cargada globalmente como `ss`). Devuelve los cortes (breaks) de clase.
   * Si hay menos valores únicos que clases pedidas, reduce el número de
   * clases automáticamente para no romper el cálculo.
   */
  function cortesJenks(valores, kDeseado) {
    const unicos = Array.from(new Set(valores));
    if (unicos.length === 0) return [0, 0];
    const k = Math.min(kDeseado, unicos.length);
    if (k <= 1) return [Math.min(...unicos), Math.max(...unicos)];
    return ss.jenks(valores, k);
  }

  /** Índice de clase (0 a n-1) al que pertenece un valor, dado un arreglo de cortes. */
  function indiceClase(valor, cortes) {
    for (let i = 0; i < cortes.length - 2; i++) {
      if (valor < cortes[i + 1]) return i;
    }
    return cortes.length - 2;
  }

  return {
    valorCategoria, totalFeature, sumarCategoria, sumarTotal, valorSegunOpcion,
    formatoNumero, filtrarPorCodigo, tituloCaso, aCSV, descargarTexto,
    cortesJenks, indiceClase
  };

})();
