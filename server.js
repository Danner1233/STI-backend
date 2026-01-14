const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Endpoint para enviar correos
app.post('/api/send-email', async (req, res) => {
  try {
    const { emailData, smtpConfig } = req.body;

    console.log('📧 Recibida petición de envío de correo...');
    console.log('📤 Enviando a:', emailData.toAddress);

    // Configurar el transporter SMTP de Zoho Mail
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: smtpConfig.email, // Tu correo de Zoho
        pass: smtpConfig.password // Tu contraseña de Zoho o App Password
      }
    });

    // Preparar las opciones del correo
    const mailOptions = {
      from: emailData.fromAddress,
      to: emailData.toAddress,
      subject: emailData.subject,
      html: emailData.content,
    };

    // Agregar CC si existe
    if (emailData.cc && emailData.cc.trim()) {
      mailOptions.cc = emailData.cc;
      console.log('📧 CC:', emailData.cc);
    }

    // Agregar adjuntos si existen
    if (emailData.attachments && emailData.attachments.length > 0) {
      console.log('📎 Adjuntando archivos:', emailData.attachments.length);
      
      mailOptions.attachments = emailData.attachments.map(att => {
        // Detectar el tipo de archivo
        const fileName = att.attachmentName.toLowerCase();
        let contentType = 'application/octet-stream'; // Por defecto
        
        if (fileName.endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (fileName.endsWith('.zip')) {
          contentType = 'application/zip';
        } else if (fileName.endsWith('.rar')) {
          contentType = 'application/x-rar-compressed';
        } else if (fileName.endsWith('.7z')) {
          contentType = 'application/x-7z-compressed';
        } else if (fileName.endsWith('.doc')) {
          contentType = 'application/msword';
        } else if (fileName.endsWith('.docx')) {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileName.endsWith('.xls')) {
          contentType = 'application/vnd.ms-excel';
        } else if (fileName.endsWith('.xlsx')) {
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        
        console.log(`  📎 ${att.attachmentName} (${contentType})`);
        
        return {
          filename: att.attachmentName, // SIN CAMBIAR LA EXTENSIÓN
          content: Buffer.from(att.content, 'base64'),
          contentType: contentType
        };
      });
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Correo enviado exitosamente');
    console.log('📧 Message ID:', info.messageId);

    res.json({ 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    });

  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
    res.status(500).json({ 
      error: 'Error al enviar el correo', 
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('🚀  SERVIDOR SMTP ZOHO MAIL INICIADO');
  console.log('🚀 ========================================');
  console.log(`🌐  URL: http://localhost:${PORT}`);
  console.log(`📧  Endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`❤️   Health: http://localhost:${PORT}/api/health`);
  console.log('🚀 ========================================');
  console.log('   USANDO SMTP DIRECTO (sin API REST)');
  console.log('   ✅ Soporta archivos adjuntos');
  console.log('🚀 ========================================');
  console.log('');
});