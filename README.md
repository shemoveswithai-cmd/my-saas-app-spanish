# Crazy Addictive App - Versión Español

Versión en español de la aplicación SaaS.

## Dominio
- Producción: https://es.crazyaddictiveapp.com

## Características
- 23 Herramientas de IA (todas en español)
- Autenticación de usuario (Email/Contraseña + Google OAuth)
- Suscripciones con Stripe ($15/mes)
- Panel de administración
- Base de datos (SQLite/PostgreSQL)

## Variables de Entorno
Ver `.env.example` para las variables de entorno requeridas.

## Despliegue
Desplegado en Railway.

## Desarrollo
```bash
npm install
npm run dev
```

## Producción
```bash
npm run build
npm run start
```

## Estructura del Proyecto
```
spanish_app/
├── src/                  # Código fuente del frontend
│   ├── components/       # Componentes React
│   ├── context/          # Contextos (Auth, Language)
│   ├── api/              # Clientes de API
│   └── App.tsx           # Componente principal
├── server/               # Backend Express
│   ├── routes/           # Rutas de API
│   ├── middleware/       # Middleware de autenticación
│   └── db/               # Configuración de base de datos
├── dist/                 # Archivos compilados
├── package.json          # Dependencias
├── vite.config.ts        # Configuración de Vite
└── railway.json          # Configuración de Railway
```
