const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002; // Usamos puerto diferente al de correos

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ruta de la carpeta donde guardaremos los JSON
const DB_PATH = path.join(__dirname, 'database');

// Crear carpeta database si no existe
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH);
  console.log('📁 Carpeta database creada');
}

// ========== FUNCIONES AUXILIARES ==========

// Leer archivo JSON
const readJSON = (filename) => {
  const filepath = path.join(DB_PATH, `${filename}.json`);
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error leyendo ${filename}:`, error);
    return null;
  }
};

// Escribir archivo JSON
const writeJSON = (filename, data) => {
  const filepath = path.join(DB_PATH, `${filename}.json`);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error escribiendo ${filename}:`, error);
    return false;
  }
};

// Crear backup automático
const createBackup = (filename) => {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(DB_PATH, 'backups');
  
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath);
  }
  
  const originalFile = path.join(DB_PATH, `${filename}.json`);
  const backupFile = path.join(backupPath, `${filename}_${timestamp}.json`);
  
  try {
    if (fs.existsSync(originalFile)) {
      fs.copyFileSync(originalFile, backupFile);
      console.log(`💾 Backup creado: ${filename}_${timestamp}.json`);
    }
  } catch (error) {
    console.error('Error creando backup:', error);
  }
};

// ========== ENDPOINTS ==========

// 📊 GUARDAR PRODUCTIVIDAD
app.post('/api/db/productividad/save', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Datos inválidos. Se requiere un array.' 
      });
    }
    
    // Crear backup antes de guardar
    createBackup('productividad');
    
    // Guardar datos
    const success = writeJSON('productividad', data);
    
    if (success) {
      console.log(`✅ Productividad guardada: ${data.length} registros`);
      res.json({ 
        success: true, 
        count: data.length,
        message: 'Productividad guardada exitosamente'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Error al guardar productividad' 
      });
    }
  } catch (error) {
    console.error('Error en /save:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📊 OBTENER PRODUCTIVIDAD
app.get('/api/db/productividad/get', (req, res) => {
  try {
    const data = readJSON('productividad');
    
    if (data) {
      console.log(`📖 Productividad leída: ${data.length} registros`);
      res.json({ 
        success: true, 
        data: data,
        count: data.length
      });
    } else {
      // Si no existe, devolver array vacío
      res.json({ 
        success: true, 
        data: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error en /get:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🔧 GUARDAR CONFIGURACIÓN GENERAL
app.post('/api/db/config/save', (req, res) => {
  try {
    const { collection, data } = req.body;
    
    if (!collection || !data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere collection y data' 
      });
    }
    
    createBackup(collection);
    const success = writeJSON(collection, data);
    
    if (success) {
      console.log(`✅ ${collection} guardado`);
      res.json({ 
        success: true, 
        message: `${collection} guardado exitosamente` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: `Error al guardar ${collection}` 
      });
    }
  } catch (error) {
    console.error('Error en /config/save:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🔧 OBTENER CONFIGURACIÓN GENERAL
app.get('/api/db/config/get/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const data = readJSON(collection);
    
    if (data) {
      console.log(`📖 ${collection} leído`);
      res.json({ 
        success: true, 
        data: data 
      });
    } else {
      res.json({ 
        success: true, 
        data: null 
      });
    }
  } catch (error) {
    console.error('Error en /config/get:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📋 LISTAR TODAS LAS COLECCIONES
app.get('/api/db/collections', (req, res) => {
  try {
    const files = fs.readdirSync(DB_PATH)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const name = file.replace('.json', '');
        const filepath = path.join(DB_PATH, file);
        const stats = fs.statSync(filepath);
        const data = readJSON(name);
        
        return {
          name: name,
          size: stats.size,
          modified: stats.mtime,
          records: Array.isArray(data) ? data.length : 'N/A'
        };
      });
    
    res.json({ 
      success: true, 
      collections: files 
    });
  } catch (error) {
    console.error('Error en /collections:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🗑️ ELIMINAR COLECCIÓN
app.delete('/api/db/delete/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const filepath = path.join(DB_PATH, `${collection}.json`);
    
    if (fs.existsSync(filepath)) {
      createBackup(collection); // Backup antes de eliminar
      fs.unlinkSync(filepath);
      console.log(`🗑️ ${collection} eliminado`);
      res.json({ 
        success: true, 
        message: `${collection} eliminado exitosamente` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Colección no encontrada' 
      });
    }
  } catch (error) {
    console.error('Error en /delete:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 💾 CREAR BACKUP MANUAL
app.post('/api/db/backup/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    createBackup(collection);
    res.json({ 
      success: true, 
      message: `Backup de ${collection} creado exitosamente` 
    });
  } catch (error) {
    console.error('Error en /backup:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📊 ESTADÍSTICAS DE LA BASE DE DATOS
app.get('/api/db/stats', (req, res) => {
  try {
    const files = fs.readdirSync(DB_PATH).filter(f => f.endsWith('.json'));
    let totalSize = 0;
    let totalRecords = 0;
    
    files.forEach(file => {
      const filepath = path.join(DB_PATH, file);
      const stats = fs.statSync(filepath);
      totalSize += stats.size;
      
      const data = readJSON(file.replace('.json', ''));
      if (Array.isArray(data)) {
        totalRecords += data.length;
      }
    });
    
    res.json({
      success: true,
      stats: {
        collections: files.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        totalRecords: totalRecords,
        path: DB_PATH
      }
    });
  } catch (error) {
    console.error('Error en /stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
  console.log('');
  console.log('🗄️  ========================================');
  console.log('🗄️   BASE DE DATOS JSON INICIADA');
  console.log('🗄️  ========================================');
  console.log(`📂  Ruta: ${DB_PATH}`);
  console.log(`🌐  Puerto: ${PORT}`);
  console.log(`📡  URL: http://localhost:${PORT}`);
  console.log('🗄️  ========================================');
  console.log('   Endpoints disponibles:');
  console.log('   POST   /api/db/productividad/save');
  console.log('   GET    /api/db/productividad/get');
  console.log('   POST   /api/db/config/save');
  console.log('   GET    /api/db/config/get/:collection');
  console.log('   GET    /api/db/collections');
  console.log('   DELETE /api/db/delete/:collection');
  console.log('   POST   /api/db/backup/:collection');
  console.log('   GET    /api/db/stats');
  console.log('🗄️  ========================================');
  console.log('');
});

module.exports = app;
