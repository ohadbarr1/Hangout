const en = {
  // ─── Common ───────────────────────────────────────────────────────────────
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  add: 'Add',
  edit: 'Edit',
  done: 'Done',
  back: 'Back',
  loading: 'Loading…',
  error: 'Error',
  retry: 'Try again',
  confirm: 'Confirm',
  close: 'Close',
  share: 'Share',
  remove: 'Remove',

  // ─── Greetings ────────────────────────────────────────────────────────────
  greeting_morning: 'morning',
  greeting_afternoon: 'afternoon',
  greeting_evening: 'evening',
  greeting_hey: 'Hey, {{name}} 👋',

  // ─── Home ─────────────────────────────────────────────────────────────────
  home_new_event: 'New event',
  home_next_hangout: 'Your next hangout',
  home_all_hangouts: 'ALL HANGOUTS',
  home_needs_attention: 'Needs your attention',
  home_recently_active: 'Recently active',
  home_empty_title: 'No hangouts yet',
  home_empty_sub: 'Describe your event and let AI plan everything — who brings what, how much, when.',
  home_try_example: 'TRY AN EXAMPLE',
  home_plan_btn: 'Plan a hangout',
  home_example_1: 'BBQ for 10 people this Saturday 🔥',
  home_example_2: 'Game night at mine next Friday 🎮',
  home_example_3: 'Beach trip for 8, leaving at 9am 🏖️',

  // ─── Event status ─────────────────────────────────────────────────────────
  status_active: 'Active',
  status_draft: 'Draft',
  status_completed: 'Done',
  status_cancelled: 'Cancelled',
  status_active_dot: '● Active',
  status_draft_dot: '◌ Draft',

  // ─── Event card ───────────────────────────────────────────────────────────
  card_claimed: '{{claimed}}/{{total}} claimed',
  card_all_claimed: '✓ All claimed',

  // ─── Event detail ─────────────────────────────────────────────────────────
  detail_share_invite: 'Invite',
  detail_items_claimed: 'items claimed',
  detail_tomorrow: '🔔 Tomorrow!',
  detail_days_to_go: '⏳ {{days}} days to go',
  detail_filter_all: 'All',
  detail_filter_unclaimed: 'Unclaimed',
  detail_filter_claimed: 'Claimed',
  detail_ai_suggestions: '✨ AI SUGGESTIONS',
  detail_add_suggestion: '+ Add',
  detail_view_recap: '🎉 View Event Recap',
  detail_rsvp_label: 'ARE YOU GOING?',
  detail_rsvp_going: 'Going ✓',
  detail_rsvp_maybe: 'Maybe',
  detail_rsvp_not_going: "Can't go",
  detail_no_items: 'No items yet.',
  detail_no_items_filter: 'No items match this filter.',
  detail_activity_title: 'Recent activity',

  // ─── Items ────────────────────────────────────────────────────────────────
  items_manage: 'Manage items',
  items_add: 'Add item',
  items_new: 'New item',
  items_name_placeholder: 'Item name',
  items_qty_placeholder: 'Qty',
  items_empty: 'No items yet. Use the bar below to add some.',
  items_claim: 'Claim',
  items_unclaim: 'Unclaim',
  items_you: 'You',
  items_quickadd_placeholder: 'e.g. "2 bags of chips and some drinks"',
  items_delete_title: 'Delete item',
  items_delete_body: 'Remove "{{name}}"?',

  // ─── Celebration ──────────────────────────────────────────────────────────
  celebration_message: '🎉 All items claimed!',
  celebration_dismiss: 'Tap to dismiss',

  // ─── Presence ─────────────────────────────────────────────────────────────
  presence_single: '{{name}} is here',
  presence_multiple: '{{names}} are here',

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile_title: 'Profile',
  profile_edit: 'Edit profile',
  profile_sign_out: 'Sign out',
  profile_sign_out_confirm: 'Are you sure you want to sign out?',
  profile_hosted: 'Hosted',
  profile_joined: 'Joined',
  profile_done: 'Done',
  profile_display_name: 'Display name',
  profile_name_placeholder: 'Your name',
  profile_name_required: 'Please enter a display name.',
  profile_language: 'Language',
  profile_language_restart: 'The app will reload to apply the new language.',

  // ─── Recap ────────────────────────────────────────────────────────────────
  recap_label: 'EVENT RECAP',
  recap_attended: 'Attended',
  recap_items_claimed: 'Items claimed',
  recap_top_contributors: '🏆 Top Contributors',
  recap_who_came: '👥 Who Came',
  recap_share: 'Share Recap',
  recap_mvp: 'MVP',
  recap_share_text: '🎉 {{title}} — Recap\n\n{{oneliner}}\n\n👥 {{attendees}} people attended\n✅ {{claimed}}/{{total}} items claimed ({{pct}}%)\n\nPlanned with Hangout 🎊',

  // ─── My Events ────────────────────────────────────────────────────────────
  my_events_title: 'My Events',
  my_events_search: 'Search events…',
  my_events_tab_all: 'All',
  my_events_tab_active: 'Active',
  my_events_tab_draft: 'Draft',
  my_events_tab_done: 'Done',
  my_events_empty: 'No events here.',

  // ─── Invite ───────────────────────────────────────────────────────────────
  invite_join: 'Join',
  invite_going: 'Going',
  invite_maybe: 'Maybe',
  invite_not_going: "Can't go",
  invite_loading: 'Loading invite…',
  invite_you_are_invited: "You're invited to",
  invite_people_going: '{{count}} going',
  invite_items_to_claim: '{{count}} items to claim',
  invite_sign_in_first: "You'll need to sign in first.",
  invite_im_in: "I'm in!",
  invite_sign_in_to_join: 'Sign in to join',
  invite_maybe_label: "Maybe — I'll let you know",
  invite_maybe_later: 'Maybe later',
  invite_go_home: 'Go home',

  // ─── Event detail extras ──────────────────────────────────────────────────
  detail_your_rsvp: 'Your RSVP',
  detail_copy_list: 'Copy list',
  detail_no_comments: 'No comments yet. Be the first!',
  detail_add_comment: 'Add a comment…',

  // ─── Create event ────────────────────────────────────────────────────────
  create_title_input: "What's the plan?",
  create_title_review: 'Your plan',
  create_placeholder: 'e.g. Beach BBQ for 20 people next Saturday afternoon…',
  create_try_example: 'TRY AN EXAMPLE',
  create_generate_btn: 'Generate plan with AI',
  create_regenerate: 'Regenerate',
  create_edit: 'Edit',
  create_confirm_btn: 'Create event & invite friends',
  create_loading_title: 'Planning your event…',
  create_loading_1: 'Reading your event details…',
  create_loading_2: 'Figuring out what to bring…',
  create_loading_3: 'Building your item list…',
  create_loading_4: 'Almost ready…',
  create_guests: '~{{count}} guests',
  create_items_count: '{{count}} items',

  // ─── Language names ───────────────────────────────────────────────────────
  lang_en: 'English',
  lang_he: 'עברית',
} as const;

export type TranslationKeys = keyof typeof en;
export default en;
