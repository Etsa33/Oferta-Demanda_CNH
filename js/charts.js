/**
 * charts.js
 * -----------------------------------------------------------------------
 * Dos gráficos de barras por cada nivel territorial (provincial, cantonal,
 * parroquial): uno para las alertas de Gestantes (A45I3) y otro para las
 * de Niños y Niñas (A46I3) — 6 gráficos en total. Cada uno se reconstruye
 * cada vez que cambia la selección territorial correspondiente.
 * -----------------------------------------------------------------------
 */

const Graficos = (() => {

  const instancias = {}; // clave: `${nivel}_${grupoId}`

  const NIVEL_MENSAJE_VACIO = {
    provincia: 'Seleccione una provincia para visualizar el gráfico.',
    canton: 'Seleccione un cantón para visualizar el gráfico.',
    parroquia: 'Seleccione una parroquia para visualizar el gráfico.'
  };

  function elementosGrupo(nivel, grupoId) {
    const id = `${nivel}-${grupoId}`;
    return {
      canvas: document.getElementById(`chart-${id}`),
      contenedorVacio: document.getElementById(`chart-${id}-vacio`),
      titulo: document.getElementById(`chart-${id}-titulo`),
      total: document.getElementById(`chart-${id}-total`)
    };
  }

  function mostrarVacio(nivel, grupo) {
    const els = elementosGrupo(nivel, grupo.id);
    const clave = `${nivel}_${grupo.id}`;
    els.canvas.classList.add('oculto');
    els.contenedorVacio.classList.remove('oculto');
    els.contenedorVacio.textContent = NIVEL_MENSAJE_VACIO[nivel];
    els.titulo.textContent = grupo.titulo;
    els.total.textContent = '';
    if (instancias[clave]) {
      instancias[clave].destroy();
      instancias[clave] = null;
    }
  }

  function actualizarGrupo(nivel, grupo, props, nombreSeleccion) {
    const els = elementosGrupo(nivel, grupo.id);
    const clave = `${nivel}_${grupo.id}`;

    if (!props) {
      mostrarVacio(nivel, grupo);
      return;
    }

    els.canvas.classList.remove('oculto');
    els.contenedorVacio.classList.add('oculto');

    const categorias = CONFIG.CATEGORIAS_ALERTA.filter(c => c.grupo === grupo.id);
    const etiquetas = categorias.map(c => c.corto);
    const valores = categorias.map(c => Utils.valorCategoria(props, nivel, c.key));
    const total = valores.reduce((a, b) => a + b, 0);

    els.titulo.textContent = `${grupo.titulo} · ${nombreSeleccion}`;
    els.total.textContent = `Total: ${Utils.formatoNumero(total)}`;

    if (instancias[clave]) {
      instancias[clave].data.labels = etiquetas;
      instancias[clave].data.datasets[0].data = valores;
      instancias[clave].update();
      return;
    }

    instancias[clave] = new Chart(els.canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Cantidad de personas',
          data: valores,
          backgroundColor: grupo.id === 'a45i3' ? CONFIG.COLORES.azul : CONFIG.COLORES.azulOscuro,
          borderRadius: 3,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 10 } } },
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad de personas' } }
        }
      }
    });
  }

  /** Actualiza los DOS gráficos (A45I3 y A46I3) de un nivel territorial a la vez. */
  function actualizar(nivel, props, nombreSeleccion) {
    CONFIG.GRUPOS_ALERTA.forEach(grupo => actualizarGrupo(nivel, grupo, props, nombreSeleccion));
  }

  return { actualizar };
})();
