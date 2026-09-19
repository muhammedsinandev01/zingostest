import { icons } from './icons.js';

const POINTS = [
  {
    icon: icons.flame,
    title: 'Fried to order',
    text: 'Chicken goes in the fryer when the order comes in, so it reaches you hot.',
  },
  {
    icon: icons.sparkle,
    title: 'That crunch',
    text: 'A craggy, well-seasoned coating built to stay crisp all the way home.',
  },
  {
    icon: icons.star,
    title: 'Original or Peri Peri',
    text: 'Two signature flavours across buckets, strips and every combo meal.',
  },
  {
    icon: icons.bag,
    title: 'Made for sharing',
    text: 'Buckets, family combos and party sizes with kuboos, dips and fries.',
  },
];

export function renderAbout(root) {
  root.id = 'about';
  root.className = 'section about';
  root.innerHTML = `
    <div class="wrap about__grid">
      <div data-reveal>
        <span class="section-kicker">Our kitchen</span>
        <h2 class="section-title">The Zingos way</h2>
        <p class="about__lede">
          One kitchen, one menu, and a fryer that does not stop. Everything on the
          ZINGOS menu is built around the same thing — properly seasoned chicken with
          a crunch worth ordering again.
        </p>

        <div class="about__points">
          ${POINTS.map(
            (point, index) => `
            <article class="about__point" data-reveal style="--reveal-delay:${120 + index * 80}ms">
              ${point.icon}
              <h3>${point.title}</h3>
              <p>${point.text}</p>
            </article>`,
          ).join('')}
        </div>
      </div>

      <div class="about__art" data-reveal style="--reveal-delay:160ms" aria-hidden="true">
        <img src="/images/products/chicken-pops.webp" alt="" width="480" height="420" loading="lazy" decoding="async" />
      </div>
    </div>
  `;
}

export function renderOrderCta(root) {
  root.className = 'section order-cta';
  root.innerHTML = `
    <div class="wrap order-cta__inner" data-reveal>
      <span class="section-kicker">Ready when you are</span>
      <h2>Hungry? <em>Let's go.</em></h2>
      <p>
        Build your order here, then send it straight to the ZINGOS kitchen on WhatsApp.
        Pickup or delivery — you choose at checkout.
      </p>
      <div class="order-cta__actions">
        <a class="btn btn--lg" href="#menu" data-nav>Start my order ${icons.arrowRight}</a>
        <a class="btn btn--ghost btn--lg" href="#location">Find us</a>
      </div>

      <figure class="order-cta__shot">
        <picture>
          <source srcset="/images/products/ready.webp" type="image/webp" />
          <img src="/images/products/ready.jpeg"
               alt="Chicken seasoned by hand, dredged in the ZINGOS coating, then fried to order."
               width="1440" height="804" loading="lazy" decoding="async" />
        </picture>
      </figure>
    </div>
  `;
}
