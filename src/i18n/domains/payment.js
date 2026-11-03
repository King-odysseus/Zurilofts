/**
 * payment: the screen a guest lands on after the payment provider sends them
 * back, plus its four states (checking, confirmed, pending, failed).
 *
 * The verification failure wording is here too, because those sentences are
 * shown to the guest inside the failed and pending states rather than logged.
 * Text that comes from the server (a provider message, a status token) stays
 * as it arrives and is never passed through this dictionary.
 */
export const payment = {
  en: {
    payment: {
      back: 'Back',
      statusEyebrow: 'PAYMENT STATUS',
      confirmationTitle: 'Your stay confirmation',
      confirmationBody: 'We verify every payment securely before confirming a reservation.',

      confirmingTitle: 'Confirming payment',
      confirmingBody: 'This usually takes a few seconds. Keep this page open while we finish.',
      progressLabel: 'Payment verification progress',
      stepRequestReceived: 'Request received',
      stepCheckingProvider: 'Checking with the payment provider',
      stepConfirmingStay: 'Confirming your stay',
      dontCloseNote: "Don't close this window while we finish.",
      cancel: 'Cancel',

      successTitle: 'Payment successful',
      successBody: 'Your stay is confirmed. Your booking details are below.',
      reference: 'Reference',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      totalPaid: 'Total paid',
      saved: 'Saved',
      save: 'Save',
      home: 'Home',
      addToCalendar: 'Add to calendar',
      googleCalendar: 'Google Calendar',
      viewProperty: 'View property',

      pendingTitle: 'Payment pending',
      pendingBody: 'The payment provider is still confirming this transaction. We are holding your booking while it clears.',
      verificationInProgress: 'Verification in progress',
      pendingNote: "We'll update your trip as soon as the payment clears.",
      checkTripStatus: 'Check trip status',
      backToHome: 'Back to home',

      failedTitle: 'Payment failed',
      failedBody: 'No confirmed booking or charge was recorded for this payment attempt.',
      notCompleted: 'Payment not completed',
      reviewPaymentMethod: 'Please review your payment method and try again.',
      tryAgain: 'Try again',
      contactSupport: 'Need help? Contact support',

      conflictTitle: 'Payment received, stay not confirmed',
      conflictBody: 'We received your payment, but the dates were taken by another booking before this one completed, so this stay is not confirmed.',
      conflictNote: 'Our team will contact you to arrange different dates or refund you. You have not been charged twice.',

      missingReferenceError: 'No payment reference was found. Please return to your trip and try again.',
      missingReferenceLabel: 'Missing payment reference',
      verificationIncompleteError: 'Payment verification did not complete. Please review your trip before trying again.',
      providerStatusLabel: 'Provider status: {status}',
      verificationNotCompleted: 'Verification not completed',
      verifyError: 'Unable to verify the payment right now. If you completed payment, it will be confirmed shortly.',
      verificationOngoing: 'Verification is still in progress',
      couldNotVerify: 'Payment could not be verified',
    },
  },
  sw: {
    payment: {
      back: 'Rudi',
      statusEyebrow: 'HALI YA MALIPO',
      confirmationTitle: 'Uthibitisho wa makaazi yako',
      confirmationBody: 'Tunakagua kila malipo kwa usalama kabla ya kuthibitisha uhifadhi.',

      confirmingTitle: 'Inathibitisha malipo',
      confirmingBody: 'Hii kwa kawaida huchukua sekunde chache. Endelea kuwa kwenye ukurasa huu hadi tumalize.',
      progressLabel: 'Maendeleo ya uthibitisho wa malipo',
      stepRequestReceived: 'Ombi limepokelewa',
      stepCheckingProvider: 'Inakagua na mtoa huduma wa malipo',
      stepConfirmingStay: 'Inathibitisha makaazi yako',
      dontCloseNote: 'Usifunge dirisha hili hadi tumalize.',
      cancel: 'Ghairi',

      successTitle: 'Malipo yamefanikiwa',
      successBody: 'Makaazi yako yamethibitishwa. Maelezo ya uhifadhi wako yako hapa chini.',
      reference: 'Namba ya kumbukumbu',
      checkIn: 'Kuingia',
      checkOut: 'Kutoka',
      totalPaid: 'Jumla iliyolipwa',
      saved: 'Imehifadhiwa',
      save: 'Hifadhi',
      home: 'Nyumbani',
      addToCalendar: 'Ongeza kwenye kalenda',
      googleCalendar: 'Kalenda ya Google',
      viewProperty: 'Tazama mali',

      pendingTitle: 'Malipo yanasubiri',
      pendingBody: 'Mtoa huduma wa malipo bado anathibitisha muamala huu. Tunashikilia uhifadhi wako hadi malipo yakamilike.',
      verificationInProgress: 'Uthibitisho unaendelea',
      pendingNote: 'Tutabadilisha hali ya safari yako mara malipo yakamilikapo.',
      checkTripStatus: 'Angalia hali ya safari',
      backToHome: 'Rudi nyumbani',

      failedTitle: 'Malipo imeshindikana',
      failedBody: 'Hakuna uhifadhi uliothibitishwa au malipo yaliyorekodiwa kwa jaribio hili la malipo.',
      notCompleted: 'Malipo hayakukamilika',
      reviewPaymentMethod: 'Tafadhali kagua njia yako ya malipo na ujaribu tena.',
      tryAgain: 'Jaribu tena',
      contactSupport: 'Unahitaji msaada? Wasiliana na huduma kwa wateja',

      conflictTitle: 'Malipo yamepokelewa, uhifadhi haujathibitishwa',
      conflictBody: 'Tumepokea malipo yako, lakini tarehe hizo zilichukuliwa na uhifadhi mwingine kabla huu kukamilika, kwa hivyo uhifadhi huu haujathibitishwa.',
      conflictNote: 'Timu yetu itawasiliana nawe ili kupanga tarehe nyingine au kukurudishia fedha. Hujatozwa mara mbili.',

      missingReferenceError: 'Hakuna kumbukumbu ya malipo iliyopatikana. Tafadhali rudi kwenye safari yako na ujaribu tena.',
      missingReferenceLabel: 'Kumbukumbu ya malipo haipo',
      verificationIncompleteError: 'Uthibitisho wa malipo haukukamilika. Tafadhali kagua safari yako kabla ya kujaribu tena.',
      providerStatusLabel: 'Hali ya mtoa huduma: {status}',
      verificationNotCompleted: 'Uthibitisho haukukamilika',
      verifyError: 'Hatuwezi kuthibitisha malipo kwa sasa. Ikiwa ulikamilisha malipo, yatathibitishwa hivi karibuni.',
      verificationOngoing: 'Uthibitisho bado unaendelea',
      couldNotVerify: 'Malipo hayakuweza kuthibitishwa',
    },
  },
};
