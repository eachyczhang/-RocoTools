<template>
  <div
    class="pet-card-shell"
    :class="{ 'pet-card-shell--dual': hasSecondaryElement }"
    :style="cardStyle"
  >
    <router-link
      :to="`/pets/${pet.uid}`"
      class="pet-card group"
    >
    <div class="pet-card__ambient" aria-hidden="true"></div>
    <div class="pet-card__grid" aria-hidden="true"></div>

    <div class="pet-card__header">
      <span class="pet-card__serial">No.{{ serialNumber }}</span>
    </div>

    <div class="pet-card__artwork">
      <span class="pet-card__watermark" aria-hidden="true">{{ serialNumber }}</span>
      <div class="pet-card__halo" aria-hidden="true"></div>
      <img
        v-lazy-src="cardImageUrl"
        :alt="pet.name"
        class="pet-card__image"
        :class="{ 'group-hover:opacity-0 group-focus-visible:opacity-0': shinyUrl }"
      />
      <img
        v-if="shinyUrl"
        v-lazy-src="shinyUrl"
        :alt="`${pet.name}(异色)`"
        class="pet-card__image pet-card__image--shiny"
      />
    </div>

    <div class="pet-card__content">
      <div class="pet-card__identity">
        <div class="pet-card__name" :title="pet.name">{{ pet.name }}</div>
        <div class="pet-card__elements">
          <span v-if="pet.element_icon" class="pet-card__element" :title="pet.element_name">
            <img :src="pet.element_icon" :alt="pet.element_name" />
          </span>
          <span v-if="pet.sub_element_icon" class="pet-card__element" :title="pet.sub_element_name">
            <img :src="pet.sub_element_icon" :alt="pet.sub_element_name" />
          </span>
        </div>
      </div>

      <div class="pet-card__score">
        <span class="pet-card__score-label">种族值</span>
        <span class="pet-card__score-value">{{ pet.total ?? '—' }}</span>
      </div>
    </div>
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pet: { type: Object, required: true },
  shinyUrl: { type: String, default: null },
})

const ELEMENT_ACCENTS = {
  普通: '63 137 180',
  草: '78 188 115',
  火: '219 85 37',
  水: '106 169 254',
  光: '79 192 255',
  地: '154 126 63',
  冰: '95 173 221',
  龙: '237 73 98',
  电: '231 197 6',
  毒: '186 98 224',
  虫: '158 206 33',
  武: '255 150 54',
  翼: '62 199 202',
  萌: '252 124 172',
  幽: '148 70 236',
  恶: '207 70 122',
  机械: '64 203 169',
  幻: '159 167 248',
}

function hexToRgb(value) {
  const hex = String(value || '').trim().replace(/^#/, '')
  if (!/^[\da-f]{6}$/i.test(hex)) return null
  return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(' ')
}

const serialNumber = computed(() => String(props.pet.pet_id ?? '').padStart(3, '0'))
const hasSecondaryElement = computed(() => Boolean(
  props.pet.sub_element_name || props.pet.sub_element_color || props.pet.sub_element_icon
))

const cardImageUrl = computed(() => {
  const imageUrl = String(props.pet.image_url || '')
  const isLegacyThumbnail = /\/public\/pets\/(?:thumbs|thumbnails)\//.test(imageUrl)
  if (isLegacyThumbnail) {
    const legacyStem = imageUrl.split('/').pop()?.replace(/\.(?:png|webp|jpe?g)$/i, '').replace(/_default$/, '')
    if (legacyStem) return `/public/pets/default/${legacyStem}_default.webp`
  }
  if (!imageUrl) {
    return `/public/pets/default/${props.pet.uid}_default.webp`
  }
  return imageUrl
})

const cardStyle = computed(() => {
  const name = String(props.pet.element_name || '')
  const databaseColor = hexToRgb(props.pet.element_color)
  const exact = ELEMENT_ACCENTS[name]
  const partialKey = Object.keys(ELEMENT_ACCENTS).find(key => name.includes(key))
  const accent = databaseColor || exact || ELEMENT_ACCENTS[partialKey] || '197 139 42'

  const secondaryName = String(props.pet.sub_element_name || '')
  const secondaryDatabaseColor = hexToRgb(props.pet.sub_element_color)
  const secondaryExact = ELEMENT_ACCENTS[secondaryName]
  const secondaryPartialKey = Object.keys(ELEMENT_ACCENTS).find(key => secondaryName.includes(key))
  const secondaryAccent = secondaryDatabaseColor || secondaryExact || ELEMENT_ACCENTS[secondaryPartialKey] || accent

  return {
    '--pet-accent-rgb': accent,
    '--pet-secondary-rgb': secondaryAccent,
  }
})
</script>

<style scoped>
.pet-card-shell {
  position: relative;
  isolation: isolate;
  min-width: 0;
  height: 100%;
}

.pet-card-shell::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  border-radius: 1.25rem;
  background: linear-gradient(
    145deg,
    rgb(var(--pet-accent-rgb) / 0.28) 18%,
    rgb(var(--pet-accent-rgb) / 0.32) 46%,
    rgb(var(--pet-secondary-rgb) / 0.42) 86%
  );
  content: '';
  pointer-events: none;
  transform: translate(0.28rem, 0.34rem);
  transition: filter 220ms ease, transform 220ms ease;
}

.pet-card-shell:hover::before,
.pet-card-shell:focus-within::before {
  filter: saturate(1.08);
  transform: translate(0.32rem, 0.38rem);
}

.pet-card {
  position: relative;
  z-index: 1;
  isolation: isolate;
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgb(231 225 215 / 0.92);
  border-radius: 1.25rem;
  background: linear-gradient(155deg, rgb(255 255 255 / 0.98), rgb(255 254 251 / 0.92));
  padding: 0.75rem;
  color: inherit;
  box-shadow:
    0 1px 2px rgb(68 40 20 / 0.04),
    0 10px 24px rgb(68 40 20 / 0.07),
    0 28px 58px -34px rgb(var(--pet-accent-rgb) / 0.42);
  transform: translateZ(0);
  transition: border-color 180ms ease, box-shadow 220ms ease, transform 220ms ease;
}

.pet-card:hover,
.pet-card:focus-visible {
  border-color: rgb(var(--pet-accent-rgb) / 0.45);
  box-shadow:
    0 3px 8px rgb(68 40 20 / 0.07),
    0 18px 42px rgb(68 40 20 / 0.12),
    0 34px 70px -34px rgb(var(--pet-accent-rgb) / 0.58);
  transform: translateY(-2px);
}

.pet-card:focus-visible {
  outline: 3px solid rgb(var(--pet-accent-rgb) / 0.2);
  outline-offset: 3px;
}

.pet-card__ambient {
  position: absolute;
  z-index: -2;
  top: -5rem;
  right: -4rem;
  width: 12rem;
  height: 12rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgb(var(--pet-accent-rgb) / 0.18), transparent 68%);
  transition: opacity 220ms ease, transform 300ms ease;
}

.pet-card:hover .pet-card__ambient {
  opacity: 0.9;
  transform: scale(1.12);
}

.pet-card__grid {
  position: absolute;
  z-index: -1;
  inset: 0;
  opacity: 0.18;
  background-image: radial-gradient(rgb(var(--pet-accent-rgb) / 0.38) 0.65px, transparent 0.65px);
  background-size: 12px 12px;
  mask-image: linear-gradient(to bottom, black, transparent 62%);
}

.pet-card__header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  min-height: 1.75rem;
}

.pet-card__serial {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgb(var(--pet-accent-rgb) / 0.2);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.68);
  color: rgb(var(--pet-accent-rgb));
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.06em;
  padding: 0.38rem 0.52rem;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.85);
}

.pet-card__artwork {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1.12 / 1;
  margin: 0.15rem 0 0.4rem;
  overflow: hidden;
  border: 1px solid rgb(var(--pet-accent-rgb) / 0.1);
  border-radius: 1rem;
  background:
    radial-gradient(circle at 50% 56%, rgb(var(--pet-accent-rgb) / 0.14), transparent 45%),
    linear-gradient(145deg, rgb(255 255 255 / 0.66), rgb(var(--pet-accent-rgb) / 0.045));
}

.pet-card__watermark {
  position: absolute;
  z-index: 0;
  top: -0.35rem;
  right: 0.35rem;
  color: rgb(var(--pet-accent-rgb) / 0.075);
  font-size: clamp(2.7rem, 6vw, 4.8rem);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.08em;
  user-select: none;
}

.pet-card__halo {
  position: absolute;
  width: 66%;
  aspect-ratio: 1;
  border: 1px solid rgb(var(--pet-accent-rgb) / 0.15);
  border-radius: 999px;
  box-shadow: 0 0 0 12px rgb(var(--pet-accent-rgb) / 0.035);
  transition: transform 300ms ease;
}

.pet-card:hover .pet-card__halo {
  transform: scale(1.08) rotate(8deg);
}

.pet-card__image {
  position: relative;
  z-index: 1;
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 14px 12px rgb(24 30 39 / 0.18));
  transition: opacity 240ms ease, transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 300ms ease;
}

.pet-card:hover .pet-card__image,
.pet-card:focus-visible .pet-card__image {
  transform: scale(1.08) translateY(-2px);
  filter: drop-shadow(0 18px 16px rgb(24 30 39 / 0.24));
}

.pet-card__image--shiny {
  position: absolute;
  inset: 11%;
  width: 78%;
  height: 78%;
  opacity: 0;
  transform: scale(0.96);
}

.pet-card:hover .pet-card__image--shiny,
.pet-card:focus-visible .pet-card__image--shiny {
  opacity: 1;
  transform: scale(1.08) translateY(-2px);
}

.pet-card__content {
  display: grid;
  gap: 0.65rem;
  padding: 0.1rem 0.15rem 0.05rem;
}

.pet-card__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

.pet-card__name {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding-left: 0.48rem;
  color: #202938;
  font-family: 'MIANFEIZITI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.25rem;
  letter-spacing: 0.025em;
  text-overflow: ellipsis;
  transition: color 180ms ease;
  white-space: nowrap;
}

.pet-card:hover .pet-card__name,
.pet-card:focus-visible .pet-card__name {
  color: rgb(var(--pet-accent-rgb));
}

.pet-card__name::before {
  position: absolute;
  top: 0.16rem;
  bottom: 0.16rem;
  left: 0;
  width: 0.16rem;
  border-radius: 999px;
  background: rgb(var(--pet-accent-rgb));
  content: '';
}

.pet-card__elements {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.2rem;
}

.pet-card__element {
  display: grid;
  width: 1.55rem;
  height: 1.55rem;
  place-items: center;
  border: 1px solid rgb(var(--pet-accent-rgb) / 0.14);
  border-radius: 0.65rem;
  background: rgb(var(--pet-accent-rgb) / 0.08);
}

.pet-card__element img {
  width: 1.15rem;
  height: 1.15rem;
  object-fit: contain;
}

.pet-card__score {
  display: flex;
  align-items: end;
  justify-content: space-between;
  border-top: 1px solid rgb(231 225 215 / 0.72);
  padding-top: 0.55rem;
}

.pet-card__score-label {
  color: #5f6875;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.pet-card__score-value {
  position: relative;
  padding-bottom: 0.12rem;
  color: rgb(var(--pet-accent-rgb));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: 0.01em;
}

.pet-card__score-value::after {
  position: absolute;
  right: 0;
  bottom: -0.08rem;
  left: 0;
  height: 0.12rem;
  border-radius: 999px;
  background: rgb(var(--pet-accent-rgb));
  content: '';
}

.pet-card-shell--dual .pet-card {
  border-color: rgb(var(--pet-accent-rgb) / 0.24);
  background:
    radial-gradient(circle at 4% 0%, rgb(var(--pet-accent-rgb) / 0.07), transparent 42%),
    radial-gradient(circle at 96% 0%, rgb(var(--pet-secondary-rgb) / 0.08), transparent 44%),
    linear-gradient(155deg, rgb(255 255 255 / 0.98), rgb(255 254 251 / 0.92));
}

.pet-card-shell--dual .pet-card__artwork {
  background:
    radial-gradient(circle at 34% 56%, rgb(var(--pet-accent-rgb) / 0.14), transparent 48%),
    radial-gradient(circle at 72% 48%, rgb(var(--pet-secondary-rgb) / 0.13), transparent 48%),
    linear-gradient(145deg, rgb(255 255 255 / 0.66), rgb(255 255 255 / 0.18));
}

body.dark .pet-card {
  border-color: rgb(48 58 72 / 0.95);
  background: linear-gradient(155deg, rgb(31 39 51 / 0.98), rgb(25 31 41 / 0.98));
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.2),
    0 16px 34px rgb(0 0 0 / 0.24),
    0 30px 64px -38px rgb(var(--pet-accent-rgb) / 0.52);
}

body.dark .pet-card:hover,
body.dark .pet-card:focus-visible {
  border-color: rgb(var(--pet-accent-rgb) / 0.46);
  box-shadow:
    0 4px 10px rgb(0 0 0 / 0.25),
    0 22px 46px rgb(0 0 0 / 0.34),
    0 34px 72px -34px rgb(var(--pet-accent-rgb) / 0.66);
}

body.dark .pet-card-shell::before {
  background: linear-gradient(
    145deg,
    rgb(var(--pet-accent-rgb) / 0.2) 18%,
    rgb(var(--pet-accent-rgb) / 0.24) 46%,
    rgb(var(--pet-secondary-rgb) / 0.3) 86%
  );
}

body.dark .pet-card__serial {
  background: rgb(17 21 28 / 0.52);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
}

body.dark .pet-card__artwork {
  background:
    radial-gradient(circle at 50% 56%, rgb(var(--pet-accent-rgb) / 0.18), transparent 46%),
    linear-gradient(145deg, rgb(255 255 255 / 0.035), rgb(var(--pet-accent-rgb) / 0.055));
}

body.dark .pet-card__name {
  color: #f2f4f7;
}

body.dark .pet-card__score {
  border-top-color: rgb(48 58 72 / 0.72);
}

body.dark .pet-card__score-label {
  color: #aeb6c2;
}

body.dark .pet-card__score-value {
  color: rgb(var(--pet-accent-rgb));
}

.pet-card-shell--dual .pet-card__name::before {
  background: linear-gradient(
    to bottom,
    rgb(var(--pet-accent-rgb)),
    rgb(var(--pet-secondary-rgb))
  );
}

.pet-card-shell--dual .pet-card__score-value::after {
  background: linear-gradient(
    to right,
    rgb(var(--pet-accent-rgb)),
    rgb(var(--pet-secondary-rgb))
  );
}

.pet-card-shell--dual .pet-card__serial {
  position: relative;
  isolation: isolate;
  background-color: transparent;
  border-color: rgb(var(--pet-accent-rgb) / 0.24);
}

.pet-card-shell--dual .pet-card__serial::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    105deg,
    rgb(var(--pet-accent-rgb) / 0.08),
    rgb(var(--pet-secondary-rgb) / 0.1)
  );
  content: '';
}

.pet-card-shell--dual .pet-card__watermark {
  background-image: linear-gradient(
    105deg,
    rgb(var(--pet-accent-rgb) / 0.075),
    rgb(var(--pet-secondary-rgb) / 0.1)
  );
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

body.dark .pet-card-shell--dual .pet-card {
  border-color: rgb(var(--pet-accent-rgb) / 0.3);
  background:
    radial-gradient(circle at 4% 0%, rgb(var(--pet-accent-rgb) / 0.1), transparent 42%),
    radial-gradient(circle at 96% 0%, rgb(var(--pet-secondary-rgb) / 0.11), transparent 44%),
    linear-gradient(155deg, rgb(31 39 51 / 0.98), rgb(25 31 41 / 0.98));
}

body.dark .pet-card-shell--dual .pet-card__artwork {
  background:
    radial-gradient(circle at 34% 56%, rgb(var(--pet-accent-rgb) / 0.17), transparent 48%),
    radial-gradient(circle at 72% 48%, rgb(var(--pet-secondary-rgb) / 0.15), transparent 48%),
    linear-gradient(145deg, rgb(255 255 255 / 0.035), rgb(255 255 255 / 0.015));
}

body.dark .pet-card-shell--dual .pet-card__serial::before {
  background: linear-gradient(
    105deg,
    rgb(var(--pet-accent-rgb) / 0.12),
    rgb(var(--pet-secondary-rgb) / 0.14)
  );
}

@media (min-width: 640px) {
  .pet-card {
    padding: 0.9rem;
  }

  .pet-card__name {
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-card,
  .pet-card__ambient,
  .pet-card__halo,
  .pet-card__image {
    transition: none;
  }

  .pet-card:hover,
  .pet-card:focus-visible,
  .pet-card:hover .pet-card__image,
  .pet-card:focus-visible .pet-card__image,
  .pet-card:hover .pet-card__image--shiny,
  .pet-card:focus-visible .pet-card__image--shiny {
    transform: none;
  }
}
</style>