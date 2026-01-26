/**
 * Servicio de Gestión de Archivos
 * Responsabilidad: Lógica de negocio para manejo de archivos e imágenes
 * Coordina entre repositorio filesystem y validadores
 */

const { FileValidator } = require('../utils/file.validators');

class FileManagerService {
  constructor(fileSystemRepo, appPaths) {
    this.fsRepo = fileSystemRepo;
    this.paths = appPaths;
    
    // Inicializar directorios al crear el servicio
    this._initializeDirectories();
  }

  /**
   * Inicializar directorios necesarios
   * @private
   */
  _initializeDirectories() {
    const directories = [
      this.paths.pdfs,
      this.paths.images,
      this.paths.tempPdfs
    ];

    directories.forEach(dir => {
      if (!this.fsRepo.existsSync(dir)) {
        try {
          this.fsRepo.createDirectory(dir);
          console.log('✓ Directorio creado:', dir);
        } catch (error) {
          console.error('Error creando directorio:', dir, error);
        }
      }
    });
  }

  // ============ GESTIÓN DE IMÁGENES ============

  /**
   * Copiar imagen a workspace
   * @param {string} originalPath - Ruta de imagen original
   * @param {string} customName - Nombre personalizado opcional
   * @returns {Promise<string>} Nombre del archivo guardado
   */
  async copyImageToWorkspace(originalPath, customName = null) {
    // 1. Validar ruta origen
    FileValidator.validatePath(originalPath);

    // 2. Verificar que existe
    if (!await this.fsRepo.exists(originalPath)) {
      throw new Error(`Archivo no encontrado: ${originalPath}`);
    }

    // 3. Obtener stats y validar imagen
    const stats = await this.fsRepo.getStats(originalPath);
    FileValidator.validateImageFile(originalPath, stats.size);

    // 4. Generar nombre de archivo
    const fileName = customName || this._generateImageName(originalPath);
    const destinationPath = this.fsRepo.joinPath(this.paths.images, fileName);

    // 5. Copiar archivo
    await this.fsRepo.copyFile(originalPath, destinationPath);

    console.log(`✓ Imagen copiada: ${fileName}`);
    return fileName;
  }

  /**
   * Obtener ruta completa de imagen
   * @param {string} fileName - Nombre del archivo
   * @returns {string|null} Ruta completa o null
   */
  getImagePath(fileName) {
    if (!fileName) return null;
    return this.fsRepo.joinPath(this.paths.images, fileName);
  }

  /**
   * Verificar si imagen existe
   * @param {string} fileName - Nombre del archivo
   * @returns {boolean}
   */
  imageExists(fileName) {
    if (!fileName) return false;
    const imagePath = this.getImagePath(fileName);
    return this.fsRepo.existsSync(imagePath);
  }

  /**
   * Obtener imagen como base64
   * @param {string} fileName - Nombre del archivo
   * @returns {string|null} String base64 o null
   */
  getImageAsBase64(fileName) {
    try {
      if (!fileName) return null;

      const imagePath = this.getImagePath(fileName);

      if (!this.fsRepo.existsSync(imagePath)) {
        console.warn('Imagen no encontrada:', imagePath);
        return null;
      }

      const imageBuffer = this.fsRepo.readFileSync(imagePath);
      const extension = this.fsRepo.getExtension(fileName);
      const mimeType = FileValidator.getMimeType(extension);

      if (!mimeType) {
        console.warn('Tipo MIME no reconocido para:', extension);
        return null;
      }

      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Error convirtiendo imagen a base64:', error);
      return null;
    }
  }

  /**
   * Eliminar imagen
   * @param {string} fileName - Nombre del archivo
   * @returns {Promise<boolean>} true si se eliminó
   */
  async deleteImage(fileName) {
    try {
      if (!fileName) return false;

      const imagePath = this.getImagePath(fileName);

      if (!await this.fsRepo.exists(imagePath)) {
        return false;
      }

      await this.fsRepo.deleteFile(imagePath);
      console.log(`✓ Imagen eliminada: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      return false;
    }
  }

  /**
   * Listar todas las imágenes
   * @returns {Promise<Array>} Array de nombres de archivo
   */
  async listImages() {
    try {
      const files = await this.fsRepo.listFiles(this.paths.images);
      return files.filter(file => 
        FileValidator.isValidImageExtension(this.fsRepo.getExtension(file))
      );
    } catch (error) {
      console.error('Error listando imágenes:', error);
      return [];
    }
  }

  // ============ GESTIÓN DE PDFS ============

  /**
   * Generar ruta para PDF temporal
   * @param {string} baseName - Nombre base del PDF
   * @returns {string} Ruta completa
   */
  generateTempPdfPath(baseName) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileName = FileValidator.sanitizeFileName(`${baseName}_${timestamp}_${randomId}.pdf`);
    return this.fsRepo.joinPath(this.paths.tempPdfs, fileName);
  }

  /**
   * Generar ruta para PDF permanente
   * @param {string} baseName - Nombre base del PDF
   * @returns {string} Ruta completa
   */
  generatePermanentPdfPath(baseName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = FileValidator.sanitizeFileName(`${baseName}_${timestamp}.pdf`);
    return this.fsRepo.joinPath(this.paths.pdfs, fileName);
  }

  /**
   * Guardar PDF permanentemente
   * @param {string} tempPath - Ruta temporal del PDF
   * @param {string} baseName - Nombre base para el archivo
   * @returns {Promise<string>} Ruta del PDF guardado
   */
  async savePdfPermanently(tempPath, baseName) {
    try {
      if (!await this.fsRepo.exists(tempPath)) {
        throw new Error('Archivo temporal no encontrado');
      }

      const permanentPath = this.generatePermanentPdfPath(baseName);
      await this.fsRepo.copyFile(tempPath, permanentPath);

      console.log(`✓ PDF guardado permanentemente: ${permanentPath}`);
      return permanentPath;
    } catch (error) {
      console.error('Error guardando PDF:', error);
      throw error;
    }
  }

  /**
   * Eliminar PDF temporal
   * @param {string} pdfPath - Ruta del PDF
   * @returns {Promise<boolean>}
   */
  async deleteTempPdf(pdfPath) {
    try {
      if (!await this.fsRepo.exists(pdfPath)) {
        return false;
      }

      await this.fsRepo.deleteFile(pdfPath);
      console.log(`✓ PDF temporal eliminado: ${pdfPath}`);
      return true;
    } catch (error) {
      console.error('Error eliminando PDF temporal:', error);
      return false;
    }
  }

  // ============ LIMPIEZA DE ARCHIVOS ANTIGUOS ============

  /**
   * Limpiar archivos antiguos
   * @param {number} daysOld - Días de antigüedad
   * @returns {Promise<number>} Número de archivos eliminados
   */
  async cleanOldFiles(daysOld = 7) {
    // Validar días
    FileValidator.validateRetentionDays(daysOld);

    const directories = [this.paths.tempPdfs];
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const dir of directories) {
      try {
        if (!await this.fsRepo.exists(dir)) continue;

        const files = await this.fsRepo.listFiles(dir);

        for (const file of files) {
          const filePath = this.fsRepo.joinPath(dir, file);
          const stats = await this.fsRepo.getStats(filePath);

          if (stats.mtime.getTime() < cutoffDate) {
            await this.fsRepo.deleteFile(filePath);
            deletedCount++;
            console.log(`✓ Archivo antiguo eliminado: ${file}`);
          }
        }
      } catch (error) {
        console.error(`Error limpiando archivos en ${dir}:`, error);
      }
    }

    if (deletedCount > 0) {
      console.log(`✓ Total de archivos antiguos eliminados: ${deletedCount}`);
    }

    return deletedCount;
  }

  // ============ ESTADÍSTICAS ============

  /**
   * Obtener estadísticas de uso de espacio
   * @returns {Promise<Object>} Estadísticas
   */
  async getStorageStats() {
    const stats = {
      images: { count: 0, totalSize: 0 },
      pdfs: { count: 0, totalSize: 0 },
      tempPdfs: { count: 0, totalSize: 0 }
    };

    try {
      // Contar imágenes
      const images = await this.fsRepo.listFiles(this.paths.images);
      stats.images.count = images.length;
      for (const img of images) {
        const imgPath = this.fsRepo.joinPath(this.paths.images, img);
        const imgStats = await this.fsRepo.getStats(imgPath);
        stats.images.totalSize += imgStats.size;
      }

      // Contar PDFs
      const pdfs = await this.fsRepo.listFiles(this.paths.pdfs);
      stats.pdfs.count = pdfs.length;
      for (const pdf of pdfs) {
        const pdfPath = this.fsRepo.joinPath(this.paths.pdfs, pdf);
        const pdfStats = await this.fsRepo.getStats(pdfPath);
        stats.pdfs.totalSize += pdfStats.size;
      }

      // Contar PDFs temporales
      const tempPdfs = await this.fsRepo.listFiles(this.paths.tempPdfs);
      stats.tempPdfs.count = tempPdfs.length;
      for (const pdf of tempPdfs) {
        const pdfPath = this.fsRepo.joinPath(this.paths.tempPdfs, pdf);
        const pdfStats = await this.fsRepo.getStats(pdfPath);
        stats.tempPdfs.totalSize += pdfStats.size;
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    }

    return stats;
  }

  // ============ GETTERS PÚBLICOS ============

  /**
   * Obtiene el directorio de imágenes
   * @returns {string} Ruta del directorio de imágenes
   */
  get imageDir() {
    return this.paths.images;
  }

  /**
   * Obtiene el directorio de PDFs
   * @returns {string} Ruta del directorio de PDFs
   */
  get pdfDir() {
    return this.paths.pdfs;
  }

  /**
   * Obtiene el directorio de PDFs temporales
   * @returns {string} Ruta del directorio de PDFs temporales
   */
  get tempPdfDir() {
    return this.paths.tempPdfs;
  }

  // ============ MÉTODOS PRIVADOS (HELPERS) ============

  /**
   * Generar nombre único para imagen
   * @private
   */
  _generateImageName(originalPath) {
    const baseName = this.fsRepo.getBasename(originalPath);
    const timestamp = Date.now();
    return `${timestamp}_${baseName}`;
  }
}

module.exports = FileManagerService;
