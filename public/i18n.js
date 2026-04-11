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
    next_cleaning_label: "Prochain ménage",
    next_cleaning_nobody: "Aucune famille inscrite pour l'instant.",
    select_family_title: "Qui êtes-vous ?",
    select_family_help:
      "Choisissez votre famille. Ce choix est mémorisé sur cet appareil.",
    search_placeholder: "Rechercher une famille…",
    no_match: "Aucune famille ne correspond.",
    no_family_chosen: "Aucune famille choisie",
    summary_open: (n) => `${n} samedi${n > 1 ? "s" : ""} avec des places libres`,
    summary_remaining: (n) => `${n} place${n > 1 ? "s" : ""} restante${n > 1 ? "s" : ""}`,
    filter_free_only: "Uniquement les samedis libres",
    filter_mine_only: "Uniquement mes créneaux",
    filter_show_past: "Voir les samedis passés",
    families_heading: "Familles",
    tally_heading: "Compteur des familles",
    quota_label: (used, total) => `${used} / ${total}`,
    schedule_heading: "Planning",
    closed_label: "Fermé",
    past_label: "Passé",
    empty_slot: "Place libre",
    add_to_calendar: "Ajouter au calendrier",
    add_to_calendar_title: "Ajouter au calendrier",
    add_to_calendar_help:
      "Télécharge un fichier .ics avec le samedi de ménage et un rappel la veille pour récupérer les clés.",
    download_ics: "Télécharger le fichier",
    ics_summary_cleaning: "Ménage crèche Petit Nemo",
    ics_summary_keys: "Récupérer les clés — ménage Petit Nemo",
    claim_confirm_title: "Prendre ce créneau ?",
    claim_confirm_body: (fam, date) =>
      `Inscrire ${fam} pour le ménage du ${date} ?`,
    pick_family_title: "Choisir une famille",
    pick_family_help:
      "Sélectionnez la famille à affecter à ce créneau (correction admin).",
    quota_info_banner: (fam, used, quota) =>
      `${fam} a atteint ou dépassé son quota (${used}/${quota}). Vous pouvez toujours prendre des créneaux si besoin.`,
    confirm: "Confirmer",
    cancel: "Annuler",
    release_confirm: (fam) => `Libérer le créneau de ${fam} ?`,
    release: "Libérer",
    err_slot_taken: "Ce créneau vient d'être pris.",
    err_saturday_closed: "Ce samedi est fermé.",
    err_saturday_past: "Ce samedi est passé et ne peut plus être modifié.",
    err_family_already_booked:
      "Cette famille a déjà un créneau ce samedi.",
    err_not_your_slot:
      "Vous ne pouvez libérer que les créneaux de votre famille.",
    err_generic: "Une erreur est survenue.",
    no_families: "Aucune famille. L'admin doit en ajouter.",
    empty_no_families_title: "Aucune famille pour l'instant",
    empty_no_families_help:
      "Connectez-vous à l'administration pour ajouter les familles, puis générer le planning des samedis.",
    go_to_admin: "Aller à l'administration",
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
    family_name: "Nom de famille",
    family_phone: "Téléphone",
    family_quota: "Quota",
    family_active: "Active",
    parent1: "Parent 1",
    parent2: "Parent 2",
    parent_name: "Prénom",
    parent_phone: "Téléphone",
    save_all: "Tout enregistrer",
    saving: "Enregistrement…",
    edit: "Modifier",
    save_other_first: (name) =>
      `Veuillez d'abord enregistrer ou annuler les modifications de « ${name} ».`,
    inactive: "Inactive",
    last_modified: "Dernière modification",
    last_modified_never: "Jamais modifié",
    system_info_heading: "Informations système",
    system_info_help:
      "Vérifie la présence des bindings (D1, assets), des secrets (mot de passe familles/admin, clé de cookie) et des tables de la base. Pratique pour diagnostiquer un déploiement cassé.",
    system_info_check: "Vérifier le système",
    import_families: "Importer",
    export_families: "Exporter",
    import_families_help:
      "Choisissez un fichier .json exporté précédemment. Les familles seront ajoutées à la liste existante.",
    import_count: (n) => `${n} famille${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""}.`,
    import_invalid: "Fichier invalide.",
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
    danger_clear_saturdays: "Effacer tous les samedis",
    danger_clear_saturdays_confirm:
      "Supprimer tous les samedis et toutes leurs affectations ? Les familles sont conservées.",
    local_data_heading: "Données locales",
    local_data_help:
      "Préférences enregistrées sur cet appareil uniquement (langue choisie et famille sélectionnée). N'affecte pas les autres utilisateurs.",
    clear_local: "Effacer les données locales",
    clear_local_confirm:
      "Effacer les préférences enregistrées sur cet appareil (langue, famille sélectionnée) ?",
    clear_local_done: "Données locales effacées.",
    overview_export: "Exporter (JSON)",
    print_heading: "Impression / PDF",
    print_help:
      "Choisissez une période puis ouvrez la vue d'impression. Utilisez l'impression du navigateur pour enregistrer en PDF ou imprimer pour afficher à la crèche.",
    print_open: "Ouvrir la vue d'impression",
    print_title: "Planning à imprimer",
    print_now: "Imprimer",
    print_all_range: "Tout le planning",
    print_col_date: "Date",
    print_col_slot1: "Place 1",
    print_col_slot2: "Place 2",
    print_footer_hint:
      "Généré depuis l'appli Ménage Petit Nemo — n'hésitez pas à prévenir l'autre famille par téléphone.",
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
    next_cleaning_label: "Next cleaning",
    next_cleaning_nobody: "No family signed up yet.",
    select_family_title: "Who are you?",
    select_family_help:
      "Pick your family. This choice is remembered on this device.",
    search_placeholder: "Search a family…",
    no_match: "No family matches.",
    no_family_chosen: "No family selected",
    summary_open: (n) => `${n} Saturday${n > 1 ? "s" : ""} with free spots`,
    summary_remaining: (n) => `${n} spot${n > 1 ? "s" : ""} remaining`,
    filter_free_only: "Only Saturdays with free spots",
    filter_mine_only: "Only my slots",
    filter_show_past: "View past Saturdays",
    families_heading: "Families",
    tally_heading: "Family tally",
    quota_label: (used, total) => `${used} / ${total}`,
    schedule_heading: "Schedule",
    closed_label: "Closed",
    past_label: "Past",
    empty_slot: "Free spot",
    add_to_calendar: "Add to calendar",
    add_to_calendar_title: "Add to calendar",
    add_to_calendar_help:
      "Downloads an .ics file with the cleaning Saturday and a reminder the day before to pick up the keys.",
    download_ics: "Download file",
    ics_summary_cleaning: "Petit Nemo daycare cleaning",
    ics_summary_keys: "Pick up keys — Petit Nemo cleaning",
    claim_confirm_title: "Take this slot?",
    claim_confirm_body: (fam, date) =>
      `Sign ${fam} up for cleaning on ${date}?`,
    pick_family_title: "Pick a family",
    pick_family_help:
      "Select the family to assign to this slot (admin correction).",
    quota_info_banner: (fam, used, quota) =>
      `${fam} has reached or exceeded the quota (${used}/${quota}). You can still take slots if needed.`,
    confirm: "Confirm",
    cancel: "Cancel",
    release_confirm: (fam) => `Release ${fam}'s slot?`,
    release: "Release",
    err_slot_taken: "This slot was just taken.",
    err_saturday_closed: "This Saturday is closed.",
    err_saturday_past: "This Saturday is in the past and can no longer be changed.",
    err_family_already_booked:
      "This family already has a slot on this Saturday.",
    err_not_your_slot:
      "You can only release your own family's slots.",
    err_generic: "Something went wrong.",
    no_families: "No families yet. The admin must add some.",
    empty_no_families_title: "No families yet",
    empty_no_families_help:
      "Sign in to the admin panel to add the families, then generate the Saturdays schedule.",
    go_to_admin: "Go to admin panel",
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
    family_name: "Family name",
    family_phone: "Phone",
    family_quota: "Quota",
    family_active: "Active",
    parent1: "Parent 1",
    parent2: "Parent 2",
    parent_name: "First name",
    parent_phone: "Phone",
    save_all: "Save all",
    saving: "Saving…",
    edit: "Edit",
    save_other_first: (name) =>
      `Please save or cancel the changes to "${name}" first.`,
    inactive: "Inactive",
    last_modified: "Last modified",
    last_modified_never: "Never modified",
    system_info_heading: "System info",
    system_info_help:
      "Checks that bindings (D1, assets) and secrets (family/admin passwords, cookie key) are wired and the DB tables exist. Handy for diagnosing a broken deploy.",
    system_info_check: "Check system",
    import_families: "Import",
    export_families: "Export",
    import_families_help:
      "Pick a .json file exported previously. Families are added to the existing list.",
    import_count: (n) => `${n} famil${n > 1 ? "ies" : "y"} imported.`,
    import_invalid: "Invalid file.",
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
    danger_clear_saturdays: "Clear all Saturdays",
    danger_clear_saturdays_confirm:
      "Delete every Saturday and all their assignments? Families are kept.",
    local_data_heading: "Local data",
    local_data_help:
      "Preferences stored on this device only (chosen language and selected family). Does not affect other users.",
    clear_local: "Clear local data",
    clear_local_confirm:
      "Clear preferences stored on this device (language, selected family)?",
    clear_local_done: "Local data cleared.",
    overview_export: "Export (JSON)",
    print_heading: "Print / PDF",
    print_help:
      "Pick a range then open the print view. Use your browser's Print dialog to save as PDF or to print a copy for the daycare.",
    print_open: "Open print view",
    print_title: "Schedule to print",
    print_now: "Print",
    print_all_range: "Full schedule",
    print_col_date: "Date",
    print_col_slot1: "Slot 1",
    print_col_slot2: "Slot 2",
    print_footer_hint:
      "Generated from the Petit Nemo cleaning app — feel free to call your co-cleaning family in advance.",
  },
};

export function getLang() {
  const saved = localStorage.getItem("mnp_lang");
  if (saved === "fr" || saved === "en") return saved;
  // Default to French — this is a French daycare. The header toggle
  // still lets anyone switch to English explicitly.
  return "fr";
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
