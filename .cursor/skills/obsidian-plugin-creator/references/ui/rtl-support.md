# Right-to-Left (RTL) Support

Obsidian supports RTL languages (Arabic, Dhivehi, Hebrew, Farsi, Syriac, Urdu) spoken by 600+ million people.

**New in Obsidian 1.6:** Mirrored UI and mixed language support.

RTL languages appear in two contexts:

- **App interface** - Set in Obsidian Settings
- **Note content** - Can be LTR, RTL, or mixed

## Interface Direction

When an RTL language is selected:

- `.mod-rtl` class is added to the `body` element
- `lang` attribute is set on the `html` element (e.g., `lang="ar"`)

Use `.mod-rtl` to set element direction:

```css
.mod-rtl .plugin-class {
  direction: rtl;
}
```

## Content Direction

The `dir="rtl"` attribute is added to `.markdown-source-view` when:

- User selects an RTL interface language
- RTL is set as default editor direction

In the editor, `dir` is set per line on `.cm-line` elements by detecting the first strongly directional character.

In reading mode, lines use `dir="auto"` on each block.

## CSS Best Practices

### Logical Properties

Use logical properties instead of directional ones:

| Properties  | Directional     | Logical                |
| ----------- | --------------- | ---------------------- |
| Margins     | `margin-left`   | `margin-inline-start`  |
|             | `margin-right`  | `margin-inline-end`    |
| Padding     | `padding-left`  | `padding-inline-start` |
|             | `padding-right` | `padding-inline-end`   |
| Borders     | `border-left`   | `border-inline-start`  |
|             | `border-right`  | `border-inline-end`    |
| Positioning | `left`          | `inset-inline-start`   |
|             | `right`         | `inset-inline-end`     |

### Logical Values

| Values     | Directional         | Logical               |
| ---------- | ------------------- | --------------------- |
| Float      | `float: left`       | `float: inline-start` |
|            | `float: right`      | `float: inline-end`   |
| Text align | `text-align: left`  | `text-align: start`   |
|            | `text-align: right` | `text-align: end`     |

### Browser Compatibility

Guard newer selectors with `@supports`:

```css
.supported,
.unsupported {
  /* this won't run */
}

.supported {
  /* this will run */
}

.unsupported {
  /* this won't run */
}

@supports selector(:dir(*)) {
  /* will run if :dir() is supported */
}
```

For properties without full support, provide fallbacks:

```css
element {
  property: fallback-value;
  property: new-value; /* Will fallback gracefully if unsupported */
}
```

### Icon Mirroring

Obsidian automatically reverses icons in RTL mode. Prevent reversal for specific icons:

```css
.mod-rtl svg.svg-icon.left-icon {
  transform: unset;
}
```

### Direction Variable

Use `--direction` for calculations like `translateX()`:

| Variable      | LTR value | RTL value |
| ------------- | --------- | --------- |
| `--direction` | `1`       | `-1`      |

### Unicode Bidi

Use `unicode-bidi: plaintext` for single-line content that could be LTR or RTL (file names, outline items, tooltips, status bar elements). This ensures correct direction and proper ellipsis truncation.

## Resources

- [Apple RTL human interface guidelines](https://developer.apple.com/design/human-interface-guidelines/right-to-left)
- [RTL Styling 101](https://rtlstyling.com/)
- [MDN logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)

---

**Note:** Be aware that many RTL users choose LTR for the interface while writing notes in RTL, or mix both within the same note.
