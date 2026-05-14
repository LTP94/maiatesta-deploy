/**
 * StarsBackground
 *
 * Capa de estrellas distribuidas por toda la pagina, mas alla del Hero.
 * Se compone de dos estratos:
 *   - Lejano (1 px, opacidad suave, parpadeo lento)
 *   - Cercano (1.5–2 px, mas brillante, parpadeo rapido)
 *
 * Ambas capas se renderizan con radial-gradients CSS (GPU-only) y se
 * animan via CSS keyframes. Sin JavaScript de particulas, sin canvas
 */

export function StarsBackground() {
  return (
    <div className='stars-bg' aria-hidden='true'>
      <div className='stars-bg__layer stars-bg__layer--far' />
      <div className='stars-bg__layer stars-bg__layer--near' />
    </div>
  );
}
