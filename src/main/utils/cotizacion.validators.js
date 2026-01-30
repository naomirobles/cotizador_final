/**
 * Validadores para Cotizaciones
 * Responsabilidad: Validar datos de entrada antes de procesarlos
 * No maneja lógica de negocio ni acceso a datos
 */

class CotizacionValidator {
  /**
   * Validar datos para crear una cotización
   * @param {Object} data - Datos a validar
   * @throws {ValidationError} Si los datos son inválidos
   * @returns {boolean} true si es válido
   */
  static validateCreate(data) {
    const errors = [];

    // Validar empresa
    if (!data.empresa || typeof data.empresa !== 'string') {
      errors.push('El nombre de la empresa es requerido');
    } else if (data.empresa.trim().length === 0) {
      errors.push('El nombre de la empresa no puede estar vacío');
    } else if (data.empresa.trim().length > 200) {
      errors.push('El nombre de la empresa no puede exceder 200 caracteres');
    }

    // Validar nombre de contacto
    if (!data.nombre_contacto || typeof data.nombre_contacto !== 'string') {
      errors.push('El nombre del contacto es requerido');
    } else if (data.nombre_contacto.trim().length === 0) {
      errors.push('El nombre del contacto no puede estar vacío');
    } else if (data.nombre_contacto.trim().length > 200) {
      errors.push('El nombre del contacto no puede exceder 200 caracteres');
    }

    // Validar proyecto o servicio
    if (!data.proyecto_servicio || typeof data.proyecto_servicio !== 'string') {
      errors.push('El proyecto o servicio es requerido');
    } else if (data.proyecto_servicio.trim().length === 0) {
      errors.push('El proyecto o servicio no puede estar vacío');
    } else if (data.proyecto_servicio.trim().length > 500) {
      errors.push('El proyecto o servicio no puede exceder 500 caracteres');
    }

    // Validar fecha
    if (!data.fecha) {
      errors.push('La fecha es requerida');
    } else if (!this.isValidDate(data.fecha)) {
      errors.push('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    // Validar teléfono (opcional pero si existe debe ser válido)
    if (data.telefono && typeof data.telefono === 'string') {
      if (data.telefono.trim().length > 0 && !this.isValidPhone(data.telefono)) {
        errors.push('Formato de teléfono inválido');
      }
    }

    // Validar email (opcional pero si existe debe ser válido)
    if (data.email && typeof data.email === 'string') {
      if (data.email.trim().length > 0 && !this.isValidEmail(data.email)) {
        errors.push('Formato de email inválido');
      }
    }

    // Validar ordenar
    if (data.ordenar && !this.isValidOrderOption(data.ordenar)) {
      errors.push('Opción de ordenamiento inválida');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return true;
  }

  /**
   * Validar datos para actualizar una cotización
   * @param {number} id - ID de la cotización
   * @param {Object} data - Datos a validar
   * @throws {ValidationError} Si los datos son inválidos
   * @returns {boolean} true si es válido
   */
  static validateUpdate(id, data) {
    const errors = [];

    // Validar ID
    if (!id || !Number.isInteger(id) || id <= 0) {
      errors.push('ID de cotización inválido');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Reutilizar validación de create
    return this.validateCreate(data);
  }

  /**
   * Validar ID para operaciones de lectura/eliminación
   * @param {number} id - ID a validar
   * @throws {ValidationError} Si el ID es inválido
   * @returns {boolean} true si es válido
   */
  static validateId(id) {
    if (id === undefined || id === null) {
      throw new ValidationError([
        `El ID de cotización es requerido (valor recibido: ${id})`
      ]);
    }

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError([
        `El ID de cotización debe ser un número entero positivo. Valor recibido: ${id}`
      ]);
    }

    return true;
  }


  /**
   * Verificar si una fecha tiene formato válido YYYY-MM-DD
   * @param {string} dateString - Fecha a validar
   * @returns {boolean} true si es válida
   */
  static isValidDate(dateString) {
    // Verificar formato YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    // Verificar que sea una fecha válida
    const date = new Date(dateString + 'T00:00:00');
    return !isNaN(date.getTime());
  }

  /**
   * Verificar si un email es válido
   * @param {string} email - Email a validar
   * @returns {boolean} true si es válido
   */
  static isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Verificar si un teléfono es válido (formato flexible)
   * @param {string} phone - Teléfono a validar
   * @returns {boolean} true si es válido
   */
  static isValidPhone(phone) {
    // Permitir números, espacios, guiones, paréntesis y +
    const regex = /^[\d\s\-\+\(\)]{7,20}$/;
    return regex.test(phone);
  }

  /**
   * Verificar si la opción de ordenamiento es válida
   * @param {string} ordenar - Opción de ordenamiento
   * @returns {boolean} true si es válida
   */
  static isValidOrderOption(ordenar) {
    const validOptions = [
      'id-asc', 
      'id-desc', 
      'nombre-asc', 
      'nombre-desc', 
      'precio-asc', 
      'precio-desc'
    ];
    return validOptions.includes(ordenar);
  }

  /**
   * Sanitizar datos de entrada
   * @param {Object} data - Datos a sanitizar
   * @returns {Object} Datos sanitizados
   */
  static sanitize(data) {
    return {
      empresa: data.empresa ? data.empresa.trim() : '',
      fecha: data.fecha ? data.fecha.trim() : '',
      nombre_contacto: data.nombre_contacto ? data.nombre_contacto.trim() : '',
      telefono: data.telefono ? data.telefono.trim() : '',
      email: data.email ? data.email.trim().toLowerCase() : '',
      proyecto_servicio: data.proyecto_servicio ? data.proyecto_servicio.trim() : '',
      ordenar: data.ordenar ? data.ordenar.trim() : 'id-desc',
      // Mantener string vacío si es string vacío, solo convertir undefined a null
      terminos_condiciones: data.terminos_condiciones !== undefined 
        ? (typeof data.terminos_condiciones === 'string' ? data.terminos_condiciones.trim() : data.terminos_condiciones)
        : null
    };
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
  CotizacionValidator,
  ValidationError
};
