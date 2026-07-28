/** The site header: the scrolled state, and the mobile navigation.
 *
 * The nav ships **open** and is closed from here, so a visitor without
 * JavaScript gets a usable menu rather than a button that does nothing.
 */
export function initHeader(): void {
  const header = document.getElementById('site-header');
  if (!header) return;

  liftHeader(header);

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

/** Take the header out of the flow, and hold its place with `--header-h`.
 *
 * The slim state is some 235px shorter than the tall one. While the header sat
 * *in* the document flow, collapsing it took those 235px out of the page above
 * the viewport — and the browser handed them straight back as scroll, which is
 * scroll anchoring keeping what you were reading still. That put `scrollY`
 * back under the 60px threshold, so the class came off, the header grew again,
 * and the next wheel notch repeated it: on a desktop the page could not be
 * scrolled past its own header, which flickered between the two states. Phones
 * never saw it, because below 800px both `.scrolled` rules are overridden and
 * the height never changes.
 *
 * No threshold can fix that: the class decides the height, and the height
 * decides the class. Breaking the loop means making the collapse cost the page
 * no height at all, so the header is lifted out of the flow and `--header-h`
 * takes over the space it used to occupy. That height follows the viewport
 * only — never the scrolled class — so the two stop talking to each other.
 */
function liftHeader(header: HTMLElement): void {
  const publish = (name: string) =>
    document.documentElement.style.setProperty(name, `${header.offsetHeight}px`);

  const measure = () => {
    // Both heights are wanted and only one of them is on show, so the class is
    // flipped through each state to read it — with nothing animating in
    // between. `--header-h` holds the space in the flow; `--header-slim-h` is
    // what an in-page anchor has to clear (see global.css).
    const slim = header.classList.contains('scrolled');
    header.classList.add('js-measuring');
    header.classList.remove('scrolled');
    publish('--header-h');
    header.classList.add('scrolled');
    publish('--header-slim-h');
    header.classList.toggle('scrolled', slim);
    void header.offsetHeight; // settle the flip before transitions come back
    header.classList.remove('js-measuring');
  };

  measure(); // still in the flow here, so the tall height is the one to keep
  document.documentElement.classList.add('js-header-fixed');

  // The nav wraps at some widths, so the tall height is a function of the
  // viewport. One measurement per frame keeps the forced layout cheap while a
  // window is being dragged.
  let queued = false;
  window.addEventListener('resize', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; measure(); });
  }, { passive: true });

  // A late webfont can rewrap the nav, and a spacer that is short by one line
  // leaves the page sitting under the header.
  document.fonts?.ready.then(measure);
}
