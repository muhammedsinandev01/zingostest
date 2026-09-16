import { CONFIG, isPlaceholder } from '../config.js';
import { escapeHtml } from '../utils/dom.js';
import { icons } from './icons.js';

const socialLink = (url, label, icon) => {
  if (isPlaceholder(url)) return '';
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${icon}</a>`;
};

export function renderFooter(root) {
  root.className = 'footer';

  const social =
    socialLink(CONFIG.instagramUrl, 'ZINGOS on Instagram', icons.instagram) +
    socialLink(CONFIG.facebookUrl, 'ZINGOS on Facebook', icons.facebook);

  root.innerHTML = `
    <div class="wrap">
      <div class="footer__grid">
        <div class="footer__brand">
          <img src="/images/logo/zingos-logo.png" alt="ZINGOS Fried Chicken" width="150" height="72" loading="lazy" />
          <p class="footer__tagline">Crispy. Bold. Zingos.</p>
          <p>Fried chicken, burgers, wraps, pizza, loaded fries and bubble tea — from one kitchen.</p>
        </div>

        <div class="footer__cols">
          <nav aria-label="Footer">
            <h3>Explore</h3>
            <ul>
              <li><a href="#home" data-nav>Home</a></li>
              <li><a href="#menu" data-nav>Menu</a></li>
              <li><a href="#about" data-nav>About</a></li>
              <li><a href="#location" data-nav>Contact</a></li>
            </ul>
          </nav>

          <div>
            <h3>Order</h3>
            <ul>
              <li><a href="#menu" data-nav>Start an order</a></li>
              <li><button type="button" data-open-cart>View cart</button></li>
              <li><a href="#location" data-nav>Pickup &amp; delivery</a></li>
            </ul>
          </div>

          <div>
            <h3>Follow</h3>
            ${
              social
                ? `<div class="footer__social">${social}</div>`
                : `<p style="font-size:.84rem">Add <code>instagramUrl</code> and <code>facebookUrl</code> in <code>src/config.js</code>.</p>`
            }
          </div>
        </div>
      </div>

      <div class="footer__bottom">
        <p>© ${new Date().getFullYear()} ZINGOS Fried Chicken. All rights reserved.</p>
        <p>Orders are confirmed by the restaurant on WhatsApp.</p>
      </div>
    </div>
  `;
}
