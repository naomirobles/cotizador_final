/**
 * Repositorio de Sistema de Archivos
 * Responsabilidad: Operaciones básicas de archivos y directorios
 * Abstracción sobre fs nativo para facilitar testing y mantenimiento
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class FileSystemRepository {
  /**
   * Verificar si un archivo o directorio existe
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>}
   */
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verificar si existe (versión sincrónica)
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  existsSync(filePath) {
    try {
      fsSync.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crear directorio recursivamente
   * @param {string} dirPath - Ruta del directorio
   * @returns {Promise<void>}
   */
  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Error al crear directorio ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Copiar archivo
   * @param {string} source - Ruta origen
   * @param {string} destination - Ruta destino
   * @returns {Promise<void>}
   */
  async copyFile(source, destination) {
    try {
      await fs.copyFile(source, destination);
    } catch (error) {
      throw new Error(`Error al copiar archivo: ${error.message}`);
    }
  }

  /**
   * Copiar archivo (versión sincrónica)
   * @param {string} source - Ruta origen
   * @param {string} destination - Ruta destino
   */
  copyFileSync(source, destination) {
    try {
      fsSync.copyFileSync(source, destination);
    } catch (error) {
      throw new Error(`Error al copiar archivo: ${error.message}`);
    }
  }

  /**
   * Leer archivo como buffer
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Buffer>}
   */
  async readFile(filePath) {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`Error al leer archivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Leer archivo (versión sincrónica)
   * @param {string} filePath - Ruta del archivo
   * @returns {Buffer}
   */
  readFileSync(filePath) {
    try {
      return fsSync.readFileSync(filePath);
    } catch (error) {
      throw new Error(`Error al leer archivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Escribir archivo
   * @param {string} filePath - Ruta del archivo
   * @param {Buffer|string} data - Datos a escribir
   * @returns {Promise<void>}
   */
  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, data);
    } catch (error) {
      throw new Error(`Error al escribir archivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Escribir archivo (versión sincrónica)
   * @param {string} filePath - Ruta del archivo
   * @param {Buffer|string} data - Datos a escribir
   */
  writeFileSync(filePath, data) {
    try {
      fsSync.writeFileSync(filePath, data);
    } catch (error) {
      throw new Error(`Error al escribir archivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Error al eliminar archivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo (versión sincrónica)
   * @param {string} filePath - Ruta del archivo
   */
  deleteFileSync(filePath) {
    try {
      fsSync.unlinkSync(filePath);
    } catch (error) {
      throw new Error(`Error al eliminar archivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Listar archivos en un directorio
   * @param {string} dirPath - Ruta del directorio
   * @returns {Promise<string[]>}
   */
  async listFiles(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      throw new Error(`Error al listar archivos en ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Listar archivos (versión sincrónica)
   * @param {string} dirPath - Ruta del directorio
   * @returns {string[]}
   */
  listFilesSync(dirPath) {
    try {
      return fsSync.readdirSync(dirPath);
    } catch (error) {
      throw new Error(`Error al listar archivos en ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas del archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<fs.Stats>}
   */
  async getStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      throw new Error(`Error al obtener stats de ${filePath}: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas (versión sincrónica)
   * @param {string} filePath - Ruta del archivo
   * @returns {fs.Stats}
   */
  getStatsSync(filePath) {
    try {
      return fsSync.statSync(filePath);
    } catch (error) {
      throw new Error(`Error al obtener stats de ${filePath}: ${error.message}`);
    }
  }

  /**
   * Obtener extensión de archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {string} Extensión sin el punto (ej: 'jpg', 'png')
   */
  getExtension(filePath) {
    return path.extname(filePath).toLowerCase().substring(1);
  }

  /**
   * Obtener nombre base del archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {string}
   */
  getBasename(filePath) {
    return path.basename(filePath);
  }

  /**
   * Unir rutas
   * @param {...string} paths - Segmentos de ruta
   * @returns {string}
   */
  joinPath(...paths) {
    return path.join(...paths);
  }
}

module.exports = FileSystemRepository;
