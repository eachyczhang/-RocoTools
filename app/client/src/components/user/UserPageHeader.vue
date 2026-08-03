<template>
  <header class="user-page-header">
    <div class="user-page-header__copy">
      <span v-if="eyebrow" class="user-page-header__eyebrow">{{ eyebrow }}</span>
      <h1 class="user-page-header__title">{{ title }}</h1>
      <p v-if="description" class="user-page-header__description">{{ description }}</p>
    </div>

    <div v-if="countLabel || $slots.actions" class="user-page-header__aside">
      <span v-if="countLabel" class="user-page-header__count">{{ countLabel }}</span>
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  countLabel: { type: String, default: '' },
})
</script>

<style scoped lang="scss">
.user-page-header {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem 1.05rem 1.2rem;
  margin-bottom: 1rem;
  overflow: hidden;
  border: 1px solid rgb(231 225 215 / 0.9);
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at 92% 18%, rgb(47 157 142 / 0.11), transparent 9rem),
    linear-gradient(135deg, rgb(255 254 251 / 0.96), rgb(255 249 232 / 0.78));
  box-shadow: 0 12px 34px rgb(68 40 20 / 0.055);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background-image: radial-gradient(circle, rgb(197 139 42 / 0.16) 1px, transparent 1px);
    background-size: 18px 18px;
    mask-image: linear-gradient(90deg, black, transparent 56%);
  }
}

.user-page-header__copy,
.user-page-header__aside {
  position: relative;
  z-index: 1;
}

.user-page-header__copy { min-width: 0; }

.user-page-header__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
  color: theme('colors.primary.600');
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;

  &::before {
    content: '';
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: linear-gradient(135deg, theme('colors.primary.300'), theme('colors.accent.400'));
    box-shadow: 0 0 0 0.25rem rgb(197 139 42 / 0.08);
  }
}

.user-page-header__title {
  font-family: theme('fontFamily.roco');
  color: theme('colors.primary.600');
  font-size: clamp(1.35rem, 2vw, 2rem);
  line-height: 1.2;
  letter-spacing: 0.025em;
}

.user-page-header__description {
  max-width: 46rem;
  margin-top: 0.35rem;
  color: theme('colors.gray.500');
  font-size: 0.82rem;
  line-height: 1.6;
}

.user-page-header__aside {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.user-page-header__count {
  display: inline-flex;
  align-items: center;
  min-height: 2.2rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgb(197 139 42 / 0.18);
  border-radius: 999px;
  color: theme('colors.primary.700');
  background: rgb(255 254 251 / 0.78);
  box-shadow: 0 5px 16px rgb(68 40 20 / 0.05);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

body.dark {
  .user-page-header {
    border-color: rgb(48 58 72 / 0.9);
    background:
      radial-gradient(circle at 92% 18%, rgb(47 157 142 / 0.13), transparent 10rem),
      linear-gradient(135deg, rgb(29 36 48 / 0.96), rgb(24 30 39 / 0.92));
    box-shadow: 0 16px 38px rgb(0 0 0 / 0.18);
  }

  .user-page-header__eyebrow,
  .user-page-header__title { color: theme('colors.primary.300'); }
  .user-page-header__description { color: theme('colors.gray.400'); }

  .user-page-header__count {
    border-color: rgb(220 170 62 / 0.2);
    color: theme('colors.primary.300');
    background: rgb(17 21 28 / 0.58);
  }
}

@media (max-width: 639px) {
  .user-page-header {
    align-items: flex-start;
    padding: 0.9rem 0.95rem;
    border-radius: 1.25rem;
  }

  .user-page-header__description {
    margin-top: 0.25rem;
    font-size: 0.76rem;
  }

  .user-page-header__count {
    min-height: 1.9rem;
    padding: 0.35rem 0.6rem;
    font-size: 0.7rem;
  }
}
</style>