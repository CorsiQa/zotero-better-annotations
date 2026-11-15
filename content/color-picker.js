/* Better Annotations – color picker of the settings page
 *
 * Saturation/brightness field, hue slider, hex field, the operating system's
 * color dialog, example palettes and recently used colors.
 */

/* global Zotero, BetterAnnotations */

// -------------------------------------------------------------------------
// Color picker (popover with color field, hue, hex input and palettes)
// -------------------------------------------------------------------------
BetterAnnotations.ColorPicker = class {
  constructor(pane, entry, anchor) {
    this.pane = pane;
    this.entry = entry;
    this.anchor = anchor;
    this.initial = entry.color;
    this.hsv = BetterAnnotations.hexToHsv(entry.color);
    this.cleanup = [];
  }

  open() {
    const p = this.pane;
    const h = (...a) => p.h(...a);
    const S = (k, a) => p.S(k, a);
    const SB = p.SB;

    this.svKnob = h("div", { class: "bac-knob" });
    this.sv = h("div", { class: "bac-sv" }, this.svKnob);
    this.hueKnob = h("div", { class: "bac-knob" });
    this.hue = h("div", { class: "bac-hue" }, this.hueKnob);
    this.newPrev = h("span");
    const oldPrev = h("span", { title: this.initial });
    oldPrev.style.background = this.initial;
    const preview = h("div", { class: "bac-preview" }, oldPrev, this.newPrev);
    this.hexIn = h("input", {
      class: "bac-hexin",
      type: "text",
      value: this.entry.color,
      spellcheck: "false",
      "aria-label": "Hex",
      on: {
        input: () => {
          const c = SB.normalize(this.hexIn.value);
          if (c) {
            this.hsv = BetterAnnotations.hexToHsv(c);
            this.apply(c, false);
          }
        },
        keydown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            p.closePicker(false);
          }
        },
      },
    });
    this.native = h("input", {
      class: "bac-native",
      type: "color",
      tabindex: "-1",
      on: {
        input: () => {
          const c = SB.normalize(this.native.value);
          if (c) {
            this.hsv = BetterAnnotations.hexToHsv(c);
            this.apply(c, true);
          }
        },
      },
    });
    const sysBtn = p.button(S("pickerSystem"), () => {
      this.native.value = this.entry.color;
      this.native.click();
    }, { tooltip: S("pickerSystemTip") });

    this.presetButtons = [];
    this.paletteBox = h("div", { class: "bac-palettes" });
    const orderButtons = [["rainbow", "orderRainbow"], ["zotero", "orderZotero"]].map(([value, key]) => h("button", {
      class: "bac-seg",
      "data-value": value,
      on: {
        click: () => {
          p.own(() => p.Store.setSetting("paletteOrder", value));
          this.renderPalettes(value);
        },
      },
    }, S(key)));
    this.orderButtons = orderButtons;
    const orderRow = h("div", { class: "bac-prow bac-order" },
      h("span", { class: "bac-pal-name", text: S("orderLabel") }),
      h("span", { class: "bac-segs" }, orderButtons));
    this.renderPalettes(SB.setting("paletteOrder"));
    const groups = [orderRow, this.paletteBox];

    this.warn = h("div", { class: "bac-warn" });
    const done = p.button(S("pickerDone"), () => p.closePicker(false));

    this.el = h("div", { class: "bac-picker", role: "dialog" },
      this.sv, this.hue,
      h("div", { class: "bac-prow" }, preview, this.hexIn, sysBtn, this.native),
      ...groups,
      this.warn,
      h("div", { class: "bac-prow", style: "justify-content:flex-end" }, done),
    );
    p.root.append(this.el);
    this.position();
    this.bindDrag(this.sv, (x, y, r) => {
      this.hsv.s = Math.max(0, Math.min(1, x / r.width));
      this.hsv.v = Math.max(0, Math.min(1, 1 - y / r.height));
      this.apply(BetterAnnotations.hsvToHex(this.hsv), true);
    });
    this.bindDrag(this.hue, (x, y, r) => {
      this.hsv.h = Math.max(0, Math.min(359.9, x / r.width * 360));
      this.apply(BetterAnnotations.hsvToHex(this.hsv), true);
    });
    this.updateVisuals(this.entry.color);

    // A click outside closes the picker (color is kept), Esc restores the previous color
    const doc = p.doc;
    const onDown = (e) => {
      if (!this.el.contains(e.target) && e.target !== this.anchor) {
        p.closePicker(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        p.closePicker(true);
      }
    };
    doc.addEventListener("mousedown", onDown, true);
    doc.addEventListener("keydown", onKey, true);
    this.cleanup.push(() => doc.removeEventListener("mousedown", onDown, true));
    this.cleanup.push(() => doc.removeEventListener("keydown", onKey, true));
    this.hexIn.focus();
    this.hexIn.select();
  }

  /** Draw the palettes; all except Zotero+ either by hue or in Zotero order. */
  renderPalettes(order) {
    const p = this.pane;
    const h = (...a) => p.h(...a);
    const SB = p.SB;
    for (const b of this.orderButtons) {
      b.classList.toggle("bac-seg-on", b.getAttribute("data-value") === order);
    }
    this.presetButtons = [];
    this.paletteBox.replaceChildren(...SB.PALETTES.map((pal) => {
      const colors = SB.paletteDisplay(pal, order);
      return h("div", {},
        h("div", { class: "bac-pal-name", text: p.S(pal.key) }),
        h("div", { class: "bac-presets" }, colors.map((c) => {
          const b = h("button", {
            class: "bac-preset",
            title: c,
            "aria-label": c,
            "data-color": c,
            on: {
              click: () => {
                this.hsv = SB.hexToHsv(c);
                this.apply(c, true);
              },
            },
          });
          b.style.setProperty("background-color", c, "important");
          this.presetButtons.push(b);
          return b;
        })),
      );
    }));
    // Recently used colors (newest first, not sorted)
    const recent = SB.setting("recentColors") || [];
    const slots = [];
    for (let i = 0; i < 12; i++) {
      const c = recent[i];
      if (!c) {
        slots.push(h("span", { class: "bac-preset bac-empty-slot", "aria-hidden": "true" }));
        continue;
      }
      const b = h("button", {
        class: "bac-preset",
        title: c,
        "aria-label": c,
        "data-color": c,
        on: {
          click: () => {
            this.hsv = SB.hexToHsv(c);
            this.apply(c, true);
          },
        },
      });
      b.style.setProperty("background-color", c, "important");
      this.presetButtons.push(b);
      slots.push(b);
    }
    this.paletteBox.append(h("div", {},
      h("div", { class: "bac-pal-name", text: p.S("palRecent") }),
      h("div", { class: "bac-presets" }, slots),
      recent.length ? null : h("div", { class: "bac-hint bac-recent-hint", text: p.S("recentEmpty") }),
    ));
    if (this.warn) {
      this.updateVisuals(this.entry.color);
    }
  }

  position() {
    const rootRect = this.pane.root.getBoundingClientRect();
    const a = this.anchor.getBoundingClientRect();
    const width = this.el.offsetWidth || 264;
    let left = a.left - rootRect.left;
    left = Math.max(0, Math.min(left, rootRect.width - width));
    this.el.style.left = left + "px";
    this.el.style.top = (a.bottom - rootRect.top + 6) + "px";
  }

  bindDrag(el, onPos) {
    const handler = (e) => {
      const r = el.getBoundingClientRect();
      onPos(e.clientX - r.left, e.clientY - r.top, r);
    };
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      }
      catch (_) {}
      handler(e);
      const move = ev => handler(ev);
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });
  }

  apply(color, updateHexField) {
    this.entry.color = color;
    if (updateHexField) {
      this.hexIn.value = color;
    }
    this.updateVisuals(color);
    this.pane.refreshRow(this.entry);
  }

  updateVisuals(color) {
    const { h, s, v } = this.hsv;
    this.sv.style.backgroundColor = BetterAnnotations.hsvToHex({ h, s: 1, v: 1 });
    this.svKnob.style.left = (s * 100) + "%";
    this.svKnob.style.top = ((1 - v) * 100) + "%";
    this.hueKnob.style.left = (h / 360 * 100) + "%";
    this.newPrev.style.background = color;
    for (const b of this.presetButtons) {
      b.classList.toggle("bac-current", b.getAttribute("data-color") === color);
    }
    const other = this.pane.draft.colors.find(c => c !== this.entry && c.color === color);
    this.warn.textContent = other
      ? this.pane.S("pickerDuplicate", { label: other.label.trim() || this.pane.S("unnamed") })
      : "";
  }

  close(revert) {
    for (const fn of this.cleanup) {
      try {
        fn();
      }
      catch (e) {}
    }
    this.cleanup = [];
    if (revert && this.entry.color !== this.initial) {
      this.entry.color = this.initial;
      this.pane.refreshRow(this.entry);
    }
    else if (!revert && this.entry.color !== this.initial) {
      this.pane.SB.addRecentColor(this.entry.color);
    }
    this.el?.remove();
  }
};
