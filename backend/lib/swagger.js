const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gentionale LSE API',
      version: '1.0.0',
      description: 'Backend API per Gentionale LSE - Gestione Calendario, Membri, Eventi e RSI',
      contact: {
        name: 'Support',
        email: 'support@gentionale.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
      {
        url: 'http://localhost:5000/api/v1',
        description: 'API v1 Base Path',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token ottenuto da /api/v1/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'ID univoco utente',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email utente',
            },
            password: {
              type: 'string',
              minLength: 8,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
              description: 'Password (min 8 caratteri, uppercase, lowercase, numero)',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Member: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            discordId: {
              type: 'string',
            },
            username: {
              type: 'string',
            },
            avatar: {
              type: 'string',
            },
            roles: {
              type: 'array',
              items: { type: 'string' },
            },
            joinedAt: {
              type: 'string',
              format: 'date-time',
            },
            isDeleted: {
              type: 'boolean',
            },
          },
        },
        Event: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
            },
            location: {
              type: 'string',
            },
            attendees: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            statusCode: {
              type: 'integer',
            },
          },
        },
      },
    },
    security: [],
  },
  apis: [],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
