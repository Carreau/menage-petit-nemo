// Bilingual (FR default, EN toggle). All UI strings live here.

export const STRINGS = {
  fr: {
    app_title: "Ménage Petit Nemo",
    app_subtitle: "Planning du ménage des samedis",
    lang_toggle: "EN",
    login_title: "Accès au planning",
    login_help: "Demandez le mot de passe à l'accueil de la crèche.",
    login_placeholder: "Mot de passe",
    login_button: "Entrer",
    login_error: "Mot de passe incorrect.",
    login_throttled: "Trop de tentatives. Réessayez dans quelques minutes.",
    logout: "Déconnexion",
    admin_link: "Admin",
    tally_link: "Compteur",
    schedule_link: "Planning",
    you_are: "Vous :",
    change_family: "Changer",
    select_family_title: "Qui êtes-vous ?",
    select_family_help:
      "Choisissez votre famille. Ce choix est mémorisé sur cet appareil.",
    no_family_chosen: "Aucune famille choisie",
    summary_open: (n) => `${n} samedi${n > 1 ? "s" : ""} avec des places libres`,
    summary_remaining: (n) => `${n} place${n > 1 ? "s" : ""} restante${n > 1 ? "s" : ""}`,
    filter_free_only: "Uniquement les samedis libres",
    families_heading: "Familles",
    tally_heading: "Compteur des familles",
    quota_label: (used, total) => `${used} / ${total}`,
    schedule_heading: "Planning",
    closed_label: "Fermé",
    past_label: "Passé",
    empty_slot: "Place libre",
    claim_confirm_title: "Prendre ce créneau ?",
    claim_confirm_body: (fam, date) =>
      `Inscrire ${fam} pour le ménage du ${date} ?`,
    quota_full_banner: (fam) =>
      `${fam} a déjà atteint son quota pour cette saison.`,
    confirm: "Confirmer",
    cancel: "Annuler",
    release_confirm: (fam) => `Libérer le créneau de ${fam} ?`,
    release: "Libérer",
    err_slot_taken: "Ce créneau vient d'être pris.",
    err_quota_reached: "Cette famille a atteint son quota.",
    err_saturday_closed: "Ce samedi est fermé.",
    err_saturday_past: "Ce samedi est passé et ne peut plus être modifié.",
    err_generic: "Une erreur est survenue.",
    no_families: "Aucune famille. L'admin doit en ajouter.",
    no_saturdays: "Aucun samedi. L'admin doit générer le planning.",
    day_names: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
    month_names: [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ],
    // Admin
    admin_title: "Administration",
    admin_login_help: "Mot de passe administrateur",
    tab_families: "Familles",
    tab_saturdays: "Samedis",
    tab_overview: "Aperçu",
    tab_danger: "Saison",
    add_family: "Ajouter une famille",
    family_name: "Nom",
    family_quota: "Quota",
    family_active: "Active",
    save: "Enregistrer",
    delete: "Supprimer",
    confirm_delete_family: (n) => `Supprimer la famille « ${n} » et toutes ses affectations ?`,
    generate_saturdays: "Générer les samedis",
    start_date: "Date de début",
    end_date: "Date de fin",
    skip_dates: "Dates à ignorer (une par ligne, YYYY-MM-DD)",
    generate: "Générer",
    generated_count: (n) => `${n} samedi${n > 1 ? "s" : ""} créé${n > 1 ? "s" : ""}.`,
    mark_closed: "Fermé",
    note_placeholder: "Note (optionnelle)",
    confirm_delete_saturday: (d) => `Supprimer le samedi ${d} ?`,
    danger_reset: "Réinitialiser toutes les affectations",
    danger_reset_confirm:
      "Effacer toutes les affectations (familles et samedis conservés) ?",
    overview_export: "Exporter (JSON)",
  },
  en: {
    app_title: "Petit Nemo Cleaning",
    app_subtitle: "Saturday cleaning schedule",
    lang_toggle: "FR",
    login_title: "Schedule access",
    login_help: "Ask the daycare reception for the password.",
    login_placeholder: "Password",
    login_button: "Enter",
    login_error: "Wrong password.",
    login_throttled: "Too many attempts. Try again in a few minutes.",
    logout: "Log out",
    admin_link: "Admin",
    tally_link: "Tally",
    schedule_link: "Schedule",
    you_are: "You:",
    change_family: "Change",
    select_family_title: "Who are you?",
    select_family_help:
      "Pick your family. This choice is remembered on this device.",
    no_family_chosen: "No family selected",
    summary_open: (n) => `${n} Saturday${n > 1 ? "s" : ""} with free spots`,
    summary_remaining: (n) => `${n} spot${n > 1 ? "s" : ""} remaining`,
    filter_free_only: "Only Saturdays with free spots",
    families_heading: "Families",
    tally_heading: "Family tally",
    quota_label: (used, total) => `${used} / ${total}`,
    schedule_heading: "Schedule",
    closed_label: "Closed",
    past_label: "Past",
    empty_slot: "Free spot",
    claim_confirm_title: "Take this slot?",
    claim_confirm_body: (fam, date) =>
      `Sign ${fam} up for cleaning on ${date}?`,
    quota_full_banner: (fam) =>
      `${fam} has already reached this season's quota.`,
    confirm: "Confirm",
    cancel: "Cancel",
    release_confirm: (fam) => `Release ${fam}'s slot?`,
    release: "Release",
    err_slot_taken: "This slot was just taken.",
    err_quota_reached: "This family has reached its quota.",
    err_saturday_closed: "This Saturday is closed.",
    err_saturday_past: "This Saturday is in the past and can no longer be changed.",
    err_generic: "Something went wrong.",
    no_families: "No families yet. The admin must add some.",
    no_saturdays: "No Saturdays yet. The admin must generate the schedule.",
    day_names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    month_names: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    admin_title: "Administration",
    admin_login_help: "Admin password",
    tab_families: "Families",
    tab_saturdays: "Saturdays",
    tab_overview: "Overview",
    tab_danger: "Season",
    add_family: "Add a family",
    family_name: "Name",
    family_quota: "Quota",
    family_active: "Active",
    save: "Save",
    delete: "Delete",
    confirm_delete_family: (n) => `Delete family "${n}" and all its assignments?`,
    generate_saturdays: "Generate Saturdays",
    start_date: "Start date",
    end_date: "End date",
    skip_dates: "Dates to skip (one per line, YYYY-MM-DD)",
    generate: "Generate",
    generated_count: (n) => `${n} Saturday${n > 1 ? "s" : ""} created.`,
    mark_closed: "Closed",
    note_placeholder: "Note (optional)",
    confirm_delete_saturday: (d) => `Delete Saturday ${d}?`,
    danger_reset: "Reset all assignments",
    danger_reset_confirm:
      "Erase every assignment (families and Saturdays are kept)?",
    overview_export: "Export (JSON)",
  },
};

export function getLang() {
  const saved = localStorage.getItem("mnp_lang");
  if (saved === "fr" || saved === "en") return saved;
  const nav = (navigator.language || "fr").toLowerCase();
  return nav.startsWith("en") ? "en" : "fr";
}

export function setLang(l) {
  localStorage.setItem("mnp_lang", l);
}

export function t(key, ...args) {
  const dict = STRINGS[getLang()] || STRINGS.fr;
  const v = dict[key];
  if (typeof v === "function") return v(...args);
  return v ?? key;
}

export function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const dict = STRINGS[getLang()] || STRINGS.fr;
  const day = dict.day_names[d.getDay()];
  const month = dict.month_names[d.getMonth()];
  return `${day} ${d.getDate()} ${month} ${d.getFullYear()}`;
}
