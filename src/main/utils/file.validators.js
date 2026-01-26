/**
 * Validadores para Gestión de Archivos
 * Responsabilidad: Validar rutas, extensiones, tamaños, etc.
 */

class FileValidator {
  /**
   * Extensiones válidas para imágenes
   */
  static VALID_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

  /**
   * Extensiones válidas para PDFs
   */
  static VALID_PDF_EXTENSIONS = ['pdf'];

  /**
   * Tipos MIME para imágenes
   */
  static IMAGE_MIME_TYPES = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp'
  };

  /**
   * Tamaño máximo de imagen en bytes (5MB)
   */
  static MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  /**
   * Validar si una ruta es válida
   * @param {string} filePath - Ruta a validar
   * @throws {ValidationError}
   * @returns {boolean}
   */
  static validatePath(filePath) {
    const errors = [];

    if (!filePath || typeof filePath !== 'string') {
      errors.push('La ruta del archivo es requerida');
    }

    if (filePath && filePath.trim().length === 0) {
      errors.push('La ruta del archivo no puede estar vacía');
    }

    // Validar caracteres inválidos en Windows (excluyendo : para unidades)
    // Permitimos : solo al inicio de la ruta (ej: C:, D:)
    if (filePath) {
      // Separar la unidad del resto de la ruta
      const withoutDrive = filePath.replace(/^[A-Za-z]:/, '');
      // Validar que el resto no contenga caracteres inválidos
      if (/[<>:"|?*]/.test(withoutDrive)) {
        errors.push('La ruta contiene caracteres inválidos');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }

  /**
   * Validar si es una extensión de imagen válida
   * @param {string} extension - Extensión sin punto (ej: 'jpg')
   * @returns {boolean}
   */
  static isValidImageExtension(extension) {
    if (!extension) return false;
    return this.VALID_IMAGE_EXTENSIONS.includes(extension.toLowerCase());
  }

  /**
   * Validar si es una extensión de PDF válida
   * @param {string} extension - Extensión sin punto
   * @returns {boolean}
   */
  static isValidPdfExtension(extension) {
    if (!extension) return false;
    return this.VALID_PDF_EXTENSIONS.includes(extension.toLowerCase());
  }

  /**
   * Validar archivo de imagen
   * @param {string} filePath - Ruta del archivo
   * @param {number} fileSize - Tamaño del archivo en bytes
   * @throws {ValidationError}
   * @returns {boolean}
   */
  static validateImageFile(filePath, fileSize = null) {
    const errors = [];

    // Validar ruta
    try {
      this.validatePath(filePath);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(...error.errors);
      }
    }

    // Validar extensión
    const extension = filePath.split('.').pop().toLowerCase();
    if (!this.isValidImageExtension(extension)) {
      errors.push(`Extensión inválida. Extensiones permitidas: ${this.VALID_IMAGE_EXTENSIONS.join(', ')}`);
    }

    // Validar tamaño
    if (fileSize !== null) {
      if (fileSize <= 0) {
        errors.push('El archivo está vacío');
      }

      if (fileSize > this.MAX_IMAGE_SIZE) {
        const maxSizeMB = this.MAX_IMAGE_SIZE / (1024 * 1024);
        errors.push(`El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }

  /**
   * Validar nombre de archivo
   * @param {string} fileName - Nombre del archivo
   * @throws {ValidationError}
   * @returns {boolean}
   */
  static validateFileName(fileName) {
    const errors = [];

    if (!fileName || typeof fileName !== 'string') {
      errors.push('El nombre del archivo es requerido');
    }

    if (fileName && fileName.trim().length === 0) {
      errors.push('El nombre del archivo no puede estar vacío');
    }

    // Validar caracteres inválidos
    if (fileName && /[<>:"/\\|?*]/.test(fileName)) {
      errors.push('El nombre contiene caracteres inválidos');
    }

    // Validar longitud
    if (fileName && fileName.length > 255) {
      errors.push('El nombre del archivo es demasiado largo (máximo 255 caracteres)');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }

  /**
   * Obtener tipo MIME de una extensión
   * @param {string} extension - Extensión sin punto
   * @returns {string|null} Tipo MIME o null si no es válido
   */
  static getMimeType(extension) {
    if (!extension) return null;
    return this.IMAGE_MIME_TYPES[extension.toLowerCase()] || null;
  }

  /**
   * Validar que un directorio sea seguro
   * @param {string} dirPath - Ruta del directorio
   * @throws {ValidationError}
   * @returns {boolean}
   */
  static validateDirectory(dirPath) {
    const errors = [];

    if (!dirPath || typeof dirPath !== 'string') {
      errors.push('La ruta del directorio es requerida');
    }

    if (dirPath && dirPath.trim().length === 0) {
      errors.push('La ruta del directorio no puede estar vacía');
    }

    // Validar que no sea una ruta de sistema crítica
    const dangerousPaths = ['C:\\Windows', 'C:\\Program Files', '/etc', '/usr', '/bin'];
    if (dirPath && dangerousPaths.some(dangerous => dirPath.startsWith(dangerous))) {
      errors.push('No se permite acceso a directorios del sistema');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }

  /**
   * Sanitizar nombre de archivo
   * @param {string} fileName - Nombre a sanitizar
   * @returns {string} Nombre sanitizado
   */
  static sanitizeFileName(fileName) {
    if (!fileName) return '';

    // Eliminar caracteres inválidos
    let sanitized = fileName.replace(/[<>:"/\\|?*]/g, '_');

    // Limitar longitud
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.substring(0, 250) + '.' + extension;
    }

    return sanitized.trim();
  }

  /**
   * Validar días de retención
   * @param {number} days - Número de días
   * @throws {ValidationError}
   * @returns {boolean}
   */
  static validateRetentionDays(days) {
    const errors = [];

    if (days === undefined || days === null) {
      errors.push('El número de días es requerido');
    }

    if (!Number.isInteger(days) || days < 1) {
      errors.push('Los días deben ser un número entero mayor a 0');
    }

    if (days > 365) {
      errors.push('Los días no pueden exceder 365');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }
}

/**
 * Error personalizado para validaciones de archivos
 */
class ValidationError extends Error {
  constructor(errors) {
    const message = Array.isArray(errors) ? errors.join(', ') : errors;
    super(message);
    this.name = 'ValidationError';
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.statusCode = 400;
  }
}

module.exports = {
  FileValidator,
  ValidationError
};
