STYLEKIT_STYLE_REFERENCE
style_name: 俏皮野兽派
style_slug: neo-brutalist-playful
style_source: /styles/neo-brutalist-playful

# Hard Prompt

Strictly follow the style rules below and maintain consistency. No style drift allowed.

## Requirements
- Prioritize style consistency first, then creative extension.
- When conflicts arise, treat prohibitions as the highest priority.
- Self-check before output: verify colors, typography, spacing, and interactions still match this style.

## Style Rules
# Neo-Brutalist Playful (俏皮野兽派) Design System

> Neo-Brutalist 的活泼版本。保留核心特征，加入更多色彩、旋转倾斜元素、图标化装饰和有趣的微交互，适合年轻化品牌。

## 核心理念

Neo-Brutalist Playful（俏皮野兽派）是原版 Neo-Brutalist 的活泼变体。在保持硬边缘、无圆角的结构基础上，通过以下方式增加趣味性：

特色元素：
- 元素轻微旋转 rotate-[-2deg] 或 rotate-[1deg]
- 多彩色块组合
- 适当使用图标作为装饰（Lucide React 等）
- 更活泼的 hover 动画（scale、bounce）
- 手写风格的装饰文字

适用场景：年轻化品牌、创意工作室、儿童产品、趣味应用

设计原则：
- 视觉一致性：所有组件必须遵循统一的视觉语言，从色彩到字体到间距保持谐调
- 层次分明：通过颜色深浅、字号大小、留白空间建立清晰的信息层级
- 交互反馈：每个可交互元素都必须有明确的 hover、active、focus 状态反馈
- 响应式适配：设计必须在移动端、平板、桌面端上保持一致的体验
- 无障碍性：确保色彩对比度符合 WCAG 2.1 AA 标准，所有交互元素可键盘访问

---

## Token 字典（精确 Class 映射）

### 边框
```
宽度: border-4
颜色: border-black
圆角: rounded-none
```

### 阴影
```
小:   shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
中:   shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
大:   shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
悬停: hover:shadow-none
聚焦: focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)]
```

### 交互效果
```
悬停位移: hover:translate-x-[3px] hover:translate-y-[3px]
过渡动画: transition-all duration-300
按下状态: active:translate-x-[4px] active:translate-y-[4px]
```

### 字体
```
标题: font-black uppercase
正文: font-mono
```

### 字号
```
Hero:  text-5xl md:text-7xl lg:text-9xl
H1:    text-4xl md:text-6xl
H2:    text-2xl md:text-4xl
H3:    text-xl md:text-2xl
正文:  text-sm md:text-base
小字:  text-xs md:text-sm
```

### 间距
```
Section: py-12 md:py-20 lg:py-28
容器:    px-4 md:px-8 lg:px-12
卡片:    p-4 md:p-6
```

---

## [FORBIDDEN] 绝对禁止

以下 class 在本风格中**绝对禁止使用**，生成时必须检查并避免：

### 禁止的 Class
- `rounded-lg`
- `rounded-xl`
- `rounded-2xl`
- `rounded-full`
- `shadow-sm`
- `shadow`
- `shadow-md`
- `shadow-lg`
- `bg-gradient-to-r`
- `bg-gradient-to-b`
- `text-gray-300`
- `text-gray-400`
- `text-gray-500`
- `bg-gray-50`
- `bg-gray-100`
- `font-light`
- `font-normal`
- `backdrop-blur`

### 禁止的模式
- 匹配 `^rounded-(?:sm|md|lg|xl|2xl|3xl|full)$`
- 匹配 `^shadow-(?:sm|md|lg|xl|2xl)$`
- 匹配 `^bg-gradient-`
- 匹配 `^font-(?:light|thin|normal)$`
- 匹配 `^backdrop-blur`

### 禁止原因
- `rounded-lg`: Neo-Brutalist Playful uses sharp corners only (rounded-none)
- `shadow-md`: Neo-Brutalist Playful uses hard-edge offset shadows, not blurred
- `bg-gradient-to-r`: Neo-Brutalist Playful uses solid color blocks, no gradients
- `font-light`: Neo-Brutalist Playful uses bold/black font weights for impact
- `bg-gray-100`: Neo-Brutalist Playful uses vibrant colors, not subtle grays

> WARNING: 如果你的代码中包含以上任何 class，必须立即替换。

---

## [REQUIRED] 必须包含

### 按钮必须包含
```
rounded-none
border-4 border-black
shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
hover:shadow-none
hover:translate-x-[3px] hover:translate-y-[3px]
transition-all
font-black
```

### 卡片必须包含
```
rounded-none
border-4 border-black
bg-white
```

### 输入框必须包含
```
rounded-none
border-4 border-black
font-mono
focus:outline-none
focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)]
transition-all
```

---

## [COMPARE] 错误 vs 正确对比

### 按钮

[WRONG] **错误示例**（使用了圆角和模糊阴影）：
```html
<button class="rounded-lg shadow-lg bg-blue-500 text-white px-4 py-2 hover:bg-blue-600">
  点击我
</button>
```

[CORRECT] **正确示例**（使用硬边缘、无圆角、位移效果）：
```html
<button class="rounded-none border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all font-black bg-[#ff006e] text-white px-4 py-2 md:px-6 md:py-3">
  点击我
</button>
```

### 卡片

[WRONG] **错误示例**（使用了渐变和圆角）：
```html
<div class="rounded-xl shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-6">
  <h3 class="text-xl font-semibold">标题</h3>
</div>
```

[CORRECT] **正确示例**（纯色背景、硬边缘阴影）：
```html
<div class="rounded-none border-4 border-black bg-white p-4 md:p-6">
  <h3 class="font-black uppercase text-xl md:text-2xl">标题</h3>
</div>
```

### 输入框

[WRONG] **错误示例**（灰色边框、圆角）：
```html
<input class="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500" />
```

[CORRECT] **正确示例**（黑色粗边框、聚焦阴影）：
```html
<input class="rounded-none border-4 border-black font-mono focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(78,205,196,1)] transition-all px-3 py-2 md:px-4 md:py-3" placeholder="请输入..." />
```

---

## [TEMPLATES] 页面骨架模板

使用以下模板生成页面，只需替换 `{PLACEHOLDER}` 部分：

### 导航栏骨架
```html
<nav class="bg-white border-b-2 md:border-b-4 border-black px-4 md:px-8 py-3 md:py-4">
  <div class="flex items-center justify-between max-w-6xl mx-auto">
    <a href="/" class="font-black text-xl md:text-2xl tracking-wider">
      {LOGO_TEXT}
    </a>
    <div class="flex gap-4 md:gap-8 font-mono text-sm md:text-base">
      {NAV_LINKS}
    </div>
  </div>
</nav>
```

### Hero 区块骨架
```html
<section class="min-h-[60vh] md:min-h-[80vh] flex items-center px-4 md:px-8 py-12 md:py-0 bg-{ACCENT_COLOR} border-b-2 md:border-b-4 border-black">
  <div class="max-w-4xl mx-auto">
    <h1 class="font-black text-4xl md:text-6xl lg:text-8xl leading-tight tracking-tight mb-4 md:mb-6">
      {HEADLINE}
    </h1>
    <p class="font-mono text-base md:text-xl max-w-xl mb-6 md:mb-8">
      {SUBHEADLINE}
    </p>
    <button class="bg-black text-white font-black px-6 py-3 md:px-8 md:py-4 border-2 md:border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] md:shadow-[8px_8px_0px_0px_rgba(255,0,110,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm md:text-base">
      {CTA_TEXT}
    </button>
  </div>
</section>
```

### 卡片网格骨架
```html
<section class="py-12 md:py-24 px-4 md:px-8">
  <div class="max-w-6xl mx-auto">
    <h2 class="font-black text-2xl md:text-4xl mb-8 md:mb-12">{SECTION_TITLE}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <!-- Card template - repeat for each card -->
      <div class="bg-white border-2 md:border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 hover:shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] md:hover:shadow-[8px_8px_0px_0px_rgba(255,0,110,1)] hover:-translate-y-1 transition-all">
        <h3 class="font-black text-lg md:text-xl mb-2">{CARD_TITLE}</h3>
        <p class="font-mono text-sm md:text-base text-gray-700">{CARD_DESCRIPTION}</p>
      </div>
    </div>
  </div>
</section>
```

### 页脚骨架
```html
<footer class="bg-black text-white py-12 md:py-16 px-4 md:px-8 border-t-2 md:border-t-4 border-black">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <span class="font-black text-xl md:text-2xl">{LOGO_TEXT}</span>
        <p class="font-mono text-sm mt-4 text-gray-400">{TAGLINE}</p>
      </div>
      <div>
        <h4 class="font-black text-lg mb-4">{COLUMN_TITLE}</h4>
        <ul class="space-y-2 font-mono text-sm text-gray-400">
          {FOOTER_LINKS}
        </ul>
      </div>
    </div>
  </div>
</footer>
```

---

## [CHECKLIST] 生成后自检清单

**在输出代码前，必须逐项验证以下每一条。如有违反，立即修正后再输出：**

### 1. 圆角检查
- [ ] 搜索代码中的 `rounded-`
- [ ] 确认只有 `rounded-none` 或无圆角
- [ ] 如果发现 `rounded-lg`、`rounded-md` 等，替换为 `rounded-none`

### 2. 阴影检查
- [ ] 搜索代码中的 `shadow-`
- [ ] 确认只使用 `shadow-[Xpx_Xpx_0px_0px_rgba(...)]` 格式
- [ ] 如果发现 `shadow-lg`、`shadow-xl` 等，替换为正确格式

### 3. 边框检查
- [ ] 搜索代码中的 `border-`
- [ ] 确认边框颜色是 `border-black`
- [ ] 如果发现 `border-gray-*`、`border-slate-*`，替换为 `border-black`

### 4. 交互检查
- [ ] 所有按钮都有 `hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`
- [ ] 所有卡片都有 hover 效果（阴影变色或位移）
- [ ] 都包含 `transition-all`

### 5. 响应式检查
- [ ] 边框有 `border-2 md:border-4`
- [ ] 阴影有 `shadow-[4px...] md:shadow-[8px...]`
- [ ] 间距有 `p-4 md:p-6` 或类似的响应式值
- [ ] 字号有 `text-sm md:text-base` 或类似的响应式值

### 6. 字体检查
- [ ] 标题使用 `font-black`
- [ ] 正文使用 `font-mono`

> CRITICAL: **如果任何一项检查不通过，必须修正后重新生成代码。**

---

## [EXAMPLES] 示例 Prompt

### 1. 儿童教育网站

活泼有趣的学习平台

```
用 Neo-Brutalist Playful 风格创建一个儿童教育网站，要求：
1. 导航：彩色按钮，每个用不同鲜艳色
2. Hero：大标题带颜色高亮，可爱插图
3. 课程卡片：彩色边框和阴影，hover 放大 + 上浮
4. 进度条：彩色条纹或波浪效果
5. 按钮：圆形装饰点缀，hover 时旋转
配色：明黄、粉红、天蓝、青绿交替使用
```

### 2. 活动报名页

有趣的活动宣传和报名

```
用 Neo-Brutalist Playful 风格设计一个活动报名页，要求：
1. Hero：大胆标题，彩色文字或高亮背景
2. 活动信息：卡片式布局，每个信息点用不同色块
3. 时间线：彩色圆点连接，每阶段不同色
4. 报名表单：彩色边框输入框，提交按钮醒目
5. 装饰：几何图形点缀（方块、圆点）
整体活泼但保持野兽派的硬边缘和粗边框
```

### 3. 创意作品集

个性化的作品展示

```
用 Neo-Brutalist Playful 风格创建一个创意作品集，要求：
1. 首页：大胆的自我介绍，彩色文字
2. 作品网格：每个项目卡片用不同彩色阴影
3. 项目详情：全屏图片，彩色边框
4. 技能展示：彩色进度条或图标
5. 联系区：趣味表单，彩色按钮
保持无圆角、粗边框、硬阴影的野兽派特征
```