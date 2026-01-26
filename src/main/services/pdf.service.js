/**
 * SERVICIO DE GENERACIÓN DE PDF
 * Maneja toda la lógica de creación de PDFs con Puppeteer
 */

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

class PDFService {
  constructor(db, fileManager, pdfGenerator, formatters, imageHelpers) {
    this.db = db;
    this.fileManager = fileManager;
    this.pdfGenerator = pdfGenerator;
    this.formatters = formatters;
    this.imageHelpers = imageHelpers;
  }

  /**
   * Obtiene los datos completos de una cotización con sus productos
   * @param {number} id_cotizacion - ID de la cotización
   * @returns {Promise<Object>} Datos completos de la cotización
   */
  async obtenerDatosCotizacion(id_cotizacion) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM Cotizaciones WHERE id_cotizacion = ?`,
        [id_cotizacion],
        (err, cotizacion) => {
          if (err) {
            reject(err);
            return;
          }
          
          // La columna 'orden' en Productos ya guarda la posición visual correcta
          // No importa el criterio, solo seguimos el orden guardado
          const queryProductos = `SELECT * FROM Productos WHERE id_cotizacion = ? ORDER BY orden ASC`;
          
          console.log('Criterio usado por usuario:', cotizacion?.ordenar || 'no definido');
          console.log('Query productos para PDF:', queryProductos);
          
          this.db.all(queryProductos, [id_cotizacion], (err, productos) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Log para verificar el orden
            console.log('Productos en PDF:');
            productos.forEach((p, i) => {
              console.log(`  ${i}: orden=${p.orden}, id=${p.id_producto}, nombre=${p.nombre_producto}`);
            });
            
            let subtotal = 0;
            productos.forEach(p => subtotal += (p.unidades * p.precio_unitario));
            const iva = subtotal * 0.16;
            const total = subtotal + iva;
            
            resolve({
              cotizacion,
              productos,
              subtotal: subtotal.toFixed(2),
              iva: iva.toFixed(2),
              total: total.toFixed(2),
              totalEnLetras: this.formatters.numeroALetras(total)
            });
          });
        }
      );
    });
  }

  /**
   * Genera el contenido HTML del PDF
   * @param {Object} datos - Datos de la cotización
   * @param {string} assetsDir - Directorio de assets
   * @returns {string} HTML generado
   */
  generarHTML(datos, assetsDir) {
    // Crear función wrapper para getImagenBase64 usando el método del FileManager
    const getImagenBase64Wrapper = (nombreArchivo) => {
      console.log('🖼️  Intentando cargar imagen:', nombreArchivo);
      
      if (!nombreArchivo) {
        console.warn('⚠️  Nombre de archivo vacío');
        return null;
      }
      
      const base64 = this.fileManager.getImageAsBase64(nombreArchivo);
      
      if (base64) {
        console.log('✅ Imagen cargada exitosamente:', nombreArchivo, '(tamaño:', base64.length, 'chars)');
      } else {
        console.error('❌ Error cargando imagen:', nombreArchivo);
      }
      
      return base64;
    };

    return this.pdfGenerator.generarHTMLCotizacion(
      datos,
      this.formatters.formatearFechaEspanol,
      getImagenBase64Wrapper,
      this.formatters.formatearMoneda
    );
  }

  /**
   * Carga las imágenes de header y footer como base64
   * @param {string} assetsDir - Directorio de assets
   * @returns {Object} { headerBase64, footerBase64 }
   */
  cargarImagenesHeaderFooter(assetsDir) {
    const headerPath = path.join(assetsDir, 'cabeza_cotizacion.png');
    const footerPath = path.join(assetsDir, 'pie_cotizacion.png');
    
    console.log('Cargando header desde:', headerPath);
    console.log('Cargando footer desde:', footerPath);
    
    const headerBase64 = this.imageHelpers.getAssetImageBase64(headerPath);
    const footerBase64 = this.imageHelpers.getAssetImageBase64(footerPath);
    
    if (!headerBase64 || !footerBase64) {
      throw new Error('No se pudieron cargar las imágenes de header/footer');
    }
    
    return { headerBase64, footerBase64 };
  }

  /**
   * Genera un PDF para una cotización usando Puppeteer
   * @param {number} id_cotizacion - ID de la cotización
   * @param {Object} app - Instancia de Electron app
   * @param {string} assetsDir - Directorio de assets
   * @returns {Promise<Object>} Información del PDF generado
   */
  async generarPDF(id_cotizacion, app, assetsDir) {
    const puppeteer = require('puppeteer-core');
    let browser = null;
    
    try {
      console.log('Iniciando generación de PDF para cotización:', id_cotizacion);

      // 1. Obtener datos completos
      const datos = await this.obtenerDatosCotizacion(id_cotizacion);

      // 2. Generar HTML
      const htmlContent = this.generarHTML(datos, assetsDir);
      
      // 3. Obtener ruta de Chromium
      const executablePath = app.isPackaged 
        ? this.pdfGenerator.getChromiumPathPackaged(process.resourcesPath)
        : this.pdfGenerator.getChromiumPathDevelopment();
      
      // 4. Iniciar Puppeteer
      browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: true,
        args: this.pdfGenerator.BROWSER_ARGS
      });
      
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // 5. Cargar imágenes de header/footer
      const { headerBase64, footerBase64 } = this.cargarImagenesHeaderFooter(assetsDir);
      
      // 6. Obtener opciones de PDF
      const pdfOptions = this.pdfGenerator.obtenerOpcionesPDF(headerBase64, footerBase64);

      // 7. Generar buffer del PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      // 8. Guardar archivo temporal
      const fileName = `cotizacion_${datos.cotizacion.empresa}`;
      const filePath = this.fileManager.generateTempPdfPath(fileName);
      
      fs.writeFileSync(filePath, pdfBuffer);

      console.log('✓ PDF generado con módulo pdf-generator:', filePath);

      return { 
        success: true, 
        filePath, 
        fileName: path.basename(filePath),
        datos: datos.cotizacion
      };

    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Abre un PDF y programa su eliminación
   * @param {string} filePath - Ruta del archivo PDF
   * @param {number} deleteDelay - Delay en ms antes de eliminar (default: 3000)
   * @returns {Promise<Object>} Resultado de la operación
   */
  async abrirPDF(filePath, deleteDelay = 3000) {
    try {
      // Abrir el archivo
      await shell.openPath(filePath);
      
      // Programar eliminación después de un breve delay
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Archivo temporal eliminado:', filePath);
          }
        } catch (deleteError) {
          console.warn('No se pudo eliminar el archivo temporal:', deleteError.message);
        }
      }, deleteDelay);
      
      return { success: true };
    } catch (error) {
      console.error('Error al abrir PDF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Abre la carpeta de PDFs permanentes
   * @returns {Promise<Object>} Resultado de la operación
   */
  async abrirCarpetaPDFs() {
    try {
      await shell.openPath(this.fileManager.pdfDir);
      return { success: true };
    } catch (error) {
      console.error('Error abriendo carpeta de PDFs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Guarda un PDF temporal de forma permanente
   * @param {string} tempFilePath - Ruta del archivo temporal
   * @param {string} customName - Nombre personalizado (opcional)
   * @returns {Promise<Object>} Resultado con ruta del archivo permanente
   */
  async guardarPDFPermanente(tempFilePath, customName = null) {
    try {
      const fileName = customName || 'cotizacion';
      const permanentPath = this.fileManager.generatePermanentPdfPath(fileName);
      
      // Copiar archivo temporal a ubicación permanente
      fs.copyFileSync(tempFilePath, permanentPath);
      
      console.log('PDF guardado permanentemente en:', permanentPath);
      
      return { success: true, filePath: permanentPath };
    } catch (error) {
      console.error('Error guardando PDF permanente:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PDFService;
