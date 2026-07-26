/** The site header: the scrolled state, and the mobile navigation.
 *
 * The nav ships **open** and is closed from here, so a visitor without
 * JavaScript gets a usable menu rather than a button that does nothing.
 */
export function initHeader(): void {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}
