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
