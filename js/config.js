/**
 * config.js
 * -----------------------------------------------------------------------
 * Configuración central del Geoportal CNH.
 * Aquí se resuelven las diferencias de nombres de campos entre capas
 * (los shapefiles de origen truncan nombres a 10 caracteres de forma
 * distinta según el nivel territorial), y se definen las etiquetas
 * legibles que se muestran en leyendas, popups y gráficos.
 *
 * Si en el futuro cambian los nombres de campo de algún GeoJSON, este
 * es el único archivo que debería necesitar ajustes.
 * -----------------------------------------------------------------------
 */

const CONFIG = {

  // Rutas de los archivos de datos (relativas, compatibles con GitHub Pages)
  DATA: {
    provincias: 'data/i01_alertas_09.geojson',
    cantones: 'data/i02_alertas_09.geojson',
    parroquias: 'data/i03_alertas_09.geojson',
    inseguridad: 'data/indices_rob_hom25.geojson',
    unidadesAtencion: 'data/unidades_atencion.geojson'
  },

  // Total general institucional (se muestra fijo en el panel, punto 7 del brief)
  TOTAL_GENERAL: {
    valor: 651075,
    corte: 'Corte: septiembre de 2026'
  },

  /**
   * Las 8 categorías de alerta, en un orden fijo y consistente para
   * los tres niveles territoriales. "key" es el identificador interno
   * usado en todo el código; "campo" varía según el nivel (ver
   * CAMPOS_ALERTA_POR_NIVEL más abajo). "corto" es la etiqueta que se
   * usa en los gráficos (sin repetir el grupo, ya que cada gráfico
   * ahora se titula por grupo); "label" (con el grupo incluido) se
   * sigue usando para las descargas en CSV.
   */
  CATEGORIAS_ALERTA: [
    { key: 'muy_alta1', label: 'Gestante · Muy Alta 1', corto: 'Muy Alta 1', grupo: 'a45i3' },
    { key: 'alta1', label: 'Gestante · Alta 1', corto: 'Alta 1', grupo: 'a45i3' },
    { key: 'alta3', label: 'Gestante · Alta 3', corto: 'Alta 3', grupo: 'a45i3' },
    { key: 'muy_alta2', label: 'Niño/Niña · Muy Alta 2', corto: 'Muy Alta 2', grupo: 'a46i3' },
    { key: 'alta2', label: 'Niño/Niña · Alta 2', corto: 'Alta 2', grupo: 'a46i3' },
    { key: 'alta4', label: 'Niño/Niña · Alta 4', corto: 'Alta 4', grupo: 'a46i3' },
    { key: 'alta5', label: 'Niño/Niña · Alta 5', corto: 'Alta 5', grupo: 'a46i3' },
    { key: 'alta6', label: 'Niño/Niña · Alta 6', corto: 'Alta 6', grupo: 'a46i3' }
  ],

  // Los dos grupos de alerta, cada uno con su propio par de gráficos
  // (uno de estos por cada nivel territorial: provincia, cantón, parroquia).
  GRUPOS_ALERTA: [
    { id: 'a45i3', titulo: 'Alertas Gestantes para CNH · A45I3' },
    { id: 'a46i3', titulo: 'Alertas Niños y Niñas para CNH · A46I3' }
  ],

  // Nombre real del campo de cada categoría, según el GeoJSON de cada nivel
  CAMPOS_ALERTA_POR_NIVEL: {
    provincia: {
      muy_alta1: 'a45i3_muy', alta1: 'a45i3_alta', alta3: 'a45i3_al_1',
      muy_alta2: 'a46i3_muy', alta2: 'a46i3_alta', alta4: 'a46i3_al_1',
      alta5: 'a46i3_al_2', alta6: 'a46i3_al_3'
    },
    canton: {
      muy_alta1: 'a45i3_muy', alta1: 'a45i3_alta', alta3: 'a45i3_al_1',
      muy_alta2: 'a46i3_muy', alta2: 'a46i3_alta', alta4: 'a46i3_al_1',
      alta5: 'a46i3_al_2', alta6: 'a46i3_al_3'
    },
    parroquia: {
      muy_alta1: 'a45_mya1', alta1: 'a45_alt1', alta3: 'a45_alt3',
      muy_alta2: 'a46_mya2', alta2: 'a46_alt2', alta4: 'a46_alt4',
      alta5: 'a46_alt5', alta6: 'a46_alt6'
    }
  },

  // Campos de identificación territorial (código DPA) por nivel
  CAMPOS_TERRITORIALES: {
    provincia: { codigo: 'DPA_PROVIN', nombre: 'DPA_DESPRO' },
    canton: { codigo: 'DPA_CANTON', nombre: 'DPA_DESCAN', codigoPadre: 'DPA_PROVIN', nombrePadre: 'DPA_DESPRO' },
    parroquia: { codigo: 'DPA_PARROQ', nombre: 'DPA_DESPAR', codigoCanton: 'DPA_CANTON', nombreCanton: 'DPA_DESCAN', codigoProvincia: 'DPA_PROVIN', nombreProvincia: 'DPA_DESPRO' }
  },

  // Campo de total precalculado (existe en canton y parroquia; se calcula en provincia)
  CAMPO_TOTAL: 'total',

  // Campos de la capa de inseguridad (indices_rob_hom25.geojson)
  INSEGURIDAD: {
    codigoCanton: 'DPA_CANTON',
    poblacion: 'pp_2025',
    totalRobos: 'tot_rob_25',
    totalHomicidios: 'tot_hom_25',
    indiceRobos: 'i_rob25',
    indiceHomicidios: 'i_hom25',
    labels: {
      pp_2025: 'Población proyectada 2025',
      tot_rob_25: 'Total de robos 2025',
      tot_hom_25: 'Total de homicidios 2025',
      i_rob25: 'Índice de robos (por 100,000 hab.)',
      i_hom25: 'Índice de homicidios (por 100,000 hab.)'
    }
  },

  // Diccionario de variables de Unidades de Atención (para el popup dinámico)
  UA_LABELS: {
    uni_des: 'Distrito MDH',
    dpa_despro: 'Provincia',
    dpa_descan: 'Cantón',
    dpa_despar: 'Parroquia',
    co_siimies: 'Código UA',
    nombre: 'Nombre de la Unidad de Atención',
    servicio: 'Servicio',
    mod: 'Modalidad',
    tipo_cober: 'Tipo de cobertura',
    regimen_es: 'Régimen escolar',
    cob_micro: 'Cobertura microplanificada',
    asis_prom: 'Asistencia promedio',
    asistencia: 'Asistencia según norma técnica',
    dir: 'Dirección',
    ref: 'Referencia',
    link_ubi: 'Ubicación',
    corte: 'Corte de información'
  },

  // Orden en que se muestran los campos de UA dentro del popup
  UA_ORDEN_CAMPOS: [
    'nombre', 'co_siimies', 'servicio', 'mod', 'tipo_cober', 'regimen_es',
    'dpa_despro', 'dpa_descan', 'dpa_despar', 'uni_des',
    'cob_micro', 'asis_prom', 'asistencia', 'dir', 'ref', 'link_ubi', 'corte'
  ],

  // Paleta institucional (extraída de la plantilla PPTX del MTDH)
  COLORES: {
    azul: '#2D2D93',
    azulOscuro: '#1F1F68',
    amarillo: '#FFC701',
    grisFondo: '#F5F6FA',
    grisTexto: '#4A4A57',
    bordePoligono: '#FFFFFF',
    sinDato: '#E4E4EC'
  },

  // Escala de color para los coropléticos (5 clases, tonos del azul institucional)
  ESCALA_COROPLETICO: ['#E7E6F5', '#B7B4E3', '#8781D0', '#57509D', '#2D2D93'],

  // Colores para las esferas de inseguridad
  COLOR_ROBOS: '#D97706',      // ámbar
  COLOR_HOMICIDIOS: '#B91C1C', // rojo oscuro

  // Config de clasificación Jenks para inseguridad (3 clases)
  JENKS_CLASES: 3,
  JENKS_ETIQUETAS: ['Bajo', 'Medio', 'Alto']
};
