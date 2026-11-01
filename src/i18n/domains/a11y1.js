/**
 * a11y1: the text a screen reader hears.
 *
 * aria-labels, placeholders, tooltips and sr-only text never appear in a
 * screenshot, so they are easy to leave in English and quietly make a page
 * unusable in Swahili. They live in their own dictionary because they belong to
 * one component each rather than to a screen, and because the wording has to be
 * short: a label is announced before every control it names.
 *
 * Placeholders keep their {curly} names in both languages, so a caller can pass
 * a value without knowing the sentence around it.
 */
export const a11y1 = {
  en: {
    a11y1: {
      // Search and discovery
      search: 'Search',
      clearSearch: 'Clear search',
      searchDestinations: 'Search destinations or neighbourhoods',
      chooseDates: 'Choose dates',
      chooseGuests: 'Choose guests',
      decreaseGuests: 'Decrease guests',
      increaseGuests: 'Increase guests',

      // Calendar
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      unavailableSuffix: ', unavailable',
      selectedDates: 'Selected dates',
      clearSelectedDates: 'Clear selected dates',
      availabilitySelectedNights: 'Availability for the selected nights',
      blockNights: 'Block the selected nights',
      openNights: 'Open the selected nights',

      // Check-in and checkout fields
      chooseHowGuestsGetIn: 'Choose how guests get in',
      checkInMethod: 'Check-in method',
      checkInWindowStart: 'Check-in window start time',
      checkInWindowEnd: 'Check-in window end time',
      checkOutTime: 'Checkout time',
      selectTime: 'Select a time',

      // Messages
      message: 'Message',
      messages: 'Messages',
      writeMessage: 'Write a message',
      sendMessage: 'Send message',
      sendingMessage: 'Sending message',
      addAttachmentOrSavedReply: 'Add an attachment or a saved reply',
      removeAttachment: 'Remove {name}',

      // Navigation and page furniture
      primaryNav: 'Primary',
      goBack: 'Go back',
      goBackToPreviousPage: 'Go back to the previous page',
      close: 'Close',
      tableOfContents: 'Table of contents',
    },
  },
  sw: {
    a11y1: {
      // Search and discovery
      search: 'Tafuta',
      clearSearch: 'Ondoa utafutaji',
      searchDestinations: 'Tafuta maeneo au mitaa',
      chooseDates: 'Chagua tarehe',
      chooseGuests: 'Chagua wageni',
      decreaseGuests: 'Punguza wageni',
      increaseGuests: 'Ongeza wageni',

      // Calendar
      previousMonth: 'Mwezi uliotangulia',
      nextMonth: 'Mwezi unaofuata',
      unavailableSuffix: ', haipatikani',
      selectedDates: 'Tarehe zilizochaguliwa',
      clearSelectedDates: 'Ondoa tarehe zilizochaguliwa',
      availabilitySelectedNights: 'Upatikanaji kwa usiku uliochaguliwa',
      blockNights: 'Zuia usiku uliochaguliwa',
      openNights: 'Fungua usiku uliochaguliwa',

      // Check-in and checkout fields
      chooseHowGuestsGetIn: 'Chagua jinsi wageni wanaingia',
      checkInMethod: 'Njia ya kuingia',
      checkInWindowStart: 'Muda wa kuanza kuingia',
      checkInWindowEnd: 'Muda wa mwisho wa kuingia',
      checkOutTime: 'Muda wa kutoka',
      selectTime: 'Chagua muda',

      // Messages
      message: 'Ujumbe',
      messages: 'Ujumbe',
      writeMessage: 'Andika ujumbe',
      sendMessage: 'Tuma ujumbe',
      sendingMessage: 'Inatuma ujumbe',
      addAttachmentOrSavedReply: 'Ambatisha faili au jibu lililohifadhiwa',
      removeAttachment: 'Ondoa {name}',

      // Navigation and page furniture
      primaryNav: 'Mkuu',
      goBack: 'Rudi nyuma',
      goBackToPreviousPage: 'Rudi kwenye ukurasa uliotangulia',
      close: 'Funga',
      tableOfContents: 'Jedwali la yaliyomo',
    },
  },
};
