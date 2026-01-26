/**
 * Módulo para generación de PDFs con Puppeteer
 * Maneja la creación de HTML, estilos y configuración del PDF
 */

const fs = require('fs');
const path = require('path');

// =============== CONFIGURACIÓN DEL PDF =====================

/**
 * Opciones de configuración para Puppeteer PDF
 */
const PDF_CONFIG = {
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: false,
    margin: {
        top: '114px',
        right: '0mm',
        bottom: '70px',
        left: '0mm'
    },
    displayHeaderFooter: true
};

/**
 * Argumentos para lanzar el navegador Puppeteer
 */
const BROWSER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run'
];

// =============== TEMPLATES HTML =====================

/**
 * Genera el template del header para el PDF usando una imagen
 * @param {string} headerImageBase64 - Imagen del header en formato base64
 * @returns {string} HTML del header
 */
function generarHeaderTemplate(headerImageBase64) {
    return `
<div style="
    width: 100%;
    margin: 0;
    padding: 0;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
">
    <img src="${headerImageBase64}" alt="Header" style="
        width: 100%;
        height: auto;
        display: block;
        margin: 0;
        padding: 0;
    ">
</div>
    `;
}

/**
 * Genera el template del footer para el PDF usando una imagen
 * @param {string} footerImageBase64 - Imagen del footer en formato base64
 * @returns {string} HTML del footer
 */
function generarFooterTemplate(footerImageBase64) {
    return `
<div style="
    width: 100%;
    margin: 0;
    padding: 0;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
">
    <img src="${footerImageBase64}" alt="Footer" style="
        width: 100%;
        height: auto;
        display: block;
        margin: 0;
        padding: 0;
    ">
</div>
    `;
}

// =============== ESTILOS CSS =====================

/**
 * Genera los estilos CSS para el PDF
 * @returns {string} CSS completo
 */
function generarEstilosPDF() {
    return `
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        
        .content {
            margin-top: 0px;
            padding-top: 0px;
            padding-right: 10px;
            padding-left: 10px;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0px;
            border: 1px solid #ccc;
            border-left: none;
            border-right: none;
        }
        
        .info-table td {
            border-top: 1px solid #ccc;
            border-bottom: 1px solid #ccc;
            border-left: none;
            border-right: none;
            padding: 6px 8px;
        }
        
        .info-table .label {
            background-color: #e7edc1;
            font-weight: bold;
            width: 200px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
            margin-top: 5px;
        }
        
        .products-table th {
            background-color: #34495e;
            color: white;
            padding: 3px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #2c3e50;
        }
        
        .products-table td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        
        .products-table img {
            max-width: 80px;
            max-height: 80px;
            display: block;
            margin: auto;
            object-fit: contain;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
        }
        
        .totals-box {
            width: 300px;
            border: 2px solid #FF8C00;
            border-radius: 5px;
            overflow: hidden;
        }
        
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 6px;
            border-bottom: 1px solid #ddd;
        }
        
        .totals-row:last-child {
            border-bottom: none;
            background-color: #FF8C00;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .totals-row.subtotal {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .total-letters {
            background-color: #fff3cd;
            border: 2px solid #ffeaa7;
            border-radius: 5px;
            padding: 3px;
            text-align: center;
            margin-bottom: 5px;
            font-weight: bold;
            font-size: 13px;
            color: #856404;
        }
        
        .terms-signature-container {
            page-break-inside: avoid;
            padding: 0px;
            margin: 0px 10px 0 10px;
        }
        
        .terms {
            font-size: 11px;
            line-height: 1.5;
            color: #666;
            margin-bottom: 0px;
            padding: 6px;
            background-color: #f8f9fa;
            border-radius: 5px;
            page-break-inside: avoid;
        }
        
        .signature {
            margin-top: 0px;
            margin-bottom: 0px;
            page-break-inside: avoid;
        }
        
        .signature p {
            margin: 5px 0;
        }
        
        .signature .name {
            font-weight: bold;
            font-size: 14px;
            color: #2c3e50;
        }
        
        .signature .title {
            color: #666;
            font-style: italic;
        }
        
        .totals-section, .total-letters {
            page-break-inside: avoid;
        }
    `;
}

// =============== COMPONENTES HTML =====================

/**
 * Genera la tabla con la información de la cotización
 * @param {Object} cotizacion - Datos de la cotización
 * @param {Function} formatearFechaEspanol - Función para formatear fecha
 * @returns {string} HTML de la tabla
 */
function generarTablaInformacion(cotizacion, formatearFechaEspanol) {
    return `
        <table class="info-table">
            <tr><td class="label" style="width:15%;">Fecha:</td><td>${formatearFechaEspanol(cotizacion.fecha) || ''}</td></tr>
            <tr><td class="label">Empresa:</td><td>${cotizacion.empresa || ''}</td></tr>
            <tr><td class="label">Nombre del contacto:</td><td>${cotizacion.nombre_contacto || ''}</td></tr>
            <tr><td class="label">Contacto:</td><td>${cotizacion.telefono || ''} &nbsp;&nbsp;&nbsp; <strong> email: </strong> ${cotizacion.email || ''}</td></tr>
            <tr><td class="label">Proyecto o servicio:</td><td>${cotizacion.proyecto_servicio || ''}</td></tr>
        </table>`;
}

/**
 * Genera la tabla de productos
 * @param {Array} productos - Array de productos
 * @param {boolean} tieneImagenes - Si algún producto tiene imagen
 * @param {Function} getImagenBase64 - Función para obtener imagen en base64
 * @param {Function} formatearMoneda - Función para formatear moneda
 * @returns {string} HTML de la tabla de productos
 */
function generarTablaProductos(productos, tieneImagenes, getImagenBase64, formatearMoneda) {
    const filasProductos = productos.map(p => {
        const subtotalProducto = p.unidades * p.precio_unitario;
        const precioUnitario = parseFloat(p.precio_unitario);
        const imagenHTML = p.imagen ? `<img src="${getImagenBase64(p.imagen)}" alt="Imagen del producto">` : "";
        
        return `
            <tr>
                <td>${p.unidades}</td>
                <td><strong>${p.nombre_producto}</strong><br>${p.concepto || ""}</td>
                ${tieneImagenes ? `<td>${imagenHTML}</td>` : ""}
                <td>$${formatearMoneda(precioUnitario)}</td>
                <td>$${formatearMoneda(subtotalProducto)}</td>
            </tr>`;
    }).join("");
    
    return `
        <table class="products-table">
            <thead>
                <tr>
                    <th>Unidades</th>
                    <th>Concepto</th>
                    ${tieneImagenes ? `<th>Imagen</th>` : ""}
                    <th>Precio unitario</th>
                    <th>Subtotal sin IVA</th>
                </tr>
            </thead>
            <tbody>
                ${filasProductos}
            </tbody>
        </table>`;
}

/**
 * Genera la sección de totales
 * @param {Object} datos - Datos con subtotal, iva y total
 * @param {Function} formatearMoneda - Función para formatear moneda
 * @returns {string} HTML de la sección de totales
 */
function generarSeccionTotales(datos, formatearMoneda) {
    return `
        <div class="totals-section">
            <div class="totals-box">
                <div class="totals-row subtotal"><span>TOTAL sin IVA</span><span>$${formatearMoneda(parseFloat(datos.subtotal))}</span></div>
                <div class="totals-row"><span>IVA</span><span>$${formatearMoneda(parseFloat(datos.iva))}</span></div>
                <div class="totals-row"><span>TOTAL</span><span>$${formatearMoneda(parseFloat(datos.total))}</span></div>
            </div>
        </div>`;
}

/**
 * Genera el total en letras
 * @param {string} totalEnLetras - Total convertido a letras
 * @returns {string} HTML del total en letras
 */
function generarTotalEnLetras(totalEnLetras) {
    return `
        <div class="total-letters">
            ***(${totalEnLetras.charAt(0).toUpperCase() + totalEnLetras.slice(1)})***
        </div>`;
}

/**
 * Genera la sección de términos y firma
 * @param {string} terminos - Términos y condiciones
 * @returns {string} HTML de términos y firma (vacío si no hay términos)
 */
function generarTerminosYFirma(terminos) {
    // Si no hay términos, no mostrar la sección completa
    if (!terminos || terminos.trim() === '') {
        return '';
    }
    
    return `
        <div class="terms-signature-container">
            <div class="terms">
                <p><strong>Términos y Condiciones:</strong></p>
                <p>${terminos}</p>
            </div>
            <div class="signature">
                <p>C o r d i a l m e n t e .</p>
                <p class="name">Alejandro Galindo M.</p>
                <p class="title">Gerente de Proyectos</p>
            </div>
        </div>`;
}

// =============== GENERACIÓN PRINCIPAL =====================

/**
 * Genera el HTML completo para el PDF de la cotización
 * @param {Object} datos - Objeto con cotización, productos y totales
 * @param {Function} formatearFechaEspanol - Función para formatear fecha
 * @param {Function} getImagenBase64 - Función para obtener imagen en base64
 * @param {Function} formatearMoneda - Función para formatear moneda
 * @returns {string} HTML completo del documento
 */
function generarHTMLCotizacion(datos, formatearFechaEspanol, getImagenBase64, formatearMoneda) {
    const tieneImagenes = datos.productos.some(p => p.imagen && p.imagen.trim() !== "");
    
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotización - ${datos.cotizacion.empresa}</title>
        <style>${generarEstilosPDF()}</style>
    </head>
    <body>
        <div class="content">
            ${generarTablaInformacion(datos.cotizacion, formatearFechaEspanol)}
            ${generarTablaProductos(datos.productos, tieneImagenes, getImagenBase64, formatearMoneda)}
            ${generarSeccionTotales(datos, formatearMoneda)}
            ${generarTotalEnLetras(datos.totalEnLetras)}
            ${generarTerminosYFirma(datos.cotizacion.terminos_condiciones)}
        </div>
    </body>
    </html>
    `;
}

/**
 * Obtiene las opciones completas para generar el PDF
 * @param {string} headerImageBase64 - Imagen del header en formato base64
 * @param {string} footerImageBase64 - Imagen del footer en formato base64
 * @returns {Object} Opciones de configuración para Puppeteer
 */
function obtenerOpcionesPDF(headerImageBase64, footerImageBase64) {
    return {
        ...PDF_CONFIG,
        headerTemplate: generarHeaderTemplate(headerImageBase64),
        footerTemplate: generarFooterTemplate(footerImageBase64)
    };
}

// =============== UTILIDADES CHROMIUM =====================

/**
 * Busca recursivamente el ejecutable de Chrome en un directorio
 * @param {string} basePath - Directorio base para buscar
 * @returns {string|null} Ruta al ejecutable o null si no se encuentra
 */
function findChromeExecutable(basePath) {
    try {
        if (!fs.existsSync(basePath)) {
            return null;
        }
        
        console.log('Buscando Chromium en:', basePath);
        
        const findChrome = (dir) => {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                
                if (item.isDirectory()) {
                    const found = findChrome(fullPath);
                    if (found) return found;
                } else if (item.name === 'chrome.exe') {
                    return fullPath;
                }
            }
            return null;
        };
        
        return findChrome(basePath);
    } catch (error) {
        console.log('Error buscando en:', basePath, error.message);
        return null;
    }
}

/**
 * Obtiene la ruta de Chromium en aplicación empaquetada
 * @param {string} resourcesPath - Ruta a los recursos de la aplicación
 * @returns {string} Ruta al ejecutable
 * @throws {Error} Si no se encuentra Chromium
 */
function getChromiumPathPackaged(resourcesPath) {
    const possiblePaths = [
        path.join(resourcesPath, 'node_modules', 'puppeteer', '.local-chromium'),
        path.join(resourcesPath, '.local-chromium'),
        path.join(resourcesPath, 'chromium'),
        path.join(resourcesPath, 'app', 'node_modules', 'puppeteer', '.local-chromium')
    ];
    
    for (const basePath of possiblePaths) {
        const chromePath = findChromeExecutable(basePath);
        if (chromePath) {
            console.log('Chrome ejecutable encontrado:', chromePath);
            return chromePath;
        }
    }
    
    throw new Error('No se encontró Chromium en la aplicación empaquetada');
}

/**
 * Obtiene la ruta de Chromium en desarrollo
 * @returns {string} Ruta al ejecutable
 */
function getChromiumPathDevelopment() {
    const puppeteer = require('puppeteer');
    return puppeteer.executablePath();
}

// =============== EXPORTS =====================

module.exports = {
    // Configuración
    PDF_CONFIG,
    BROWSER_ARGS,
    
    // Generadores de HTML
    generarHTMLCotizacion,
    obtenerOpcionesPDF,
    
    // Utilidades Chromium
    getChromiumPathPackaged,
    getChromiumPathDevelopment,
    findChromeExecutable
};
