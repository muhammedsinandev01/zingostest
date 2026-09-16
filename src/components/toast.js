/** Lightweight toast stack - used for add-to-cart feedback. */

let stack;

function ensureStack() {
  if (stack) return stack;
  stack = document.createElement('div');
  stack.className = 'toast-stack';
  stack.setAttribute('role', 'status');
  stack.setAttribute('aria-live', 'polite');
  document.body.append(stack);
  return stack;
}

export function toast(message, { image = null, duration = 2400 } = {}) {
  const host = ensureStack();
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `${image ? `<img src="${image}" alt="" />` : ''}<span></span>`;
  node.querySelector('span').textContent = message;
  host.append(node);

  setTimeout(() => {
    node.classList.add('toast--out');
    node.addEventListener('animationend', () => node.remove(), { once: true });
  }, duration);
}
