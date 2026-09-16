import { featuredProducts, startingPrice } from '../data/menu.js';
import { photoHtml, tagHtml } from './menu.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { escapeHtml } from '../utils/dom.js';
import { icons } from './icons.js';

/** Card used in the Fan Favourites rail. */
function favCard(product) {
  const choosable = Boolean(product.optionGroups?.length);
  const tags = (product.tags || []).map(tagHtml).join('');

  return `
    <article class="fav-card" data-product="${product.id}">
      <button class="fav-card__link" type="button" data-open-product="${product.id}">
        <span class="visually-hidden">${escapeHtml(product.name)} — view options</span>
      </button>
      ${product.badge ? `<span class="tag tag--badge fav-card__badge">${escapeHtml(product.badge)}</span>` : ''}
      ${photoHtml(product, { className: 'fav-card__photo', width: 320 })}
      <div class="fav-card__body">
        ${tags ? `<div class="item__tags">${tags}</div>` : ''}
        <h3 class="fav-card__name">${escapeHtml(product.name)}</h3>
        <p class="fav-card__desc">${escapeHtml(product.description)}</p>
        <div class="fav-card__foot">
          <p class="item__price">
            ${choosable ? '<span class="from">From</span>' : ''}
            <span class="price">${formatCurrency(startingPrice(product))}</span>
          </p>
          <button class="fav-card__add" type="button" data-add="${product.id}"
                  aria-label="Add ${escapeHtml(product.name)} to cart">+</button>
        </div>
      </div>
    </article>`;
}

export function renderFeatured(root) {
  root.id = 'favourites';
  root.className = 'section featured';
  root.innerHTML = `
    <div class="wrap">
      <header class="section-head featured__head" data-reveal>
        <div>
          <span class="section-kicker">Fan favourites</span>
          <h2 class="section-title">The ones that sell out</h2>
        </div>
        <a class="btn btn--outline btn--sm" href="#menu" data-nav>Full menu ${icons.arrowRight}</a>
      </header>

      <div class="rail featured-rail" data-reveal>
        ${featuredProducts().map(favCard).join('')}
      </div>
    </div>
  `;
}
