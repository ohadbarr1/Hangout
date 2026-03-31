const he = {
  // ─── Common ───────────────────────────────────────────────────────────────
  cancel: 'ביטול',
  save: 'שמור',
  delete: 'מחק',
  add: 'הוסף',
  edit: 'ערוך',
  done: 'סיום',
  back: 'חזור',
  loading: 'טוען…',
  error: 'שגיאה',
  retry: 'נסה שוב',
  confirm: 'אישור',
  close: 'סגור',
  share: 'שתף',
  remove: 'הסר',

  // ─── Greetings ────────────────────────────────────────────────────────────
  greeting_morning: 'בוקר',
  greeting_afternoon: 'צהריים',
  greeting_evening: 'ערב',
  greeting_hey: 'היי, {{name}} 👋',

  // ─── Home ─────────────────────────────────────────────────────────────────
  home_new_event: 'אירוע חדש',
  home_next_hangout: 'הבילוי הבא שלך',
  home_all_hangouts: 'כל האירועים',
  home_needs_attention: 'דורש תשומת לב',
  home_recently_active: 'פעיל לאחרונה',
  home_empty_title: 'אין אירועים עדיין',
  home_empty_sub: 'תאר את האירוע שלך ותן ל-AI לתכנן הכל — מי מביא מה, כמה, ומתי.',
  home_try_example: 'נסה דוגמה',
  home_plan_btn: 'תכנן בילוי',
  home_example_1: 'מנגל ל-10 אנשים בשבת 🔥',
  home_example_2: 'ערב משחקים אצלי ביום שישי 🎮',
  home_example_3: 'טיול לים ל-8 אנשים, יוצאים ב-9 🏖️',

  // ─── Event status ─────────────────────────────────────────────────────────
  status_active: 'פעיל',
  status_draft: 'טיוטה',
  status_completed: 'הסתיים',
  status_cancelled: 'בוטל',
  status_active_dot: '● פעיל',
  status_draft_dot: '◌ טיוטה',

  // ─── Event card ───────────────────────────────────────────────────────────
  card_claimed: '{{claimed}}/{{total}} נתפסו',
  card_all_claimed: '✓ הכל נתפס',

  // ─── Event detail ─────────────────────────────────────────────────────────
  detail_share_invite: 'הזמן',
  detail_items_claimed: 'פריטים נתפסו',
  detail_tomorrow: '🔔 מחר!',
  detail_days_to_go: '⏳ עוד {{days}} ימים',
  detail_filter_all: 'הכל',
  detail_filter_unclaimed: 'פנויים',
  detail_filter_claimed: 'נתפסו',
  detail_ai_suggestions: '✨ הצעות AI',
  detail_add_suggestion: '+ הוסף',
  detail_view_recap: '🎉 צפה בסיכום האירוע',
  detail_rsvp_label: 'האם אתה/את מגיע/ה?',
  detail_rsvp_going: 'מגיע/ה ✓',
  detail_rsvp_maybe: 'אולי',
  detail_rsvp_not_going: 'לא מגיע/ה',
  detail_no_items: 'אין פריטים עדיין.',
  detail_no_items_filter: 'אין פריטים התואמים לסינון.',
  detail_activity_title: 'פעילות אחרונה',

  // ─── Items ────────────────────────────────────────────────────────────────
  items_manage: 'נהל פריטים',
  items_add: 'הוסף פריט',
  items_new: 'פריט חדש',
  items_name_placeholder: 'שם הפריט',
  items_qty_placeholder: 'כמות',
  items_empty: 'אין פריטים עדיין. השתמש בשורה למטה כדי להוסיף.',
  items_claim: 'תפוס',
  items_unclaim: 'שחרר',
  items_you: 'אתה/את',
  items_quickadd_placeholder: 'לדוג׳ "2 שקיות צ׳יפס ומשקאות"',
  items_delete_title: 'מחק פריט',
  items_delete_body: 'להסיר את "{{name}}"?',

  // ─── Celebration ──────────────────────────────────────────────────────────
  celebration_message: '🎉 כל הפריטים נתפסו!',
  celebration_dismiss: 'לחץ לסגירה',

  // ─── Presence ─────────────────────────────────────────────────────────────
  presence_single: '{{name}} כאן עכשיו',
  presence_multiple: '{{names}} כאן עכשיו',

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile_title: 'פרופיל',
  profile_edit: 'ערוך פרופיל',
  profile_sign_out: 'התנתק',
  profile_sign_out_confirm: 'בטוח/ה שרוצה להתנתק?',
  profile_hosted: 'ארחתי',
  profile_joined: 'הצטרפתי',
  profile_done: 'הסתיים',
  profile_display_name: 'שם תצוגה',
  profile_name_placeholder: 'השם שלך',
  profile_name_required: 'נא להזין שם תצוגה.',
  profile_language: 'שפה',
  profile_language_restart: 'האפליקציה תטען מחדש כדי להחיל את השפה החדשה.',

  // ─── Recap ────────────────────────────────────────────────────────────────
  recap_label: 'סיכום אירוע',
  recap_attended: 'השתתפו',
  recap_items_claimed: 'פריטים נתפסו',
  recap_top_contributors: '🏆 התורמים המובילים',
  recap_who_came: '👥 מי הגיע',
  recap_share: 'שתף סיכום',
  recap_mvp: 'MVP',
  recap_share_text: '🎉 {{title}} — סיכום\n\n{{oneliner}}\n\n👥 {{attendees}} אנשים השתתפו\n✅ {{claimed}}/{{total}} פריטים נתפסו ({{pct}}%)\n\nתוכנן עם Hangout 🎊',

  // ─── My Events ────────────────────────────────────────────────────────────
  my_events_title: 'האירועים שלי',
  my_events_search: 'חפש אירועים…',
  my_events_tab_all: 'הכל',
  my_events_tab_active: 'פעיל',
  my_events_tab_draft: 'טיוטה',
  my_events_tab_done: 'הסתיים',
  my_events_empty: 'אין אירועים כאן.',

  // ─── Invite ───────────────────────────────────────────────────────────────
  invite_join: 'הצטרף',
  invite_going: 'מגיע/ה',
  invite_maybe: 'אולי',
  invite_not_going: 'לא מגיע/ה',
  invite_loading: 'טוען הזמנה…',
  invite_you_are_invited: 'הוזמנת אל',
  invite_people_going: '{{count}} מגיעים',
  invite_items_to_claim: '{{count}} פריטים לתפיסה',
  invite_sign_in_first: 'תצטרך/י להתחבר קודם.',
  invite_im_in: 'אני בפנים!',
  invite_sign_in_to_join: 'התחבר/י כדי להצטרף',
  invite_maybe_label: 'אולי — אעדכן אחר כך',
  invite_maybe_later: 'אולי מאוחר יותר',
  invite_go_home: 'לדף הבית',

  // ─── Event detail extras ──────────────────────────────────────────────────
  detail_your_rsvp: 'ה-RSVP שלך',
  detail_copy_list: 'העתק רשימה',
  detail_no_comments: 'אין תגובות עדיין. היה/י הראשון/ה!',
  detail_add_comment: 'הוסף תגובה…',

  // ─── Language names ───────────────────────────────────────────────────────
  lang_en: 'English',
  lang_he: 'עברית',
} as const;

export default he;
