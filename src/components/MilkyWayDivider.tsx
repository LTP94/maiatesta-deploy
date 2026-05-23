/** Animated milky-way band used as a decorative section divider between Projects and FAQ. */
export function MilkyWayDivider() {
  return (
    <section className='milky-way-divider scroll-reveal' aria-hidden='true'>
      <div className='milky-way-divider__band'>
        <span className='milky-way-divider__core' />
        <span className='milky-way-divider__dust milky-way-divider__dust--a' />
        <span className='milky-way-divider__dust milky-way-divider__dust--b' />
        <span className='milky-way-divider__dust milky-way-divider__dust--c' />
      </div>
    </section>
  );
}
