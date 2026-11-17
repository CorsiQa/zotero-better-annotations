/* Better Annotations – one-time request for feedback
 *
 * A week after the first start, the plugin asks once whether the user wants
 * to share experiences and wishes on GitHub. “Later” asks again after 30
 * days; “Share on GitHub” and “Don't ask again” end it. The dialog appears
 * two minutes after Zotero started, never while the user is in the middle of
 * starting Zotero.
 */

/* global Zotero, Services, BetterAnnotations */

BetterAnnotations.Feedback = {
  FIRST_DAYS: 7,
  LATER_DAYS: 30,
  DELAY_MS: 2 * 60 * 1000,
  _timer: null,

  get SB() {
    return BetterAnnotations;
  },

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  addDays(date, days) {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  },

  init() {
    const SB = this.SB;
    if (SB.setting("feedbackDone")) {
      return;
    }
    if (!SB.setting("firstUse")) {
      const today = this.today();
      SB.Store.setSetting("firstUse", today)
        .then(() => SB.Store.setSetting("feedbackDue", this.addDays(today, this.FIRST_DAYS)))
        .catch(e => SB.logError(e));
      return;
    }
    const due = SB.setting("feedbackDue") || this.addDays(SB.setting("firstUse"), this.FIRST_DAYS);
    if (due > this.today()) {
      return;
    }
    this._timer = SB.setTimeout(() => this.ask(), this.DELAY_MS);
  },

  shutdown() {
    this._timer = null;
  },

  /** Show the feedback request when its timer fires, unless it was answered. */
  async ask() {
    const SB = this.SB;
    const S = (k, a) => SB.S(k, a);
    if (!this._timer || SB.setting("feedbackDone")) {
      return;
    }
    this._timer = null;
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const ps = Services.prompt;
    const flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_0_DEFAULT;
    // Button 1 (also Esc and closing the window): later
    const choice = ps.confirmEx(win, S("feedbackTitle"), S("feedbackText"), flags,
      S("btnFeedbackShare"), S("btnFeedbackLater"), S("btnFeedbackNever"), null, {});
    try {
      if (choice === 0) {
        Zotero.launchURL(SB.PROJECT.issues);
        await SB.Store.setSetting("feedbackDone", true);
      }
      else if (choice === 2) {
        await SB.Store.setSetting("feedbackDone", true);
      }
      else {
        await SB.Store.setSetting("feedbackDue", this.addDays(this.today(), this.LATER_DAYS));
      }
    }
    catch (e) {
      SB.logError(e);
    }
  },
};
