import {
  CATEGORIES,
  MENU,
  productsByCategory,
  startingPrice,
  hasChoices,
} from '../data/menu.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { escapeHtml, qs, qsa, on, scrollToSection } from '../utils/dom.js';
import { subscribe } from '../utils/cart.js';

const MARK = '/images/logo/zingos-mark.png';

export const tagHtml = (tag) =>
  ({
    spicy: '<span class="tag tag--spicy">🌶 Spicy</span>',
    veg: '<span class="tag tag--veg">● Veg</span>',
  })[tag] ?? '';

/**
 * Product photo, or a branded contour tile for the few items that do not have
 * a photograph in the official ZINGOS artwork yet.
 */
export function photoHtml(product, { className, width = 240 }) {
  if (!product.image) {
    return `<div class="${className} ${className}--placeholder">
      <img src="${MARK}" alt="" width="60" height="92" loading="lazy" decoding="async" />
    </div>`;
  }
  return `<div class="${className}">
    <img src="${product.image}" alt="${escapeHtml(product.name)}" width="${width}" height="${width}"
         loading="lazy" decoding="async" />
  </div>`;
}

/** One menu row: details on the left, photo and ADD on the right. */
export function itemRow(product) {
  const from = startingPrice(product);
  const choosable = Boolean(product.optionGroups?.length);
  const tags = (product.tags || []).map(tagHtml).join('');

  return `
    <article class="item item--has-add" data-product="${product.id}">
      <button class="item__link" type="button" data-open-product="${product.id}">
        <span class="visually-hidden">${escapeHtml(product.name)} — view options</span>
      </button>

      <div class="item__info">
        ${tags ? `<div class="item__tags">${tags}</div>` : ''}
        <h4 class="item__name">${escapeHtml(product.name)}</h4>
        <p class="item__desc">${escapeHtml(product.description)}</p>
        <p class="item__price">
          ${choosable ? '<span class="from">From</span>' : ''}
          <span class="price">${formatCurrency(from)}</span>
        </p>
      </div>

      <div class="item__media">
        ${product.badge ? `<span class="tag tag--badge item__badge">${escapeHtml(product.badge)}</span>` : ''}
        ${photoHtml(product, { className: 'item__photo', width: 200 })}
        <button class="item__add" type="button" data-add="${product.id}"
                aria-label="${hasChoices(product) ? `Choose options for ${escapeHtml(product.name)}` : `Add ${escapeHtml(product.name)} to cart`}">
          <span data-add-label>Add</span>
        </button>
      </div>
    </article>
  `;
}

function groupHtml(category) {
  const products = productsByCategory(category.id);
  if (!products.length) return '';
  return `
    <section class="menu-group" id="cat-${category.id}" data-group="${category.id}" aria-labelledby="group-${category.id}">
      <header class="menu-group__head">
        <h3 id="group-${category.id}">${escapeHtml(category.name)}</h3>
        <span class="menu-group__count">${products.length} item${products.length === 1 ? '' : 's'}</span>
        <p>${escapeHtml(category.blurb)}</p>
      </header>
      <div class="menu-list">${products.map(itemRow).join('')}</div>
    </section>
  `;
}

/* -------------------------------------------------------------------------- */
/* Category rail (the circles under the hero)                                  */
/* -------------------------------------------------------------------------- */

/** Representative photo for a category - the first item that has one. */
const categoryImage = (categoryId) =>
  productsByCategory(categoryId).find((product) => product.image)?.image ?? null;

export function renderCategories(root) {
  root.className = 'categories';
  root.innerHTML = `
    <div class="wrap">
      <div class="rail" role="list" aria-label="Browse by category">
        ${CATEGORIES.map((category) => {
          const image = categoryImage(category.id);
          return `
          <button class="category-circle" type="button" role="listitem" data-jump="${category.id}">
            <span class="category-circle__art${image ? '' : ' category-circle__art--placeholder'}">
              <img src="${image ?? MARK}" alt="" width="160" height="160" loading="lazy" decoding="async" />
            </span>
            <span>${escapeHtml(category.name)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;

  on(root, 'click', '[data-jump]', (event, button) => {
    const categoryId = button.dataset.jump;
    const chip = qs(`.chip[data-category="${categoryId}"]`);
    chip?.click();
    scrollToSection('#menu');
  });
}

/* -------------------------------------------------------------------------- */
/* Menu section                                                                */
/* -------------------------------------------------------------------------- */

export function renderMenu(root) {
  root.id = 'menu';
  root.className = 'section menu-section';
  root.innerHTML = `
    <div class="wrap">
      <header class="section-head">
        <span class="section-kicker">The full menu</span>
        <h2 class="section-title">Pick your crunch</h2>
        <p class="section-lede">
          ${MENU.length} items across ${CATEGORIES.length} categories. Tap an item to choose
          size, flavour and extras.
        </p>
      </header>

      <div class="category-bar">
        <div class="category-bar__scroll" role="tablist" aria-label="Menu categories">
          <button class="chip" type="button" role="tab" data-category="all" aria-pressed="true">All</button>
          ${CATEGORIES.map(
            (category) =>
              `<button class="chip" type="button" role="tab" data-category="${category.id}" aria-pressed="false">${escapeHtml(category.name)}</button>`,
          ).join('')}
        </div>
      </div>

      <div data-menu-groups>${CATEGORIES.map(groupHtml).join('')}</div>
      <p class="menu-empty" data-menu-empty hidden>Nothing in this category yet.</p>
    </div>
  `;

  /* Category filtering ---------------------------------------------------- */
  const chips = qsa('[data-category]', root);
  const groups = qsa('[data-group]', root);
  const empty = qs('[data-menu-empty]', root);

  on(root, 'click', '[data-category]', (event, chip) => {
    const categoryId = chip.dataset.category;
    chips.forEach((entry) => entry.setAttribute('aria-pressed', String(entry === chip)));

    let visible = 0;
    groups.forEach((group) => {
      const show = categoryId === 'all' || group.dataset.group === categoryId;
      group.hidden = !show;
      if (show) visible += 1;
    });
    empty.hidden = visible > 0;

    chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });

    // Only pull the page up if the list has scrolled past the chips.
    const bar = qs('.category-bar', root);
    const top = bar.getBoundingClientRect().top + window.scrollY - (qs('.navbar')?.offsetHeight ?? 64) - 4;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  });

  /* Reflect what is already in the cart on every Add button --------------- */
  subscribe(({ items }) => {
    const counts = new Map();
    for (const item of items) counts.set(item.productId, (counts.get(item.productId) ?? 0) + item.quantity);
    qsa('[data-add]', document).forEach((button) => {
      const count = counts.get(button.dataset.add) ?? 0;
      const label = qs('[data-add-label]', button);
      button.classList.toggle('item__add--in-cart', count > 0);
      if (label) label.innerHTML = count ? `Add <span class="qty">${count}</span>` : 'Add';
    });
  });
}

/** Menu structured data, so search engines can read the real menu. */
export function menuJsonLd() {
  return {
    '@type': 'Menu',
    name: 'ZINGOS Menu',
    hasMenuSection: CATEGORIES.map((category) => ({
      '@type': 'MenuSection',
      name: category.name,
      hasMenuItem: productsByCategory(category.id).map((product) => ({
        '@type': 'MenuItem',
        name: product.name,
        description: product.description,
        offers: { '@type': 'Offer', price: startingPrice(product), priceCurrency: 'INR' },
      })),
    })),
  };
}
