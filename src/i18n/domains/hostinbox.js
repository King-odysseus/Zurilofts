/**
 * hostinbox: the host's guest message inbox (conversation list, thread,
 * reservation panel and the messaging settings menu).
 * See common.js for the file shape.
 *
 * The status table and the day/date helpers sit at module scope, where no
 * translator is in reach, so they return these keys and the components resolve
 * them with t() at the point of rendering.
 */
export const hostinbox = {
  en: {
    hostinbox: {
      // Page shell
      hostWorkspace: 'Host workspace',
      messages: 'Messages',
      todaysSchedule: "Today's schedule",
      tryAgain: 'Try again',

      // Conversation list
      messagingSettings: 'Messaging settings',
      closeMessagingSettings: 'Close messaging settings',
      searchGuestsOrStays: 'Search guests or stays',
      searchGuestConversations: 'Search guest conversations',
      filterConversations: 'Filter conversations',
      filterAll: 'All {count}',
      filterUnread: 'Unread {count}',
      loadingGuestConversations: 'Loading guest conversations',
      unreadBadge: '{count} unread',
      noGuestMessagesYet: 'No guest messages yet',
      nothingMatches: 'Nothing matches',
      noGuestMessagesHint: 'When a guest messages you about a stay, the conversation appears here.',
      nothingMatchesHidden: 'Stays that have already ended are hidden. Turn that off in messaging settings to see them.',
      nothingMatchesHint: 'Try a different name, or clear the filter to see every conversation.',

      // Messaging settings menu
      hideEnded: 'Hide stays that have ended',
      hideEndedHint: 'Keeps the list to guests who are coming or in house.',
      savedReplies: 'Saved replies',
      savedRepliesHint: 'They belong to each listing, alongside its automatic messages.',
      giveFeedback: 'Give feedback',
      giveFeedbackHint: 'Tell us what would make replying faster.',

      // Rows, thread and reservation states
      sentAttachment: 'Sent an attachment',
      noMessagesYet: 'No messages yet',
      yourStay: 'Your stay',
      stay: 'Stay',
      stayConversation: 'Stay conversation',
      unreadMessageOne: '{count} unread message',
      unreadMessageOther: '{count} unread messages',
      today: 'Today',
      yesterday: 'Yesterday',
      datesUnavailable: 'Dates unavailable',
      dateUnavailable: 'Date unavailable',
      statusConfirmed: 'Confirmed',
      statusAwaitingPayment: 'Awaiting payment',
      statusCancelled: 'Cancelled',
      statusDatesConflict: 'Dates conflict',
      statusUnavailable: 'Status unavailable',
      guestOne: '{count} guest',
      guestOther: '{count} guests',
      nightOne: '{count} night',
      nightOther: '{count} nights',

      // Thread
      backToMessages: 'Back to messages',
      reservation: 'Reservation',
      openBooking: 'Open booking',
      showReservation: 'Show reservation',
      loadingMessages: 'Loading messages',
      sayHello: 'Say hello to {name} and share the arrival details.',
      replyToPlaceholder: 'Reply to {name}...',
      replyToGuest: 'Reply to guest',

      // Reservation panel
      closeReservationDetails: 'Close reservation details',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      timeFlexible: 'Time flexible',
      byCheckoutTime: 'By 10:00 EAT',
      guestTotal: 'Guest total',
      yourNotes: 'Your notes',
      addNotePlaceholder: 'Add a note to yourself',
      privateNoteHint: 'Only you see this. It is saved on this device.',

      // Empty thread
      selectConversation: 'Select a conversation',
      selectConversationHint: 'Open a guest conversation to read the thread and reply. Messages about your stays arrive here, not in your travel inbox.',

      // Errors
      loadGuestMessagesFailed: 'Could not load your guest messages.',
      loadConversationFailed: 'Could not load this conversation.',
      sendReplyFailed: 'Could not send your reply. Please try again.',
    },
  },
  sw: {
    hostinbox: {
      // Page shell
      hostWorkspace: 'Eneo la kazi la mkaribishaji',
      messages: 'Ujumbe',
      todaysSchedule: 'Ratiba ya leo',
      tryAgain: 'Jaribu tena',

      // Conversation list
      messagingSettings: 'Mipangilio ya ujumbe',
      closeMessagingSettings: 'Funga mipangilio ya ujumbe',
      searchGuestsOrStays: 'Tafuta wageni au makaazi',
      searchGuestConversations: 'Tafuta mazungumzo ya wageni',
      filterConversations: 'Chuja mazungumzo',
      filterAll: 'Zote {count}',
      filterUnread: 'Haijasomwa {count}',
      loadingGuestConversations: 'Inapakia mazungumzo ya wageni',
      unreadBadge: '{count} haijasomwa',
      noGuestMessagesYet: 'Hakuna ujumbe wa wageni bado',
      nothingMatches: 'Hakuna kinacholingana',
      noGuestMessagesHint: 'Mgeni anapokutumia ujumbe kuhusu makaazi, mazungumzo yanaonekana hapa.',
      nothingMatchesHidden: 'Makaazi yaliyokwisha kwisha yamefichwa. Zima mpangilio huo katika mipangilio ya ujumbe ili kuyaona.',
      nothingMatchesHint: 'Jaribu jina lingine, au ondoa kichujio ili kuona mazungumzo yote.',

      // Messaging settings menu
      hideEnded: 'Ficha makaazi yaliyokwisha kwisha',
      hideEndedHint: 'Huiweka orodha kwa wageni wanaokuja au waliopo ndani.',
      savedReplies: 'Majibu yaliyohifadhiwa',
      savedRepliesHint: 'Ni ya kila tangazo, pamoja na ujumbe wake wa kiotomatiki.',
      giveFeedback: 'Toa maoni',
      giveFeedbackHint: 'Tuambie nini kingefanya kujibu kuwe haraka zaidi.',

      // Rows, thread and reservation states
      sentAttachment: 'Ametuma kiambatisho',
      noMessagesYet: 'Hakuna ujumbe bado',
      yourStay: 'Makaazi yako',
      stay: 'Makaazi',
      stayConversation: 'Mazungumzo ya makaazi',
      unreadMessageOne: 'Ujumbe {count} haujasomwa',
      unreadMessageOther: 'Ujumbe {count} haijasomwa',
      today: 'Leo',
      yesterday: 'Jana',
      datesUnavailable: 'Tarehe hazipatikani',
      dateUnavailable: 'Tarehe haipatikani',
      statusConfirmed: 'Imethibitishwa',
      statusAwaitingPayment: 'Inasubiri malipo',
      statusCancelled: 'Imeghairiwa',
      statusDatesConflict: 'Tarehe zinagongana',
      statusUnavailable: 'Hali haipatikani',
      guestOne: 'Mgeni {count}',
      guestOther: 'Wageni {count}',
      nightOne: 'Usiku {count}',
      nightOther: 'Usiku {count}',

      // Thread
      backToMessages: 'Rudi kwenye ujumbe',
      reservation: 'Uhifadhi',
      openBooking: 'Fungua uhifadhi',
      showReservation: 'Onyesha uhifadhi',
      loadingMessages: 'Inapakia ujumbe',
      sayHello: 'Msalimie {name} na umpe maelezo ya kuwasili.',
      replyToPlaceholder: 'Jibu {name}...',
      replyToGuest: 'Jibu mgeni',

      // Reservation panel
      closeReservationDetails: 'Funga maelezo ya uhifadhi',
      checkIn: 'Kuingia',
      checkOut: 'Kutoka',
      timeFlexible: 'Muda unaweza kubadilika',
      byCheckoutTime: 'Ifikapo 10:00 EAT',
      guestTotal: 'Jumla ya mgeni',
      yourNotes: 'Maelezo yako',
      addNotePlaceholder: 'Ongeza maelezo kwa ajili yako',
      privateNoteHint: 'Ni wewe pekee unayeona haya. Yanahifadhiwa kwenye kifaa hiki.',

      // Empty thread
      selectConversation: 'Chagua mazungumzo',
      selectConversationHint: 'Fungua mazungumzo ya mgeni ili kusoma ujumbe na kujibu. Ujumbe kuhusu makaazi yako huja hapa, si kwenye kikasha chako cha safari.',

      // Errors
      loadGuestMessagesFailed: 'Imeshindwa kupakia ujumbe wako wa wageni.',
      loadConversationFailed: 'Imeshindwa kupakia mazungumzo haya.',
      sendReplyFailed: 'Imeshindwa kutuma jibu lako. Tafadhali jaribu tena.',
    },
  },
};
