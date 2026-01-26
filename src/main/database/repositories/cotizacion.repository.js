/**
 * Repositorio de Cotizaciones
 * Responsabilidad: Acceso a datos de cotizaciones en la base de datos
 * Solo maneja operaciones CRUD, sin lógica de negocio
 */

class CotizacionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Obtener todas las cotizaciones
   * @param {string} orderBy - Campo y dirección de ordenamiento (ej: 'fecha DESC')
   * @returns {Promise<Array>} Array de cotizaciones
   */
  async findAll(orderBy = 'fecha DESC') {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM Cotizaciones ORDER BY ${orderBy}`,
        [],
        (err, rows) => {
          if (err) {
            reject(new Error(`Error al obtener cotizaciones: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Obtener una cotización por ID
   * @param {number} id - ID de la cotización
   * @returns {Promise<Object|null>} Cotización o null si no existe
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM Cotizaciones WHERE id_cotizacion = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(new Error(`Error al obtener cotización ${id}: ${err.message}`));
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  /**
   * Crear una nueva cotización
   * @param {Object} cotizacionData - Datos de la cotización
   * @returns {Promise<number>} ID de la cotización creada
   */
  async create(cotizacionData) {
    const { 
      empresa, 
      fecha, 
      nombre_contacto, 
      telefono, 
      email, 
      proyecto_servicio, 
      ordenar, 
      terminos_condiciones 
    } = cotizacionData;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO Cotizaciones (
          empresa, 
          fecha, 
          nombre_contacto, 
          telefono, 
          email, 
          proyecto_servicio, 
          ordenar, 
          terminos_condiciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        empresa, 
        fecha, 
        nombre_contacto, 
        telefono, 
        email, 
        proyecto_servicio, 
        ordenar, 
        terminos_condiciones
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Error al crear cotización: ${err.message}`));
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Actualizar una cotización existente
   * @param {number} id - ID de la cotización
   * @param {Object} cotizacionData - Datos actualizados
   * @returns {Promise<number>} Número de filas afectadas
   */
  async update(id, cotizacionData) {
    const { 
      empresa, 
      fecha, 
      nombre_contacto, 
      telefono, 
      email, 
      proyecto_servicio, 
      ordenar, 
      terminos_condiciones 
    } = cotizacionData;

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE Cotizaciones 
        SET 
          empresa = ?, 
          fecha = ?, 
          nombre_contacto = ?, 
          telefono = ?, 
          email = ?, 
          proyecto_servicio = ?, 
          ordenar = ?, 
          terminos_condiciones = ? 
        WHERE id_cotizacion = ?
      `;

      const params = [
        empresa, 
        fecha, 
        nombre_contacto, 
        telefono, 
        email, 
        proyecto_servicio, 
        ordenar, 
        terminos_condiciones, 
        id
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Error al actualizar cotización ${id}: ${err.message}`));
        } else if (this.changes === 0) {
          reject(new Error(`Cotización ${id} no encontrada`));
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Eliminar una cotización
   * @param {number} id - ID de la cotización
   * @returns {Promise<number>} Número de filas eliminadas
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM Cotizaciones WHERE id_cotizacion = ?`,
        [id],
        function(err) {
          if (err) {
            reject(new Error(`Error al eliminar cotización ${id}: ${err.message}`));
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Buscar cotizaciones por empresa
   * @param {string} empresa - Nombre de la empresa (búsqueda parcial)
   * @returns {Promise<Array>} Array de cotizaciones
   */
  async findByEmpresa(empresa) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM Cotizaciones WHERE empresa LIKE ? ORDER BY fecha DESC`,
        [`%${empresa}%`],
        (err, rows) => {
          if (err) {
            reject(new Error(`Error al buscar cotizaciones: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Buscar cotizaciones por rango de fechas
   * @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
   * @returns {Promise<Array>} Array de cotizaciones
   */
  async findByDateRange(fechaInicio, fechaFin) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM Cotizaciones 
         WHERE fecha BETWEEN ? AND ? 
         ORDER BY fecha DESC`,
        [fechaInicio, fechaFin],
        (err, rows) => {
          if (err) {
            reject(new Error(`Error al buscar por fechas: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Contar total de cotizaciones
   * @returns {Promise<number>} Número total de cotizaciones
   */
  async count() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as total FROM Cotizaciones`,
        [],
        (err, row) => {
          if (err) {
            reject(new Error(`Error al contar cotizaciones: ${err.message}`));
          } else {
            resolve(row.total);
          }
        }
      );
    });
  }

  /**
   * Verificar si existe una cotización
   * @param {number} id - ID de la cotización
   * @returns {Promise<boolean>} true si existe, false si no
   */
  async exists(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM Cotizaciones WHERE id_cotizacion = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(new Error(`Error al verificar existencia: ${err.message}`));
          } else {
            resolve(row.count > 0);
          }
        }
      );
    });
  }
}

module.exports = CotizacionRepository;
