/**
 * Validadores para Productos
 * Responsabilidad: Validar datos de entrada antes de procesarlos
 * No maneja lógica de negocio ni acceso a datos
 */

class ProductoValidator {
  /**
   * Validar datos para crear un producto
   * @param {Object} data - Datos a validar
   * @throws {ValidationError} Si los datos son inválidos
   * @returns {boolean} true si es válido
   */
  static validateCreate(data) {
    const errors = [];

    // Validar ID de cotización
    if (!data.id_cotizacion) {
      errors.push('El ID de cotización es requerido');
    } else if (!Number.isInteger(data.id_cotizacion) || data.id_cotizacion <= 0) {
      errors.push('El ID de cotización debe ser un número positivo');
    }

    // Validar nombre del producto
    if (!data.nombre_producto || typeof data.nombre_producto !== 'string') {
      errors.push('El nombre del producto es requerido');
    } else if (data.nombre_producto.trim().length === 0) {
      errors.push('El nombre del producto no puede estar vacío');
    } else if (data.nombre_producto.trim().length > 200) {
      errors.push('El nombre del producto no puede exceder 200 caracteres');
    }

    // Validar concepto/descripción
    if (!data.concepto || typeof data.concepto !== 'string') {
      errors.push('El concepto/descripción es requerido');
    } else if (data.concepto.trim().length === 0) {
      errors.push('El concepto no puede estar vacío');
    } else if (data.concepto.trim().length > 1000) {
      errors.push('El concepto no puede exceder 1000 caracteres');
    }

    // Validar unidades
    if (data.unidades === undefined || data.unidades === null) {
      errors.push('Las unidades son requeridas');
    } else if (!Number.isInteger(data.unidades) || data.unidades < 1) {
      errors.push('Las unidades deben ser un número entero mayor a 0');
    } else if (data.unidades > 999999) {
      errors.push('Las unidades no pueden exceder 999,999');
    }

    // Validar precio unitario
    if (data.precio_unitario === undefined || data.precio_unitario === null) {
      errors.push('El precio unitario es requerido');
    } else {
      const precio = parseFloat(data.precio_unitario);
      if (isNaN(precio)) {
        errors.push('El precio unitario debe ser un número válido');
      } else if (precio < 0) {
        errors.push('El precio unitario no puede ser negativo');
      } else if (precio > 999999999.99) {
        errors.push('El precio unitario es demasiado alto');
      }
    }

    // Validar orden (opcional)
    if (data.orden !== undefined && data.orden !== null) {
      if (!Number.isInteger(data.orden) || data.orden < 0) {
        errors.push('El orden debe ser un número entero no negativo');
      }
    }

    // Validar imagen (opcional)
    if (data.imagen && typeof data.imagen === 'string') {
      if (data.imagen.trim().length > 500) {
        errors.push('El nombre de la imagen no puede exceder 500 caracteres');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }

  /**
   * Validar datos para actualizar un producto
   * @param {number} id - ID del producto
   * @param {Object} data - Datos a validar
   * @throws {ValidationError} Si los datos son inválidos
   * @returns {boolean} true si es válido
   */
  static validateUpdate(id, data) {
    const errors = [];

    // Validar ID
    if (!id || !Number.isInteger(id) || id <= 0) {
      errors.push('ID de producto inválido');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Reutilizar validación de create (sin validar id_cotizacion)
    const dataToValidate = { ...data, id_cotizacion: 1 }; // Dummy ID para validación
    return this.validateCreate(dataToValidate);
  }

  /**
   * Validar ID para operaciones de lectura/eliminación
   * @param {number} id - ID a validar
   * @throws {ValidationError} Si el ID es inválido
   * @returns {boolean} true si es válido
   */
  static validateId(id) {
    if (!id) {
      throw new ValidationError(['El ID del producto es requerido']);
    }

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(['El ID del producto debe ser un número positivo']);
    }

    return true;
  }

  /**
   * Validar ID de cotización
   * @param {number} cotizacionId - ID a validar
   * @throws {ValidationError} Si el ID es inválido
   * @returns {boolean} true si es válido
   */
  static validateCotizacionId(cotizacionId) {
    if (!cotizacionId) {
      throw new ValidationError(['El ID de cotización es requerido']);
    }

    if (!Number.isInteger(cotizacionId) || cotizacionId <= 0) {
      throw new ValidationError(['El ID de cotización debe ser un número positivo']);
    }

    return true;
  }

  /**
   * Validar datos para importación desde Excel
   * @param {Object} data - Datos importados
   * @returns {Object} Datos validados y transformados
   */
  static validateImportData(data) {
    const errors = [];
    const validated = {};

    // Nombre del producto
    if (data.nombre_producto && String(data.nombre_producto).trim()) {
      validated.nombre_producto = String(data.nombre_producto).trim();
    } else {
      errors.push('El nombre del producto es requerido para importación');
    }

    // Concepto
    if (data.concepto && String(data.concepto).trim()) {
      validated.concepto = String(data.concepto).trim();
    } else {
      errors.push('El concepto es requerido para importación');
    }

    // Unidades - intentar convertir a número
    if (data.unidades !== undefined && data.unidades !== null) {
      const unidades = parseInt(data.unidades);
      if (!isNaN(unidades) && unidades > 0) {
        validated.unidades = unidades;
      } else {
        errors.push('Las unidades deben ser un número válido mayor a 0');
      }
    } else {
      errors.push('Las unidades son requeridas');
    }

    // Precio - intentar convertir a número
    if (data.precio_unitario !== undefined && data.precio_unitario !== null) {
      const precio = parseFloat(String(data.precio_unitario).replace(/[^0-9.-]/g, ''));
      if (!isNaN(precio) && precio >= 0) {
        validated.precio_unitario = precio;
      } else {
        errors.push('El precio unitario debe ser un número válido no negativo');
      }
    } else {
      errors.push('El precio unitario es requerido');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return validated;
  }

  /**
   * Verificar si un precio es válido
   * @param {number|string} precio - Precio a validar
   * @returns {boolean} true si es válido
   */
  static isValidPrice(precio) {
    const num = parseFloat(precio);
    return !isNaN(num) && num >= 0 && num <= 999999999.99;
  }

  /**
   * Verificar si las unidades son válidas
   * @param {number|string} unidades - Unidades a validar
   * @returns {boolean} true si es válido
   */
  static isValidUnits(unidades) {
    const num = parseInt(unidades);
    return Number.isInteger(num) && num >= 1 && num <= 999999;
  }

  /**
   * Verificar si el orden es válido
   * @param {number} orden - Orden a validar
   * @returns {boolean} true si es válido
   */
  static isValidOrder(orden) {
    return Number.isInteger(orden) && orden >= 0;
  }

  /**
   * Verificar si una imagen existe y es válida
   * @param {string} imagePath - Ruta de la imagen
   * @returns {boolean} true si es válida
   */
  static isValidImagePath(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
      return false;
    }

    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const extension = imagePath.toLowerCase().substring(imagePath.lastIndexOf('.'));
    
    return validExtensions.includes(extension);
  }

  /**
   * Sanitizar datos de entrada
   * @param {Object} data - Datos a sanitizar
   * @returns {Object} Datos sanitizados
   */
  static sanitize(data) {
    return {
      id_cotizacion: data.id_cotizacion ? parseInt(data.id_cotizacion) : null,
      nombre_producto: data.nombre_producto ? data.nombre_producto.trim() : '',
      concepto: data.concepto ? data.concepto.trim() : '',
      unidades: data.unidades ? parseInt(data.unidades) : 0,
      precio_unitario: data.precio_unitario ? parseFloat(data.precio_unitario) : 0,
      imagen: data.imagen ? data.imagen.trim() : null,
      orden: data.orden !== undefined ? parseInt(data.orden) : 0
    };
  }

  /**
   * Validar array de productos para importación masiva
   * @param {Array} productos - Array de productos
   * @returns {Object} Resultado de validación
   */
  static validateBulkImport(productos) {
    if (!Array.isArray(productos)) {
      throw new ValidationError(['Los productos deben ser un array']);
    }

    if (productos.length === 0) {
      throw new ValidationError(['Debe haber al menos un producto para importar']);
    }

    if (productos.length > 1000) {
      throw new ValidationError(['No se pueden importar más de 1000 productos a la vez']);
    }

    const validados = [];
    const errores = [];

    productos.forEach((producto, index) => {
      try {
        const validado = this.validateImportData(producto);
        validados.push(validado);
      } catch (error) {
        if (error instanceof ValidationError) {
          errores.push({
            fila: index + 1,
            errores: error.errors
          });
        }
      }
    });

    return {
      validos: validados,
      errores: errores,
      totalValidos: validados.length,
      totalErrores: errores.length
    };
  }

  /**
   * Validar criterio de ordenamiento
   * @param {string} orderBy - Criterio de ordenamiento
   * @returns {boolean} true si es válido
   */
  static isValidOrderBy(orderBy) {
    const validOptions = [
      'orden ASC',
      'orden DESC',
      'nombre_producto ASC',
      'nombre_producto DESC',
      'precio_unitario ASC',
      'precio_unitario DESC',
      'unidades ASC',
      'unidades DESC'
    ];
    return validOptions.includes(orderBy);
  }
}

/**
 * Error personalizado para validaciones
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
  ProductoValidator,
  ValidationError
};
