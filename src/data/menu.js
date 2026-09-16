/**
 * The official ZINGOS menu.
 *
 * Prices are taken straight from the printed ZINGOS menu card in
 * /brand-assets and are stored as whole rupees (integers) so every total in
 * the app is exact integer arithmetic.
 *
 * ---------------------------------------------------------------------------
 * HOW TO EDIT
 * ---------------------------------------------------------------------------
 * Change a price            -> edit `price`, or the value inside `prices`
 * Add / remove an item      -> add or delete an entry in MENU
 * Add a category            -> add to CATEGORIES, then use its id on items
 * Change a photo            -> drop a file in /public/images/products and
 *                              point `image` at it
 * Offer add-ons on an item  -> give it `addons: ['mayo', 'dips', ...]`
 *
 * ITEM SHAPES
 * -----------
 * Simple item:   { price: 129 }
 * With choices:  { optionGroups: [...], prices: { 'small': 249, ... } }
 *
 * For items with two choice groups (Bucket Chicken: size + flavour) the key
 * in `prices` is the selected option ids joined with "|", in the same order
 * the groups are declared: '6|original'.
 */

export const CATEGORIES = [
  { id: 'bucket-chicken', name: 'Bucket Chicken', blurb: 'The signature. Fried to order.' },
  { id: 'dipped-strips', name: 'Dipped Strips', blurb: 'Crunch-coated chicken strips.' },
  { id: 'combo-meals', name: 'Combo Meals', blurb: 'Chicken, sides and a drink.' },
  { id: 'pizza', name: 'Zingos Pizza', blurb: 'Hand-topped, loaded with mozzarella.' },
  { id: 'wrap', name: 'Wrap', blurb: 'Rolled, stuffed, ready to go.' },
  { id: 'club-sandwich', name: 'Club Sandwich', blurb: 'Stacked and toasted.' },
  { id: 'burger', name: 'Burger', blurb: 'Chicken burgers, built tall.' },
  { id: 'fries', name: 'Fries', blurb: 'Hot, salted, golden.' },
  { id: 'loaded-fries', name: 'Loaded Fries', blurb: 'Fries buried under the good stuff.' },
  { id: 'starters', name: 'Starters', blurb: 'Small bites to start.' },
  { id: 'mojitos', name: 'Mojitos', blurb: 'Iced, fizzy, zero alcohol.' },
  { id: 'bubble-tea', name: 'Bubble Tea', blurb: 'Brewed tea with chewy pearls.' },
  { id: 'addons', name: 'Add-ons', blurb: 'Dips, sides and extra pieces.' },
];

/** Add-on catalogue, exactly as printed on the menu card. */
export const ADDONS = {
  mayo: { id: 'mayo', name: 'Mayo', price: 19 },
  dips: { id: 'dips', name: 'Dips', price: 29 },
  kuboos: { id: 'kuboos', name: 'Kuboos', price: 10 },
  'extra-piece': { id: 'extra-piece', name: 'Extra Chicken Piece', price: 99 },
};

const CHICKEN_ADDONS = ['mayo', 'dips', 'kuboos', 'extra-piece'];

const FLAVOUR_GROUP = {
  id: 'flavour',
  label: 'Choose flavour',
  options: [
    { id: 'original', label: 'Zingos Original' },
    { id: 'peri', label: 'Zingos Peri Peri', tag: 'spicy' },
  ],
};

const IMG = '/images/products';

export const MENU = [
  /* ----------------------------------------------------------- BUCKET ---- */
  {
    id: 'bucket-chicken',
    categoryId: 'bucket-chicken',
    name: 'Bucket Chicken',
    description: 'Freshly fried bone-in chicken, shared straight from the bucket.',
    image: `${IMG}/bucket-chicken.webp`,
    featured: true,
    badge: 'Signature',
    optionGroups: [
      {
        id: 'size',
        label: 'Choose your bucket',
        options: [
          { id: '6', label: '6 pcs' },
          { id: '9', label: '9 pcs' },
          { id: '12', label: '12 pcs' },
        ],
      },
      FLAVOUR_GROUP,
    ],
    prices: {
      '6|original': 499,
      '6|peri': 549,
      '9|original': 699,
      '9|peri': 749,
      '12|original': 899,
      '12|peri': 949,
    },
    addons: CHICKEN_ADDONS,
  },

  /* ----------------------------------------------------- DIPPED STRIPS ---- */
  {
    id: 'dipped-strips',
    categoryId: 'dipped-strips',
    name: 'Dipped Strips',
    description: 'Chicken strips in a craggy, extra-crunchy coating.',
    image: `${IMG}/dipped-strips.webp`,
    featured: true,
    optionGroups: [
      {
        id: 'size',
        label: 'How many strips?',
        options: [
          { id: '4', label: '4 pcs' },
          { id: '8', label: '8 pcs' },
        ],
      },
    ],
    prices: { 4: 239, 8: 409 },
    addons: CHICKEN_ADDONS,
  },

  /* ------------------------------------------------------ COMBO MEALS ---- */
  {
    id: 'zingos-snack',
    categoryId: 'combo-meals',
    name: 'Zingos Snack',
    description: '2 pcs Chicken · 1 Kuboos · 1 Dip',
    image: `${IMG}/bucket-chicken.webp`,
    optionGroups: [FLAVOUR_GROUP],
    prices: { original: 239, peri: 249 },
  },
  {
    id: 'zingos-regular',
    categoryId: 'combo-meals',
    name: 'Zingos Regular',
    description: '4 pcs Chicken · 2 Kuboos · 1 Dip · Fries · 250ml Pepsi',
    image: `${IMG}/bucket-chicken.webp`,
    featured: true,
    optionGroups: [FLAVOUR_GROUP],
    prices: { original: 399, peri: 429 },
  },
  {
    id: 'zingos-meal',
    categoryId: 'combo-meals',
    name: 'Zingos Meal',
    description: '6 pcs Chicken · 3 Kuboos · 2 Dip · Fries · 750ml Pepsi',
    image: `${IMG}/bucket-chicken.webp`,
    featured: true,
    badge: 'Most loved',
    optionGroups: [FLAVOUR_GROUP],
    prices: { original: 569, peri: 619 },
  },
  {
    id: 'zingos-family',
    categoryId: 'combo-meals',
    name: 'Zingos Family',
    description: '9 pcs Chicken · 4 Kuboos · 3 Dip · Fries · 1.25 Ltr Pepsi',
    image: `${IMG}/bucket-chicken.webp`,
    optionGroups: [FLAVOUR_GROUP],
    prices: { original: 799, peri: 849 },
  },
  {
    id: 'zingos-party',
    categoryId: 'combo-meals',
    name: 'Zingos Party',
    description: '12 pcs Chicken · 5 Kuboos · 3 Dip · Fries · 2.25 Ltr Pepsi',
    image: `${IMG}/bucket-chicken.webp`,
    optionGroups: [FLAVOUR_GROUP],
    prices: { original: 999, peri: 1049 },
  },

  /* ------------------------------------------------------------ PIZZA ---- */
  {
    id: 'tandoori-chicken-pizza',
    categoryId: 'pizza',
    name: 'Tandoori Chicken Pizza',
    description: 'Smoky tandoori chicken, onion, capsicum & stretchy mozzarella with a bold tandoori kick.',
    image: `${IMG}/pizza.webp`,
    optionGroups: [
      {
        id: 'size',
        label: 'Choose size',
        options: [
          { id: 'small', label: 'Small' },
          { id: 'medium', label: 'Medium' },
          { id: 'large', label: 'Large' },
        ],
      },
    ],
    prices: { small: 249, medium: 329, large: 429 },
  },
  {
    id: 'cheese-burst-pizza',
    categoryId: 'pizza',
    name: 'Cheese Burst Pizza',
    description: 'Loaded with rich creamy cheese, mozzarella & a gooey cheese-filled base.',
    image: `${IMG}/pizza.webp`,
    featured: true,
    optionGroups: [
      {
        id: 'size',
        label: 'Choose size',
        options: [
          { id: 'small', label: 'Small' },
          { id: 'medium', label: 'Medium' },
          { id: 'large', label: 'Large' },
        ],
      },
    ],
    prices: { small: 279, medium: 359, large: 459 },
  },
  {
    id: 'bbq-chicken-pizza',
    categoryId: 'pizza',
    name: 'BBQ Chicken Pizza',
    description: 'Juicy BBQ chicken, onion, smoky BBQ sauce & mozzarella for that sweet-smoky flavour.',
    image: `${IMG}/pizza.webp`,
    optionGroups: [
      {
        id: 'size',
        label: 'Choose size',
        options: [
          { id: 'small', label: 'Small' },
          { id: 'medium', label: 'Medium' },
          { id: 'large', label: 'Large' },
        ],
      },
    ],
    prices: { small: 249, medium: 329, large: 429 },
  },
  {
    id: 'veg-supreme-pizza',
    categoryId: 'pizza',
    name: 'Veg Supreme Pizza',
    description: 'A colourful mix of onion, capsicum, sweet corn, olives & jalapeños with loads of cheese.',
    image: `${IMG}/pizza.webp`,
    tags: ['veg'],
    optionGroups: [
      {
        id: 'size',
        label: 'Choose size',
        options: [
          { id: 'small', label: 'Small' },
          { id: 'medium', label: 'Medium' },
          { id: 'large', label: 'Large' },
        ],
      },
    ],
    prices: { small: 229, medium: 299, large: 389 },
  },

  /* ------------------------------------------------------------- WRAP ---- */
  {
    id: 'spicy-zinger-wrap',
    categoryId: 'wrap',
    name: 'Spicy Zinger Wrap',
    description: 'Crispy chicken, crunchy salad and sauce rolled in a soft tortilla.',
    image: `${IMG}/wrap.webp`,
    tags: ['spicy'],
    featured: true,
    price: 199,
  },
  {
    id: 'king-wrap',
    categoryId: 'wrap',
    name: 'King Wrap',
    description: 'The bigger roll - extra filling, same crunch.',
    image: `${IMG}/wrap.webp`,
    price: 259,
  },

  /* --------------------------------------------------- CLUB SANDWICH ---- */
  {
    id: 'zinger-club',
    categoryId: 'club-sandwich',
    name: 'Zinger Club',
    description: 'Toasted club sandwich stacked with crispy chicken.',
    image: `${IMG}/burger.webp`,
    price: 129,
  },

  /* ----------------------------------------------------------- BURGER ---- */
  {
    id: 'zinger-burger',
    categoryId: 'burger',
    name: 'Zinger Burger',
    description: 'Crispy chicken fillet in a soft sesame bun.',
    image: `${IMG}/burger.webp`,
    featured: true,
    price: 129,
  },
  {
    id: 'chicken-smash-burger',
    categoryId: 'burger',
    name: 'Chicken Smash Burger',
    description: 'Smashed chicken patty, griddled to the edges.',
    image: `${IMG}/burger.webp`,
    price: 149,
  },
  {
    id: 'sizzling-burger',
    categoryId: 'burger',
    name: 'Sizzling Burger',
    description: 'Our loaded burger, built for a bigger appetite.',
    image: `${IMG}/burger.webp`,
    price: 199,
  },
  {
    id: 'mini-bites',
    categoryId: 'burger',
    name: 'Mini Bites',
    description: '4 pcs · Mini burgers, made for sharing.',
    image: `${IMG}/burger.webp`,
    price: 259,
  },

  /* ------------------------------------------------------------ FRIES ---- */
  {
    id: 'classic-fries',
    categoryId: 'fries',
    name: 'Classic Fries',
    description: 'Golden fries, lightly salted.',
    image: null,
    tags: ['veg'],
    price: 69,
  },
  {
    id: 'cheese-fries',
    categoryId: 'fries',
    name: 'Cheese Fries',
    description: 'Fries under a warm cheese sauce.',
    image: null,
    tags: ['veg'],
    price: 79,
  },
  {
    id: 'peri-peri-fries',
    categoryId: 'fries',
    name: 'Peri Peri Fries',
    description: 'Fries tossed in peri peri seasoning.',
    image: null,
    tags: ['veg', 'spicy'],
    price: 79,
  },

  /* ----------------------------------------------------- LOADED FRIES ---- */
  {
    id: 'spicy-loaded',
    categoryId: 'loaded-fries',
    name: 'Spicy Loaded',
    description: 'Fries loaded with spiced chicken and sauce.',
    image: `${IMG}/loaded-fries.webp`,
    tags: ['spicy'],
    featured: true,
    price: 179,
  },
  {
    id: 'cheesy-loaded',
    categoryId: 'loaded-fries',
    name: 'Cheesy Loaded',
    description: 'Fries loaded with chicken and extra cheese.',
    image: `${IMG}/loaded-fries.webp`,
    price: 199,
  },

  /* --------------------------------------------------------- STARTERS ---- */
  {
    id: 'nuggets',
    categoryId: 'starters',
    name: 'Nuggets',
    description: 'Classic chicken nuggets, crisp on the outside.',
    image: `${IMG}/chicken-pops.webp`,
    optionGroups: [
      {
        id: 'size',
        label: 'Choose portion',
        options: [
          { id: '6', label: '6 pcs' },
          { id: '10', label: '10 pcs' },
        ],
      },
    ],
    prices: { 6: 110, 10: 159 },
  },
  {
    id: 'chicken-pops',
    categoryId: 'starters',
    name: 'Chicken Pops',
    description: 'Bite-size popcorn chicken - one is never enough.',
    image: `${IMG}/chicken-pops.webp`,
    featured: true,
    price: 129,
  },
  {
    id: 'fried-shrimps',
    categoryId: 'starters',
    name: 'Fried Shrimps',
    description: '6 pcs · Crisp-fried shrimps.',
    image: `${IMG}/chicken-pops.webp`,
    price: 249,
  },

  /* ---------------------------------------------------------- MOJITOS ---- */
  {
    id: 'blue-mint-mojito',
    categoryId: 'mojitos',
    name: 'Blue Mint',
    description: 'Iced mint mojito with a blue twist.',
    image: `${IMG}/mojito.webp`,
    tags: ['veg'],
    price: 99,
  },
  {
    id: 'strawberry-mojito',
    categoryId: 'mojitos',
    name: 'Strawberry',
    description: 'Strawberry and mint over crushed ice.',
    image: `${IMG}/mojito.webp`,
    tags: ['veg'],
    price: 99,
  },
  {
    id: 'green-apple-mojito',
    categoryId: 'mojitos',
    name: 'Green Apple',
    description: 'Green apple, lime and mint.',
    image: `${IMG}/mojito.webp`,
    tags: ['veg'],
    price: 99,
  },
  {
    id: 'watermelon-mojito',
    categoryId: 'mojitos',
    name: 'Watermelon',
    description: 'Cool watermelon cooler with mint.',
    image: `${IMG}/mojito.webp`,
    tags: ['veg'],
    price: 99,
  },
  {
    id: 'virgin-mojito',
    categoryId: 'mojitos',
    name: 'Virgin',
    description: 'The classic lime and mint mojito.',
    image: `${IMG}/mojito.webp`,
    tags: ['veg'],
    price: 99,
  },

  /* ------------------------------------------------------- BUBBLE TEA ---- */
  {
    id: 'taro-velvet',
    categoryId: 'bubble-tea',
    name: 'Taro Velvet',
    description: 'Creamy taro milk tea with chewy pearls.',
    image: `${IMG}/bubble-tea.webp`,
    tags: ['veg'],
    price: 149,
  },
  {
    id: 'matcha-mist',
    categoryId: 'bubble-tea',
    name: 'Matcha Mist',
    description: 'Green matcha milk tea with pearls.',
    image: `${IMG}/bubble-tea.webp`,
    tags: ['veg'],
    price: 149,
  },
  {
    id: 'mango-saga-bliss',
    categoryId: 'bubble-tea',
    name: 'Mango Saga Bliss',
    description: 'Mango bubble tea, sweet and chilled.',
    image: `${IMG}/bubble-tea.webp`,
    tags: ['veg'],
    price: 149,
  },
  {
    id: 'coffee-rush',
    categoryId: 'bubble-tea',
    name: 'Coffee Rush',
    description: 'Iced coffee bubble tea with pearls.',
    image: `${IMG}/bubble-tea.webp`,
    tags: ['veg'],
    price: 149,
  },

  /* ---------------------------------------------------------- ADD-ONS ---- */
  {
    id: 'addon-mayo',
    categoryId: 'addons',
    name: 'Mayo',
    description: 'Extra pot of mayo.',
    image: null,
    tags: ['veg'],
    price: 19,
  },
  {
    id: 'addon-dips',
    categoryId: 'addons',
    name: 'Dips',
    description: 'Extra dip for your chicken.',
    image: null,
    tags: ['veg'],
    price: 29,
  },
  {
    id: 'addon-kuboos',
    categoryId: 'addons',
    name: 'Kuboos',
    description: 'Soft kuboos bread.',
    image: null,
    tags: ['veg'],
    price: 10,
  },
  {
    id: 'addon-extra-piece',
    categoryId: 'addons',
    name: 'Extra Chicken Piece',
    description: 'One more piece of fried chicken.',
    image: `${IMG}/bucket-chicken.webp`,
    price: 99,
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Builds the `prices` lookup key for a selection, e.g. '6|original'. */
export const priceKey = (product, selection) =>
  (product.optionGroups || []).map((group) => selection[group.id]).join('|');

/** Price of a product for the given option selection, in whole rupees. */
export function getPrice(product, selection = {}) {
  if (!product.optionGroups?.length) return product.price ?? 0;
  return product.prices[priceKey(product, selection)] ?? 0;
}

/** Cheapest price a product can be ordered at - used for "From ₹499". */
export function startingPrice(product) {
  if (!product.optionGroups?.length) return product.price ?? 0;
  return Math.min(...Object.values(product.prices));
}

/** True when the customer must pick something before adding to the cart. */
export const hasChoices = (product) =>
  Boolean(product.optionGroups?.length) || Boolean(product.addons?.length);

/** First option of every group - the default selection in the product modal. */
export const defaultSelection = (product) =>
  Object.fromEntries((product.optionGroups || []).map((group) => [group.id, group.options[0].id]));

/** Human label for a selection, e.g. '6 pcs · Zingos Original'. */
export function selectionLabel(product, selection = {}) {
  return (product.optionGroups || [])
    .map((group) => group.options.find((option) => option.id === selection[group.id])?.label)
    .filter(Boolean)
    .join(' · ');
}

export const getProduct = (id) => MENU.find((product) => product.id === id);

export const productsByCategory = (categoryId) =>
  MENU.filter((product) => product.categoryId === categoryId);

export const featuredProducts = () => MENU.filter((product) => product.featured);

