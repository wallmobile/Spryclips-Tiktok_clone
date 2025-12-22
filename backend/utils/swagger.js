const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { PUBLIC_URL } = require('./config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Spryclips API',
      version: '1.0.0',
      description: 'API documentation for Spryclips application',
      contact: {
        name: 'API Support',
        email: 'support@spryclips.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : PUBLIC_URL),
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './index.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi
};

