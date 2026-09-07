'use strict';
// Fixed allowlist: query parameters can select a plan, never a redirect origin.
const selectedKey = new URLSearchParams(window.location.search).get('plan');
const plans = {
  PRO: { name: 'Pro', description: 'Monthly plan · More credits and the connected career toolkit.' },
  PREMIUM: { name: 'Premium', description: 'Monthly plan · The Pro toolkit with a larger credit allowance.' },
};
const selected = Object.hasOwn(plans, selectedKey) ? plans[selectedKey] : null;
const checkout = document.querySelector('#continue-checkout');
if (selected) {
  document.querySelector('#selected-plan-name').textContent = `${selected.name} · Monthly`;
  document.querySelector('#selected-plan-description').textContent = selected.description;
  document.title = `Get started with ${selected.name} | Vignova`;
  const target = new URL('https://app.vignova.io/dashboard/checkout');
  target.searchParams.set('plan', selectedKey);
  target.searchParams.set('cycle', 'MONTHLY');
  checkout.href = target.toString();
  checkout.textContent = `Continue to ${selected.name} checkout →`;
} else {
  document.querySelector('#selected-plan-name').textContent = 'Choose your plan in the app';
  document.querySelector('#selected-plan-description').textContent = 'View the available plans and their current prices after signing in.';
}
