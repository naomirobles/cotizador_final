let cotizacionAEliminar = null;
let paginaActual = 1;
let totalPaginas = 1;
let totalRegistros = 0;
let searchQuery = ''; // Nueva variable para almacenar el término de búsqueda
let searchTimeout = null; // Para debounce de búsqueda
const REGISTROS_POR_PAGINA = 10;

// Cargar cotizaciones al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarCotizacionesPaginadas(1);
    
    // Configurar búsqueda con debounce
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        // Limpiar timeout anterior
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Esperar 500ms después de que el usuario termine de escribir
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            cargarCotizacionesPaginadas(1); // Volver a página 1 al buscar
        }, 500);
    });
});

async function cargarCotizacionesPaginadas(pagina = 1) {
    try {
        mostrarCargando(searchQuery ? 'Buscando cotizaciones...' : 'Cargando cotizaciones...');
        
        let resultado;
        
        // Si hay término de búsqueda, usar endpoint de búsqueda
        if (searchQuery && searchQuery.length > 0) {
            resultado = await window.api.buscarCotizaciones(
                searchQuery,
                pagina, 
                REGISTROS_POR_PAGINA, 
                'fecha DESC'
            );
        } else {
            // Sin búsqueda, usar endpoint normal
            resultado = await window.api.obtenerCotizacionesPaginadas(
                pagina, 
                REGISTROS_POR_PAGINA, 
                'fecha DESC'
            );
        }
        
        paginaActual = resultado.pagination.currentPage;
        totalPaginas = resultado.pagination.totalPages;
        totalRegistros = resultado.pagination.totalRecords;
        
        renderizarTabla(resultado.data);
        actualizarControlesPaginacion(resultado.pagination);
        
        ocultarCargando();
    } catch (error) {
        ocultarCargando();
        console.error('Error al cargar cotizaciones:', error);
        mostrarNotificacion('Error al cargar cotizaciones', 'error');
    }
}

function renderizarTabla(cotizaciones) {
    const tbody = document.getElementById('cotizacionesTable');
    tbody.innerHTML = '';
    
    if (cotizaciones.length === 0) {
        const mensajeSinResultados = searchQuery 
            ? `<p>No se encontraron cotizaciones para "${searchQuery}"</p>
               <button onclick="limpiarBusqueda()" class="mt-4 text-blue-600 hover:text-blue-800">
                   Limpiar búsqueda
               </button>`
            : `<p>No hay cotizaciones guardadas</p>
               <button onclick="abrirNuevaCotizacion()" class="mt-4 text-blue-600 hover:text-blue-800">
                   Crear primera cotización
               </button>`;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-file-invoice text-4xl mb-4 opacity-50"></i>
                    ${mensajeSinResultados}
                </td>
            </tr>
        `;
        return;
    }

    cotizaciones.forEach(cotizacion => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-900">${cotizacion.id_cotizacion}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${cotizacion.empresa}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${cotizacion.proyecto_servicio}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${cotizacion.fecha}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex justify-center space-x-2">
                    <button 
                        onclick="editarCotizacion('${cotizacion.id_cotizacion}')"
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm transition-colors"
                        title="Editar"
                    >
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button 
                        onclick="copiarCotizacion(${cotizacion.id_cotizacion})" 
                        class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm transition-colors"
                        title="Copiar"
                    >
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button 
                        onclick="generarPDF('${cotizacion.id_cotizacion}')"
                        class="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded text-sm transition-colors"
                        title="Generar PDF"
                    >
                        <i class="fa-solid fa-file-pdf"></i>
                    </button>
                    <button 
                        onclick="eliminarCotizacion('${cotizacion.id_cotizacion}')"
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                        title="Eliminar"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function actualizarControlesPaginacion(pagination) {
    // Actualizar información de registros
    const inicio = ((pagination.currentPage - 1) * REGISTROS_POR_PAGINA) + 1;
    const fin = Math.min(pagination.currentPage * REGISTROS_POR_PAGINA, pagination.totalRecords);
    
    const mensajeResultados = searchQuery 
        ? `Mostrando ${inicio} - ${fin} de ${pagination.totalRecords} resultados para "${searchQuery}"`
        : `Mostrando ${inicio} - ${fin} de ${pagination.totalRecords} cotizaciones`;
    
    document.getElementById('recordsInfo').textContent = mensajeResultados;
    
    // Actualizar botones prev/next
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    
    btnPrev.disabled = !pagination.hasPrevPage;
    btnNext.disabled = !pagination.hasNextPage;
    
    // Generar botones de páginas
    generarBotonesPaginas(pagination);
}

function generarBotonesPaginas(pagination) {
    const container = document.getElementById('paginationButtons');
    container.innerHTML = '';
    
    const { currentPage, totalPages } = pagination;
    
    // Mostrar máximo 5 botones de página
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // Botón primera página
    if (startPage > 1) {
        container.appendChild(crearBotonPagina(1, '1'));
        if (startPage > 2) {
            const span = document.createElement('span');
            span.className = 'px-2 text-gray-500';
            span.textContent = '...';
            container.appendChild(span);
        }
    }
    
    // Botones de páginas
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(crearBotonPagina(i, i.toString(), i === currentPage));
    }
    
    // Botón última página
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const span = document.createElement('span');
            span.className = 'px-2 text-gray-500';
            span.textContent = '...';
            container.appendChild(span);
        }
        container.appendChild(crearBotonPagina(totalPages, totalPages.toString()));
    }
}

function crearBotonPagina(pagina, texto, activo = false) {
    const btn = document.createElement('button');
    btn.textContent = texto;
    btn.onclick = () => cargarCotizacionesPaginadas(pagina);
    
    if (activo) {
        btn.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold';
    } else {
        btn.className = 'px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50';
    }
    
    return btn;
}

function cambiarPagina(direccion) {
    if (direccion === 'prev' && paginaActual > 1) {
        cargarCotizacionesPaginadas(paginaActual - 1);
    } else if (direccion === 'next' && paginaActual < totalPaginas) {
        cargarCotizacionesPaginadas(paginaActual + 1);
    }
}

function abrirNuevaCotizacion() {
    window.location.href = 'crear-cotizacion.html';
}

function editarCotizacion(id) {
    window.location.href = `crear-cotizacion.html?id=${id}`;
}

function eliminarCotizacion(id) {
    cotizacionAEliminar = id;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

function cerrarModalEliminar() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
    cotizacionAEliminar = null;
}

// Función para copiar cotización
async function copiarCotizacion(id) {
    try {
        mostrarCargando('Copiando cotización...');
        const resultado = await window.api.copiarCotizacion(id);
        ocultarCargando();

        if (resultado.success) {
            mostrarNotificacion('Cotización copiada exitosamente', 'success');
            cargarCotizacionesPaginadas(paginaActual); // Recargar página actual
        } else {
            throw new Error('Error al copiar cotización');
        }
    } catch (error) {
        ocultarCargando();
        console.error('Error copiando cotización:', error);
        mostrarNotificacion('Error al copiar cotización: ' + error.message, 'error');
    }
}

async function confirmarEliminar() {
    if (cotizacionAEliminar) {
        try {
            await window.api.eliminarCotizacion(cotizacionAEliminar);
            mostrarNotificacion('Cotización eliminada', 'success');
            cerrarModalEliminar();
            
            // Si era el último registro de la página y no es la primera página, ir a la anterior
            const resultado = await window.api.obtenerCotizacionesPaginadas(paginaActual, REGISTROS_POR_PAGINA, 'fecha DESC');
            if (resultado.data.length === 0 && paginaActual > 1) {
                cargarCotizacionesPaginadas(paginaActual - 1);
            } else {
                cargarCotizacionesPaginadas(paginaActual);
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            mostrarNotificacion('Error al eliminar cotización', 'error');
        }
    }
}

// Función para generar pdf
async function generarPDF(id_cotizacion) {
    try{
        mostrarCargando('Generando PDF...');
        console.log('Generando PDF para cotización: ',id_cotizacion);
        const resultado = await window.api.generarPDF(id_cotizacion);
        ocultarCargando();

        if(resultado.success){
            await window.api.abrirPDF(resultado.filePath);
            mostrarNotificacion('PDF generado exitosamente', 'success');
        }else{
            throw new Error('Error al generar PDF.');
        }
    }catch (error) {
        ocultarCargando();
        console.error('Error al generar PDF:', error);
        mostrarNotificacion('Error al generar PDF: ' + error.message, 'error');
    }
}

// Función para limpiar búsqueda
function limpiarBusqueda() {
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    cargarCotizacionesPaginadas(1);
}

// Función para mostrar indicador de carga
function mostrarCargando(mensaje = 'Cargando...') {
    const loader = document.createElement('div');
    loader.id = 'pdf-loader';
    loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loader.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span class="text-gray-700">${mensaje}</span>
        </div>
    `;
    document.body.appendChild(loader);
}

function ocultarCargando() {
    const loader = document.getElementById('pdf-loader');
    if (loader) {
        loader.remove();
    }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const colores = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colores[tipo]} text-white p-4 rounded shadow-lg z-50 transform transition-all duration-300`;
    notification.textContent = mensaje;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}