<script setup lang="ts">
/**
 * SkipLink — visually hidden until focused, jumps to `#main`.
 *
 * WCAG 2.4.1 (Bypass Blocks, Level A) requires a mechanism to bypass repeated
 * navigation. The Docus default layout already provides `<main id="main">`;
 * this component renders the first focusable element on the page so keyboard
 * users can skip past the header/nav directly to content.
 */
</script>

<template>
  <a
    href="#main"
    class="skip-link"
  >
    Skip to main content
  </a>
</template>

<style scoped>
.skip-link {
  position: absolute;
  top: -40px;
  left: 1rem;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: var(--ui-primary, #3B82F6);
  color: white;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0.375rem;
  transition: top 0.15s ease-in-out;
}

.skip-link:focus,
.skip-link:focus-visible {
  top: 0.5rem;
  outline: 2px solid white;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .skip-link {
    transition: none;
  }
}
</style>
