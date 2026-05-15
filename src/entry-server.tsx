import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
// @ts-expect-error Node types are intentionally not installed for this tiny SSG entry.
import { PassThrough } from 'node:stream';
import App from './App';

export function render() {
  return new Promise<string>((resolve, reject) => {
    let html = '';
    const stream = new PassThrough();

    stream.on('data', (chunk: { toString(): string }) => {
      html += chunk.toString();
    });
    stream.on('end', () => resolve(html));
    stream.on('error', reject);

    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <App />
      </StrictMode>,
      {
        onAllReady() {
          pipe(stream);
        },
        onError(error) {
          reject(error);
        },
      },
    );
  });
}
