const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const heroVideo = document.querySelector('.hero-media video');
const heroSection = document.querySelector('.hero');
const floatingWhatsapp = document.querySelector('.floating-whatsapp');

if (heroVideo) {
  heroVideo.defaultMuted = true;
  heroVideo.muted = true;
  const startHeroVideo = () => heroVideo.play().catch(() => {});
  if (heroVideo.readyState >= 2) startHeroVideo();
  else heroVideo.addEventListener('canplay', startHeroVideo, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) startHeroVideo();
  });
}

if (heroSection && floatingWhatsapp && 'IntersectionObserver' in window) {
  const heroContactObserver = new IntersectionObserver(([entry]) => {
    floatingWhatsapp.classList.toggle('is-over-hero', entry.isIntersecting);
  }, { threshold: .18 });
  heroContactObserver.observe(heroSection);
}

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  mobileMenu.hidden = !open;
  document.body.classList.toggle('menu-open', open);
}

menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});

mobileMenu.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 800 && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
});

const serviceTabs = [...document.querySelectorAll('.service-tab[data-service-category]')];
const servicePanels = [...document.querySelectorAll('.service-panel[data-service-panel]')];

function showServiceCategory(category, focusTab = false, userInitiated = false) {
  serviceTabs.forEach(tab => {
    const active = tab.dataset.serviceCategory === category;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focusTab) tab.focus();
  });

  servicePanels.forEach(panel => {
    const active = panel.dataset.servicePanel === category;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });

  if (userInitiated) {
    const activeTab = serviceTabs.find(tab => tab.dataset.serviceCategory === category);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeTab?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }
}

serviceTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showServiceCategory(tab.dataset.serviceCategory, false, true));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % serviceTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + serviceTabs.length) % serviceTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = serviceTabs.length - 1;
    showServiceCategory(serviceTabs[nextIndex].dataset.serviceCategory, true, true);
  });
});

if (serviceTabs.length) showServiceCategory(serviceTabs[0].dataset.serviceCategory);

const btuArea = document.querySelector('#btu-area');
const btuAreaValue = document.querySelector('#btu-area-value');
const btuCapacity = document.querySelector('#btu-capacity');
const btuCoverage = document.querySelector('#btu-coverage');
const btuWhatsapp = document.querySelector('#btu-whatsapp');
const btuRanges = [
  { capacity: 9000, maxArea: 18 },
  { capacity: 12000, maxArea: 24 },
  { capacity: 18000, maxArea: 36 },
  { capacity: 24000, maxArea: 48 },
  { capacity: 36000, maxArea: 72 },
  { capacity: 48000, maxArea: 96 },
  { capacity: 60000, maxArea: 120 }
];
const formatBtu = value => new Intl.NumberFormat('es-CL').format(value);

function updateBtuGuide() {
  if (!btuArea) return;
  const area = Number(btuArea.value);
  const recommendation = btuRanges.find(item => area <= item.maxArea) || btuRanges[btuRanges.length - 1];
  const capacityLabel = `${formatBtu(recommendation.capacity)} BTU/h`;

  if (btuAreaValue) btuAreaValue.textContent = `${area} m²`;
  if (btuCapacity) btuCapacity.textContent = capacityLabel;
  if (btuCoverage) btuCoverage.textContent = `Cobertura referencial: hasta ${recommendation.maxArea} m²`;
  btuArea.setAttribute('aria-valuetext', `${area} metros cuadrados`);

  if (btuWhatsapp) {
    const message = `Hola BYN Servicios. Necesito climatizar un espacio de ${area} m². La guía indica ${capacityLabel}. Quisiera confirmar la capacidad y cotizar.`;
    btuWhatsapp.href = `https://wa.me/56932630625?text=${encodeURIComponent(message)}`;
  }
}

btuArea?.addEventListener('input', updateBtuGuide);
updateBtuGuide();

const catalogTabs = [...document.querySelectorAll('.catalog-tab')];
const productCards = [...document.querySelectorAll('.product-card[data-category]')];
const catalogStatus = document.querySelector('.catalog-status');
const catalogToggle = document.querySelector('#catalog-toggle');
const catalogPreviewLimit = 3;
let activeCatalogCategory = catalogTabs[0]?.dataset.category || 'residencial';

function showCategory(category, focusTab = false, userInitiated = false, expanded = false) {
  const matchingCards = productCards.filter(card => card.dataset.category === category);
  activeCatalogCategory = category;

  productCards.forEach(card => {
    const categoryIndex = matchingCards.indexOf(card);
    const visible = categoryIndex >= 0 && (expanded || categoryIndex < catalogPreviewLimit);
    card.hidden = !visible;
  });

  catalogTabs.forEach(tab => {
    const active = tab.dataset.category === category;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focusTab) tab.focus();
  });

  if (catalogStatus) {
    const total = matchingCards.length;
    catalogStatus.innerHTML = `<strong>${total}</strong> ${total === 1 ? 'solución disponible' : 'soluciones disponibles'}`;
  }

  if (catalogToggle) {
    const remaining = Math.max(0, matchingCards.length - catalogPreviewLimit);
    catalogToggle.hidden = remaining === 0;
    catalogToggle.setAttribute('aria-expanded', String(expanded));
    catalogToggle.classList.toggle('is-expanded', expanded);
    catalogToggle.firstChild.textContent = expanded ? 'Mostrar menos ' : `Ver ${remaining} ${remaining === 1 ? 'producto más' : 'productos más'} `;
  }

  const activeTab = catalogTabs.find(tab => tab.dataset.category === category);
  const catalogPanel = document.querySelector('#catalog-products');
  catalogPanel?.setAttribute('aria-labelledby', activeTab?.id || 'tab-residencial');

  if (userInitiated && activeTab) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeTab.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center'
    });
    catalogPanel?.scrollTo({ left: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

catalogTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showCategory(tab.dataset.category, false, true));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % catalogTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + catalogTabs.length) % catalogTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = catalogTabs.length - 1;
    showCategory(catalogTabs[nextIndex].dataset.category, true, true);
  });
});

catalogToggle?.addEventListener('click', () => {
  const expanded = catalogToggle.getAttribute('aria-expanded') !== 'true';
  showCategory(activeCatalogCategory, false, false, expanded);

  if (!expanded) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#catalog-products')?.scrollTo({ left: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
});

if (catalogTabs.length) showCategory(catalogTabs[0].dataset.category);

const reviewForm = document.querySelector('#review-form');
const reviewRating = document.querySelector('#review-rating');
const reviewName = document.querySelector('#review-name');
const reviewLocation = document.querySelector('#review-location');
const reviewMessage = document.querySelector('#review-message');
const reviewFormStatus = document.querySelector('#review-form-status');
const reviewList = document.querySelector('#review-list');
const reviewListStatus = document.querySelector('#review-list-status');
const reviewLoadMore = document.querySelector('#review-load-more');
let reviewCursor = null;
let reviewLoading = false;
let reviewRequestId = null;
const displayedReviewIds = new Set();

function reviewElement(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value != null) element.textContent = value;
  return element;
}

function appendReview(review, prepend = false) {
  if (!reviewList || displayedReviewIds.has(review.id)) return;
  displayedReviewIds.add(review.id);
  reviewList.querySelector('.review-empty')?.remove();
  const card = reviewElement('article', 'review-card');
  card.dataset.reviewId = review.id;
  const top = reviewElement('div', 'review-card-top');
  const stars = reviewElement('span', 'review-stars', '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating));
  stars.setAttribute('aria-label', `${review.rating} de 5 estrellas`);
  const date = reviewElement('time', '', new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt)));
  date.dateTime = review.createdAt;
  top.append(stars, date);
  const footer = reviewElement('footer');
  const initials = review.name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  const avatar = reviewElement('span', 'review-avatar', initials);
  avatar.setAttribute('aria-hidden', 'true');
  const identity = reviewElement('span');
  identity.append(reviewElement('strong', '', review.name), reviewElement('small', '', review.location || 'Cliente BYN Servicios'));
  footer.append(avatar, identity);
  // All submitted content is rendered as text, never HTML.
  card.append(top, reviewElement('p', '', review.message), footer);
  prepend ? reviewList.prepend(card) : reviewList.append(card);
  if (reviewListStatus) reviewListStatus.textContent = 'Experiencias compartidas con BYN Servicios.';
}

async function reviewApi(options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/reviews${options.cursor ? `?cursor=${encodeURIComponent(options.cursor)}` : ''}`, { ...options, cache: 'no-store', signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No pudimos guardar o cargar las reseñas. Inténtalo de nuevo.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La conexión está tardando. Inténtalo de nuevo; no borraremos lo que escribiste.');
    if (error instanceof SyntaxError || error instanceof TypeError) throw new Error('No se pudo conectar con las reseñas. Inténtalo de nuevo en unos minutos.');
    throw error;
  } finally { clearTimeout(timeout); }
}

async function loadReviews() {
  if (!reviewList || reviewLoading) return;
  reviewLoading = true;
  reviewList.setAttribute('aria-busy', 'true');
  if (reviewLoadMore) reviewLoadMore.disabled = true;
  try {
    const data = await reviewApi({ cursor: reviewCursor });
    data.reviews.forEach(review => appendReview(review));
    reviewCursor = data.cursor;
    if (!displayedReviewIds.size) {
      reviewList.replaceChildren();
      const empty = reviewElement('div', 'review-empty');
      empty.append(reviewElement('strong', '', 'Tu experiencia cuenta'), reviewElement('p', '', 'Todavía no hay reseñas publicadas. Si ya trabajaste con nosotros, puedes compartir la primera.'));
      reviewList.append(empty);
      reviewListStatus.textContent = 'Reseñas de nuestros clientes';
    }
    reviewLoadMore.hidden = !reviewCursor;
    reviewLoadMore.textContent = 'Ver más reseñas';
  } catch (error) {
    reviewListStatus.textContent = error.message;
    reviewLoadMore.hidden = false;
    reviewLoadMore.textContent = 'Reintentar carga';
  } finally {
    reviewLoading = false;
    reviewList.setAttribute('aria-busy', 'false');
    if (reviewLoadMore) reviewLoadMore.disabled = false;
  }
}

reviewLoadMore?.addEventListener('click', loadReviews);
if (reviewList) loadReviews();

reviewForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;

  const button = reviewForm.querySelector('button[type="submit"]');
  if (button.disabled) return;
  reviewRequestId ||= crypto.randomUUID();
  button.disabled = true;
  button.textContent = 'Publicando…';
  reviewForm.setAttribute('aria-busy', 'true');
  reviewFormStatus.dataset.state = 'loading';
  reviewFormStatus.textContent = 'Guardando tu reseña…';
  try {
    const data = await reviewApi({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      requestId: reviewRequestId,
      rating: Number(reviewRating.value), name: reviewName.value.trim(), location: reviewLocation.value.trim(), message: reviewMessage.value.trim(),
      consent: document.querySelector('#review-consent').checked, website: document.querySelector('#review-website').value
    }) });
    appendReview(data.review, true);
    reviewList.scrollLeft = 0;
    reviewForm.reset();
    reviewRequestId = null;
    reviewFormStatus.dataset.state = 'success';
    reviewFormStatus.textContent = data.message;
  } catch (error) {
    reviewFormStatus.dataset.state = 'error';
    reviewFormStatus.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Publicar reseña';
    reviewForm.setAttribute('aria-busy', 'false');
  }
});
