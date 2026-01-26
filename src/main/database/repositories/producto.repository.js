/**
 * Repositorio de Productos
 * Responsabilidad: Acceso a datos de productos en la base de datos
 * Solo maneja operaciones CRUD, sin lógica de negocio
 */

class ProductoRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Obtener todos los productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @param {string} orderBy - Campo y dirección de ordenamiento
   * @returns {Promise<Array>} Array de productos
   */
  async findByCotizacionId(cotizacionId, orderBy = 'orden ASC') {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM Productos WHERE id_cotizacion = ? ORDER BY ${orderBy}`,
        [cotizacionId],
        (err, rows) => {
          if (err) {
            reject(new Error(`Error al obtener productos: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Obtener un producto por ID
   * @param {number} id - ID del producto
   * @returns {Promise<Object|null>} Producto o null si no existe
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM Productos WHERE id_producto = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(new Error(`Error al obtener producto ${id}: ${err.message}`));
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  /**
   * Crear un nuevo producto
   * @param {Object} productoData - Datos del producto
   * @returns {Promise<number>} ID del producto creado
   */
  async create(productoData) {
    const {
      id_cotizacion,
      nombre_producto,
      precio_unitario,
      concepto,
      unidades,
      imagen,
      orden
    } = productoData;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO Productos (
          id_cotizacion,
          nombre_producto,
          precio_unitario,
          concepto,
          unidades,
          imagen,
          orden
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id_cotizacion,
        nombre_producto,
        precio_unitario,
        concepto,
        unidades,
        imagen || null,
        orden || 0
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Error al crear producto: ${err.message}`));
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Actualizar un producto existente
   * @param {number} id - ID del producto
   * @param {Object} productoData - Datos actualizados
   * @returns {Promise<number>} Número de filas afectadas
   */
  async update(id, productoData) {
    const {
      nombre_producto,
      precio_unitario,
      concepto,
      unidades,
      imagen,
      orden
    } = productoData;

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE Productos
        SET
          nombre_producto = ?,
          precio_unitario = ?,
          concepto = ?,
          unidades = ?,
          imagen = ?,
          orden = ?
        WHERE id_producto = ?
      `;

      const params = [
        nombre_producto,
        precio_unitario,
        concepto,
        unidades,
        imagen || null,
        orden || 0,
        id
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Error al actualizar producto ${id}: ${err.message}`));
        } else if (this.changes === 0) {
          reject(new Error(`Producto ${id} no encontrado`));
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Eliminar un producto
   * @param {number} id - ID del producto
   * @returns {Promise<number>} Número de filas eliminadas
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM Productos WHERE id_producto = ?`,
        [id],
        function(err) {
          if (err) {
            reject(new Error(`Error al eliminar producto ${id}: ${err.message}`));
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Eliminar todos los productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<number>} Número de productos eliminados
   */
  async deleteByCotizacionId(cotizacionId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM Productos WHERE id_cotizacion = ?`,
        [cotizacionId],
        function(err) {
          if (err) {
            reject(new Error(`Error al eliminar productos de cotización ${cotizacionId}: ${err.message}`));
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Contar productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<number>} Número de productos
   */
  async countByCotizacionId(cotizacionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as total FROM Productos WHERE id_cotizacion = ?`,
        [cotizacionId],
        (err, row) => {
          if (err) {
            reject(new Error(`Error al contar productos: ${err.message}`));
          } else {
            resolve(row.total);
          }
        }
      );
    });
  }

  /**
   * Verificar si existe un producto
   * @param {number} id - ID del producto
   * @returns {Promise<boolean>} true si existe, false si no
   */
  async exists(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM Productos WHERE id_producto = ?`,
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

  /**
   * Actualizar orden de un producto
   * @param {number} id - ID del producto
   * @param {number} nuevoOrden - Nuevo valor de orden
   * @returns {Promise<number>} Número de filas actualizadas
   */
  async updateOrden(id, nuevoOrden) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE Productos SET orden = ? WHERE id_producto = ?`,
        [nuevoOrden, id],
        function(err) {
          if (err) {
            reject(new Error(`Error al actualizar orden: ${err.message}`));
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Actualizar órdenes de múltiples productos
   * @param {Array<{id: number, orden: number}>} productos - Array de productos con nuevos órdenes
   * @returns {Promise<number>} Número total de productos actualizados
   */
  async updateMultipleOrders(productos) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const stmt = this.db.prepare(`UPDATE Productos SET orden = ? WHERE id_producto = ?`);
        
        let count = 0;
        productos.forEach(producto => {
          stmt.run([producto.orden, producto.id], function(err) {
            if (err) {
              reject(new Error(`Error al actualizar órdenes: ${err.message}`));
            }
            count += this.changes;
          });
        });

        stmt.finalize(() => {
          resolve(count);
        });
      });
    });
  }

  /**
   * Buscar productos por nombre
   * @param {number} cotizacionId - ID de la cotización
   * @param {string} nombre - Nombre a buscar (búsqueda parcial)
   * @returns {Promise<Array>} Array de productos
   */
  async findByNombre(cotizacionId, nombre) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM Productos 
         WHERE id_cotizacion = ? AND nombre_producto LIKE ?
         ORDER BY orden ASC`,
        [cotizacionId, `%${nombre}%`],
        (err, rows) => {
          if (err) {
            reject(new Error(`Error al buscar productos: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Obtener productos con imagen
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<Array>} Array de productos con imagen
   */
  async findWithImages(cotizacionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM Productos 
         WHERE id_cotizacion = ? AND imagen IS NOT NULL AND imagen != ''
         ORDER BY orden ASC`,
        [cotizacionId],
        (err, rows) => {
          if (err) {
            reject(new Error(`Error al obtener productos con imagen: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Calcular subtotal de productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<number>} Subtotal
   */
  async calculateSubtotal(cotizacionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT SUM(unidades * precio_unitario) as subtotal 
         FROM Productos 
         WHERE id_cotizacion = ?`,
        [cotizacionId],
        (err, row) => {
          if (err) {
            reject(new Error(`Error al calcular subtotal: ${err.message}`));
          } else {
            resolve(row.subtotal || 0);
          }
        }
      );
    });
  }
}

module.exports = ProductoRepository;
