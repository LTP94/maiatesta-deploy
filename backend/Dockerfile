# Imagen de producción del backend — para uso en Hostinger, no en desarrollo
# local (docker-compose.yml usa el código fuente directamente vía tsx).
#
# Node 24 (LTS activa) en las tres etapas — build, operations y runtime usan
# EXACTAMENTE la misma imagen base, nunca versiones distintas entre donde se
# compila y donde se ejecuta. Node 20 llegó a fin de soporte; @prisma/client,
# prisma, express e ioredis declaran únicamente un mínimo de Node (">=16.13"
# o menor), sin techo superior, así que Node 24 es compatible sin cambios de
# dependencias — confirmado leyendo los `engines` de cada paquete instalado,
# no asumido.
FROM node:24-alpine AS build
WORKDIR /app
# openssl es obligatorio ANTES de `prisma generate`: el motor de Prisma para
# linux-musl detecta la versión de OpenSSL instalada para elegir el binario
# correcto (openssl-3.0.x en esta base de Alpine) — sin esto, la detección
# falla silenciosamente y Prisma puede descargar un motor incompatible.
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Imagen operativa (migraciones, bootstrap de roles, rotación de claves) —
# nunca se publica como servicio de red, solo se ejecuta como job puntual
# (ver el perfil "operations" en docker-compose.hostinger.yml), así que
# mantiene el usuario root de la imagen base sin cambios.
FROM build AS operations
RUN apk add --no-cache postgresql-client
COPY scripts ./scripts

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Necesario en runtime porque el motor de Prisma ya generado enlaza
# dinámicamente contra libssl — sin esto el proceso falla al conectar a
# Postgres, no al arrancar (el fallo sería tardío y confuso).
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Usuario sin privilegios — `node` (uid/gid 1000) ya viene incluido en la
# imagen oficial node:24-alpine, no se crea uno nuevo. Todo lo que el
# proceso necesita en runtime es lectura (dist/, node_modules/, prisma/) más
# la red — nunca escritura en /app, así que es compatible con
# `read_only: true` + `tmpfs: /tmp` (docker-compose.hostinger.yml) sin
# ajustes de permisos adicionales: los archivos copiados quedan legibles
# para cualquier usuario por defecto, y el proceso no escribe en su propio
# árbol de archivos en ningún punto (ver ARCHITECTURE_DECISION.md).
USER node

EXPOSE 4000
CMD ["node", "dist/index.js"]
