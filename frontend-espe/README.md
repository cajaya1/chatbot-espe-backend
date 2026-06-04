## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Variables de entorno

```bash
copy .env.example .env.local
```

En Linux/macOS:

```bash
cp .env.example .env.local
```

Configura al menos:

- `VITE_API_URL` (por defecto `http://localhost:8000`)
- `VITE_SUPPORT_EMAIL` para recuperación de contraseña

## Ejecutar

```bash
npm run dev
```
