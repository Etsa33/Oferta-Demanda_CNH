/**
 * charts.js
 * -----------------------------------------------------------------------
 * Los tres gráficos de barras de la columna derecha (provincial, cantonal,
 * parroquial). Cada uno muestra las 8 categorías de alerta en el eje X y
 * la cantidad de personas/registros en el eje Y, y se reconstruye cada
 * vez que cambia la selección territorial correspondiente.
 * -----------------------------------------------------------------------
 */

const Graficos = (() => {

  const instancias = { provincia: null, canton: null, parroquia: null };
  const NIVEL_TITULO = {
    provincia: 'Alertas · Provincia seleccionada',
    canton: 'Alertas · Cantón seleccionado',
    parroquia: 'Alertas · Parroquia seleccionada'
  };
  const NIVEL_MENSAJE_VACIO = {
    provincia: 'Seleccione una provincia para visualizar el gráfico.',
    canton: 'Seleccione un cantón para visualizar el gráfico.',
    parroquia: 'Seleccione una parroquia para visualizar el gráfico.'
  };

  function elementosNivel(nivel) {
    return {
      canvas: document.getElementById(`chart-${nivel}`),
      contenedorVacio: document.getElementById(`chart-${nivel}-vacio`),
      titulo: document.getElementById(`chart-${nivel}-titulo`),
      total: document.getElementById(`chart-${nivel}-total`)
    };
  }

  function mostrarVacio(nivel) {
    const els = elementosNivel(nivel);
    els.canvas.classList.add('oculto');
    els.contenedorVacio.classList.remove('oculto');
    els.contenedorVacio.textContent = NIVEL_MENSAJE_VACIO[nivel];
    els.total.textContent = '';
    if (instancias[nivel]) {
      instancias[nivel].destroy();
      instancias[nivel] = null;
    }
  }

  function actualizar(nivel, props) {
    const els = elementosNivel(nivel);

    if (!props) {
      mostrarVacio(nivel);
      return;
    }

    els.canvas.classList.remove('oculto');
    els.contenedorVacio.classList.add('oculto');

    const etiquetas = CONFIG.CATEGORIAS_ALERTA.map(c => c.label);
    const valores = CONFIG.CATEGORIAS_ALERTA.map(c => Utils.valorCategoria(props, nivel, c.key));
    const total = valores.reduce((a, b) => a + b, 0);

    els.titulo.textContent = NIVEL_TITULO[nivel];
    els.total.textContent = `Total: ${Utils.formatoNumero(total)}`;

    if (instancias[nivel]) {
      instancias[nivel].data.labels = etiquetas;
      instancias[nivel].data.datasets[0].data = valores;
      instancias[nivel].update();
      return;
    }

    instancias[nivel] = new Chart(els.canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Cantidad de personas',
          data: valores,
          backgroundColor: CONFIG.COLORES.azul,
          borderRadius: 3,
          maxBarThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 45, font: { size: 9 } } },
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad de personas' } }
        }
      }
    });
  }

  return { actualizar };
})();
