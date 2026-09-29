import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 20000,
    // Los archivos de tests/integration comparten una única base de datos
    // Postgres real (docker-compose.test.yml) con beforeEach que hace
    // deleteMany() — correr archivos en paralelo hace que se pisen los
    // datos entre sí. Nunca fue un problema con un solo archivo de
    // integración; con dos (tenant-isolation + row-level-security) se
    // vuelve real. Ejecutar en serie es más lento pero correcto.
    fileParallelism: false,
  },
});
