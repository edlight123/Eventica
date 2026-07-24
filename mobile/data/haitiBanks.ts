/**
 * Haiti's licensed commercial banks — used to populate the payout-settings bank
 * picker so organizers select a canonical bank name instead of free-typing one.
 * The trailing `'Other'` sentinel lets an organizer type a bank not in the list.
 */
export const HAITI_BANKS: string[] = [
  'Unibank',
  'Sogebank',
  'Banque Nationale de Crédit (BNC)',
  'Capital Bank',
  'Banque de l’Union Haïtienne (BUH)',
  'Banque Populaire Haïtienne (BPH)',
  'Citibank Haiti',
  'Fonkoze',
  'Micro Crédit National (MCN)',
  'Other',
];

/** The sentinel option that reveals a free-text field for an unlisted bank. */
export const OTHER_BANK = 'Other';

export default HAITI_BANKS;
