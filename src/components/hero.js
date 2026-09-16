/** Hero: one still food shot, the headline and the two order actions. */
export function renderHero(root) {
  root.id = 'home';
  root.className = 'hero';
  root.innerHTML = `

    <div class="wrap hero__inner">
      <div class="hero__content">
        <p class="hero__eyebrow" data-enter style="--enter-delay:60ms">
          Fried fresh · Every order
        </p>

        <h1 id="hero-title" class="display" data-enter style="--enter-delay:130ms">
          Crispy.<br />Juicy.<br /><span class="accent">Zingos.</span>
        </h1>

        <p class="hero__lede" data-enter style="--enter-delay:210ms">
          Freshly fried chicken, loaded combos, burgers, wraps and more —
          ordered in a couple of taps.
        </p>

        <div class="hero__cta" data-enter style="--enter-delay:290ms">
          <a class="btn btn--light btn--lg" href="#menu" data-nav>Order Now</a>
          <a class="btn btn--ghost btn--lg" href="#menu" data-nav>View Menu</a>
        </div>
      </div>

      <div class="hero__art" data-enter style="--enter-delay:170ms" aria-hidden="true">
        <img class="hero__hero-img" src="/images/products/dipped-strips.webp"
             alt="" width="440" height="440" fetchpriority="high" decoding="async" />
      </div>
    </div>
  `;
}
