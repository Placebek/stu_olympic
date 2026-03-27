# Performance Optimizations — OlympIQ

## Цель
Стабильные 60 FPS на мобильных устройствах и слабых ПК без ухудшения визуального качества.

---

## 1. AuroraBackground — полная замена Framer Motion на CSS-анимации

### Что было плохо
4 `motion.div` с `animate: { x, y, scale }` и `repeat: Infinity`.
- Framer Motion для каждого кадра вызывал JS, обновлял inline-стили через RAF.
- 4 одновременных infinite-анимации = постоянная нагрузка на JS-поток.
- Framer Motion не гарантирует продвижение на GPU — браузер мог перерисовывать (`repaint`) каждый кадр.

### Что изменилось
Заменены на `<div class="aurora-blob-N">` с CSS `@keyframes`.

```css
@keyframes aurora1 {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  33%       { transform: translate3d(40px, -30px, 0) scale(1.08); }
  66%       { transform: translate3d(-20px, 20px, 0) scale(0.96); }
}
.aurora-blob-1 { animation: aurora1 18s ease-in-out infinite; }
```

### Влияние на производительность
- **Reflow:** нет — анимируются только `transform` (не `top/left/width/height`).
- **Repaint:** нет — `transform` не триггерит repaint.
- **GPU:** `translate3d` явно продвигает элемент на отдельный compositor layer.
- **JS thread:** нет нагрузки — CSS-анимации исполняются на compositor thread.
- **На мобильных:** скрыты `.aurora-blob-3` и `.aurora-blob-4` — только 2 блоба вместо 4.
- **`will-change: transform`** добавлен — заранее резервирует GPU layer.

---

## 2. LangSwitcher — удалён `layoutId`

### Что было плохо
`layoutId="lang-pill"` запускает Framer Motion **Layout Animation Engine**:
при каждом клике на язык происходит полный layout-calculation для нахождения позиции элемента.
- Измеряется `getBoundingClientRect()` — принудительный synchronous layout.
- Создаётся FLIP-анимация — вычисляются разницы позиций.
- Всё это ради перемещения маленькой "таблетки" на 30px.

### Что изменилось
`layoutId` удалён. Вместо этого — CSS transition на `background` кнопки:

```jsx
style={{
  background: lang === l ? 'linear-gradient(...)' : 'transparent',
  transition: 'background 0.2s ease, color 0.2s ease',
}}
```

Framer Motion полностью убран из компонента.

### Влияние на производительность
- **Reflow:** устранён (больше нет `getBoundingClientRect`).
- **GPU:** CSS transition на `background` — repaint, но однократный и мгновенный.
- Framer Motion больше не загружается для этого компонента.

---

## 3. Loading spinners — замена `motion.div + rotate:360` на CSS `animate-spin`

### Что было плохо
```jsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
/>
```
- Framer Motion создаёт RAF loop, обновляет `style.transform` из JS-потока на каждом кадре.
- Присутствовало в: TaskPage, QuizPage, ResultsPage (spinner + refresh button).

### Что изменилось
```jsx
<div
  className="... animate-spin"
  style={{ animationDuration: '1.5s' }}
/>
```
Tailwind `animate-spin` — это CSS `@keyframes rotate` с `transform: rotate()`.

### Влияние на производительность
- **JS thread:** полностью освобождён от этих анимаций.
- **Compositor thread:** CSS-анимация выполняется без JS.
- **GPU:** `transform: rotate` = compositor-only, 0 reflow, 0 repaint.

---

## 4. RegisterPage — удалена infinite float-анимация логотипа

### Что было плохо
```jsx
<motion.div
  animate={{ y: [0, -8, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
>
```
Infinity keyframe-анимация через Framer Motion на иконке логотипа.
JS обновляет `translateY` каждые ~16ms бесконечно.

### Что изменилось
CSS класс `icon-float`:
```css
@media (prefers-reduced-motion: no-preference) {
  .icon-float { animation: iconFloat 4s ease-in-out infinite; }
}
@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
```

### Влияние
- JS thread полностью свободен.
- Автоматически отключается при `prefers-reduced-motion: reduce`.

---

## 5. QuizPage — прогресс-бар: `width` → `scaleX`

### Что было плохо
```jsx
<motion.div
  animate={{ width: `${pct}%` }}
  transition={{ type: 'spring', stiffness: 100 }}
/>
```
Анимация `width` → **reflow на каждый кадр**.
Браузер пересчитывает layout всей страницы при каждом изменении ширины.

### Что изменилось
```jsx
<div
  style={{
    transform: `scaleX(${answeredCount / totalQ})`,
    transformOrigin: 'left center',
    transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
  }}
/>
```

### Влияние
- **Reflow:** устранён — `scaleX` не меняет геометрию документа.
- **GPU:** `transform` выполняется на compositor layer.
- Визуально идентично — пользователь не замечает разницы.

---

## 6. ResultsPage — убран per-item stagger для списка команд

### Что было плохо
```jsx
{rest.map((entry, idx) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.25 + idx * 0.04 }}
  >
```
При 20 командах — 20 одновременных Framer Motion анимаций с разными задержками.
Framer Motion инициализирует и отслеживает каждый элемент отдельно.

### Что изменилось
Заменены на обычные `<div>`. Контейнер уже анимируется через `initial={{ opacity:0, y:20 }}` — пользователь видит плавный вход секции целиком.

### Влияние
- Нет N параллельных JS-треков анимации.
- Отрисовка списка мгновенная после появления блока.

---

## 7. `MotionConfig reducedMotion="user"` — системный `prefers-reduced-motion`

### Что добавлено
В `App.jsx`:
```jsx
import { MotionConfig } from 'framer-motion'

<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

### Что это делает
Framer Motion автоматически проверяет `window.matchMedia('(prefers-reduced-motion: reduce)')`.
Если включено — **все** Framer Motion анимации отключаются глобально (opacity остаётся, transform обнуляется).

### Влияние
- Полная поддержка accessibility без изменений в каждом компоненте.
- Пользователи с вестибулярными нарушениями или настройкой "уменьшить движение" получают статичный UI.

---

## Итог — что GPU-friendly, что нет

| Свойство | Reflow | Repaint | GPU compositor |
|----------|--------|---------|----------------|
| `transform` (translate, scale, rotate) | ❌ нет | ❌ нет | ✅ да |
| `opacity` | ❌ нет | ❌ нет | ✅ да |
| `width` / `height` | ✅ ДА | ✅ ДА | ❌ нет |
| `top` / `left` | ✅ ДА | ✅ ДА | ❌ нет |
| `background-color` | ❌ нет | ✅ ДА | ❌ нет |
| `filter: blur()` | ❌ нет | ✅ ДА | частично |

Все анимации в проекте теперь используют только `transform` и `opacity`.

---

## Изменения, которые НЕ были затронуты

- `AnimatePresence` переходы между шагами (RegisterPage, QuizPage) — **оставлены**: используют только `opacity` + `translateX`, GPU-friendly, редко срабатывают.
- `whileHover` / `whileTap` на кнопках — **оставлены**: срабатывают только по взаимодействию, используют `scale` (GPU), не нагружают idle frame rate.
- Модальные окна spring-анимация (`scale + opacity`) — **оставлены**: редко открываются, короткие анимации.
