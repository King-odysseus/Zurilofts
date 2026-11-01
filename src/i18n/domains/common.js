/**
 * Shared vocabulary.
 *
 * These are the words that repeat on nearly every screen (Save, Cancel,
 * Loading, Try again) plus the small grammar the app builds sentences from
 * ("3 nights", "2 guests"). Page-specific copy lives in its own domain file;
 * anything used on three or more pages belongs here so a translator only
 * changes it once.
 *
 * Placeholders are written as {name} and filled by the second argument to the translate function.
 * Kiswahili does not inflect nouns for number the way English does, so the
 * _one / _other pairs exist for the English side; the Swahili side often uses
 * the same word for both, which is correct rather than lazy.
 */
export const common = {
  en: {
    trust: {
      loadingVerification: 'Loading verification...',
      verifyYourIdentity: 'Verify your identity',
      verifyHintStandalone: 'Complete the required details securely to verify your identity.',
      verifyHintBooking: 'Complete the required details securely to continue your booking.',
      verificationProgress: 'Identity verification progress',
      verificationUnderReview: 'Your verification is being reviewed. We will notify you when it is complete.',
      verificationComplete: 'You are verified. You can complete payment on any pending booking.',
      tellUsAboutYourself: 'Tell us about yourself',
      identityUseOnly: 'Your information is used only for identity verification.',
      legalName: 'Legal name',
      legalNamePlaceholder: 'As shown on your ID',
      dateOfBirth: 'Date of birth',
      identityDocument: 'Identity document',
      documentNumber: 'Document number',
      documentsEncrypted: 'Your documents are encrypted and reviewed securely.',
      continueToDocuments: 'Continue to documents',
      payoutsNeedVerification: 'Payouts need a verified identity',
      bookingIsHeld: 'Your booking is held',
      payoutHeldHint: 'Your payout stays on hold until the review approves your documents.',
      returnToPayment: 'Return to payment after your identity has been approved.',
      documents: 'Documents',
      documentsHint: 'Upload clear photos or PDF files. Each file can be up to 8MB.',
      required: 'Required',
      review: 'Review',
      reviewHint: 'Check your details and required documents before submitting.',
      submitForReview: 'Submit for review',
      returnToTrips: 'Return to trips',
      submittedInfoShown: 'Your submitted information is shown above.',
      noEligibleBooking: 'No eligible booking',
      disputeNeedsBooking: 'A dispute can be opened after a booking exists on your account.',
      goToTrips: 'Go to trips',
      startWithBooking: 'Start with the booking',
      disputeStaysTogether: 'Your report and booking history stay together for the resolution team.',
      booking: 'Booking',
      issueCategory: 'Issue category',
      whatHappened: 'What happened?',
      describeIssuePlaceholder: 'Describe the issue and what outcome you need.',
      disputeSharedWith: 'We share this only with the booking participants and ZuriLofts resolution team.',
      loadingReports: 'Loading your reports...',
      reportAnIssue: 'Report an issue',
      issueSummary: 'Issue summary',
      evidence: 'Evidence',
      noEvidenceYet: 'No evidence has been added yet.',
      addEvidence: 'Add evidence',
      disputePrivacy: 'Your information is shared only with participants and the ZuriLofts resolution team.',
      resolutionThread: 'Resolution thread',
      messagesAndEvents: 'Messages and recorded status events',
      disputeClosed: 'This dispute is closed. The recorded resolution remains available above.',
      addMessageLabel: 'Add a message to this dispute',
      addMessagePlaceholder: 'Add a message to this dispute...',
      send: 'Send',
      categoryProperty: 'Property condition',
      categoryPayment: 'Payment',
      categoryConduct: 'Conduct',
      categoryCancellation: 'Cancellation',
      categoryOther: 'Other',
      statusOpenAwaiting: 'Open - awaiting review',
      statusUnderReview: 'Under review',
      statusResolved: 'Resolved',
      eventOpened: 'Dispute opened',
      eventEvidence: 'Evidence submitted',
      eventStatus: 'Status updated',
      eventResolved: 'Dispute resolved',
      eventDismissed: 'Dispute dismissed',
      eventNote: 'Internal review recorded',
      recoveryCheckingTitle: 'Checking payment',
      recoveryCheckingCopy: 'We are confirming your payment securely. Keep this page open.',
      recoveryPendingTitle: 'Payment pending',
      recoveryPendingCopy: 'Your provider is still processing the payment. You will not be charged again.',
      recoveryFailedTitle: 'Payment was not completed',
      recoveryFailedCopy: 'No booking is confirmed until the provider verifies payment.',
      openDisputeOne: 'Open dispute',
      openDisputeOther: 'Open disputes',
      bookingHeldOne: 'Booking held',
      bookingHeldOther: 'Bookings held',
      firstResponseTarget: 'First response target',
      trustLoadFailed: 'Trust and recovery data could not be loaded.',
      guestFallback: 'Guest',
      idNational: 'National ID',
      idPassport: 'Passport',
      idAlien: 'Alien ID',
      statusNotVerified: 'Not verified',
      statusVerified: 'Verified',
      secureUpload: 'Secure upload',
      docIdFront: 'ID / Passport (front)',
      docIdBack: 'ID (back)',
      docSelfie: 'Selfie holding your ID',
      notUploadedYet: 'Not uploaded yet',
      uploadedEncrypted: 'Uploaded and encrypted',
      verifyLoadFailed: 'Could not load your verification details.',
      detailsSaved: 'Details saved.',
      detailsSaveFailed: 'Could not save your details.',
      documentUploaded: 'Document uploaded.',
      documentUploadFailed: 'Could not upload this document.',
      // The selfie tile opens the camera, so its copy is about taking a photo
      // rather than choosing one. The dialog takes every visible string from
      // here, which is why the camera labels sit beside the document ones.
      takePhoto: 'Take photo',
      retakePhoto: 'Retake photo',
      uploadInstead: 'Upload a file instead',
      dropToUpload: 'Drop the file to upload it',
      cameraTitleId: 'Photograph your ID',
      cameraHintId: 'Lay the card flat in good light and fill the frame with it. The photo is encrypted when you take it.',
      fileWrongType: 'ZuriLofts accepts a JPEG, PNG or WebP photo, or a PDF.',
      fileTooLarge: 'That file is over 8MB. Choose a smaller one.',
      cameraTitle: 'Take your selfie',
      cameraHint: 'Hold your ID beside your face and keep your whole face in the frame. The photo is encrypted when you take it.',
      cameraStarting: 'Starting the camera',
      cameraCapture: 'Take photo',
      cameraDenied: 'ZuriLofts could not reach your camera. Allow camera access in your browser, or upload a photo you already have.',
      cameraUnsupported: 'This browser cannot open the camera here. It needs a secure (https) connection, or you can upload a photo instead.',
      submittedForReview: 'Submitted for review. This usually takes less than a day.',
      completeRequiredFirst: 'Complete the required fields and documents before submitting.',
      fileFallback: 'File',
      needHelp: 'Need help?',
      openMenu: 'Open menu',
      dismissNotification: 'Dismiss notification',
      switchToDarkMode: 'Switch to dark mode',
      switchToLightMode: 'Switch to light mode',
      backToListings: 'Back to your listings',
      listingSettings: 'Listing settings',
      editorSections: 'Listing editor sections',
      closeMenu: 'Close menu',
      openAccountMenu: 'Open account menu',
      toggleNavigation: 'Toggle navigation menu',
      searchDestination: 'Search destination',
      accountAndNavigation: 'Account and navigation menu',
      justNow: 'Just now',
      evidenceOpenFailed: 'Could not open this evidence',
      describeMinChars: 'Describe the issue in at least 10 characters.',
      disputeOpenFailed: 'Could not open this dispute',
      stayBooking: 'Stay booking',
      messageSent: 'Message sent.',
      messageSendFailed: 'Could not send this message',
      evidenceUploaded: 'Evidence uploaded.',
      evidenceUploadFailed: 'Could not upload this evidence',
      selectDispute: 'Select dispute',
      eventDisputeUpdated: 'Dispute updated',
    },
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
    misc: {
      shortlistUnavailable: 'Shortlist unavailable',
      sharedShortlist: 'Shared shortlist',
      signInToSave: 'Sign in to save this shortlist to your account and keep it in sync across devices.',
      signIn: 'Sign in',
      noStaysInShortlist: 'No stays in this shortlist',
      shortlistSharedEmpty: 'This collection has been shared, but no properties have been added yet.',
      trustEyebrow: 'TRUST AND RECOVERY',
      trustTitle: 'Keep your account safe',
      trustDescription: 'Identity verification, dispute resolution and payment recovery in one place.',
      trustOverview: 'Trust and recovery overview',
      trustSections: 'Trust sections',
      identityVerification: 'Identity verification',
      paymentRecovery: 'Payment recovery',
      security: 'Security',
      logOut: 'Log out',
      paymentRecoveryHint: 'What guests see if a payment is interrupted.',
      secureProviderCheck: 'Secure provider check',
      reviewBooking: 'Review booking',
      tryPaymentAgain: 'Try payment again',
      returnToBooking: 'Return to booking',
      checkingBookingState: 'Checking your booking state...',
    },

    common: {
      save: 'Save',
      saveChanges: 'Save changes',
      saveDraft: 'Save draft',
      saving: 'Saving...',
      cancel: 'Cancel',
      close: 'Close',
      next: 'Next',
      back: 'Back',
      continue: 'Continue',
      confirm: 'Confirm',
      submit: 'Submit',
      submitting: 'Submitting...',
      retry: 'Try again',
      refresh: 'Refresh',
      loading: 'Loading...',
      search: 'Search',
      clear: 'Clear',
      apply: 'Apply',
      edit: 'Edit',
      delete: 'Delete',
      remove: 'Remove',
      add: 'Add',
      view: 'View',
      viewAll: 'View all',
      seeAll: 'See all',
      viewDetails: 'View details',
      optional: 'Optional',
      required: 'Required',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      none_yet: 'Nothing here yet',
      of: 'of',
      and: 'and',
      from: 'From',
      to: 'To',
      show: 'Show',
      hide: 'Hide',
      more: 'More',
      less: 'Less',
      done: 'Done',
      working: 'Working...',
      dismiss: 'Dismiss',
      // Counting. English needs a singular and a plural; Swahili uses one form.
      guest_one: '{count} guest',
      guest_other: '{count} guests',
      night_one: '{count} night',
      night_other: '{count} nights',
      bedroom_one: '{count} bedroom',
      bedroom_other: '{count} bedrooms',
      bathroom_one: '{count} bathroom',
      bathroom_other: '{count} bathrooms',
      review_one: '{count} review',
      review_other: '{count} reviews',
      booking_one: '{count} booking',
      booking_other: '{count} bookings',
      night: 'night',
      nights: 'nights',
      perNight: 'per night',
      total: 'Total',
      subtotal: 'Subtotal',
      email: 'Email address',
      phone: 'Phone number',
      password: 'Password',
      name: 'Name',
      guest: 'Guest',
      typeToConfirm: 'Type',
      firstName: 'First name',
      lastName: 'Last name',
      date: 'Date',
      status: 'Status',
      actions: 'Actions',
      details: 'Details',
      notes: 'Notes',
      // Failure copy. Every failed request says what failed and what to do,
      // never a bare "error", so these are the defaults pages reuse.
      couldNotLoad: 'That could not be loaded.',
      couldNotSave: 'That could not be saved.',
      checkConnection: 'Check your connection and try again.',
      signInRequired: 'Sign in to continue.',
      somethingWentWrong: 'Something went wrong.',
    },
    mobileNav: {
      home: 'Home',
      saved: 'Saved',
      trips: 'Trips',
      inbox: 'Inbox',
      profile: 'Profile',
      today: 'Today',
      calendar: 'Calendar',
      listings: 'Listings',
      earnings: 'Earnings',
    },
    listingStatus: {
      draft: 'Draft',
      inReview: 'In review',
      published: 'Published',
      needsChanges: 'Needs changes',
      suspended: 'Suspended',
      copyPublished: 'Visible to guests and open for bookings.',
      copyInReview: 'Submitted for review. Changes stay private until it is approved.',
      copyRejected: 'Update the requested details before submitting again.',
      copySuspended: 'Hidden from guests while it is suspended.',
      copyDraft: 'Add the details, photos and pricing, then submit for review.',
    },
  },
  sw: {
    trust: {
      loadingVerification: 'Inapakia uthibitishaji...',
      verifyYourIdentity: 'Thibitisha utambulisho wako',
      verifyHintStandalone: 'Kamilisha maelezo yanayohitajika kwa usalama ili kuthibitisha utambulisho wako.',
      verifyHintBooking: 'Kamilisha maelezo yanayohitajika kwa usalama ili kuendelea na uhifadhi wako.',
      verificationProgress: 'Hatua za uthibitishaji wa utambulisho',
      verificationUnderReview: 'Uthibitishaji wako unakaguliwa. Tutakujulisha utakapokamilika.',
      verificationComplete: 'Umethibitishwa. Unaweza kukamilisha malipo ya uhifadhi wowote unaosubiri.',
      tellUsAboutYourself: 'Tueleze kuhusu wewe',
      identityUseOnly: 'Taarifa zako hutumika kwa uthibitishaji wa utambulisho pekee.',
      legalName: 'Jina la kisheria',
      legalNamePlaceholder: 'Kama ilivyo kwenye kitambulisho chako',
      dateOfBirth: 'Tarehe ya kuzaliwa',
      identityDocument: 'Kitambulisho',
      documentNumber: 'Namba ya kitambulisho',
      documentsEncrypted: 'Nyaraka zako zimesimbwa na hukaguliwa kwa usalama.',
      continueToDocuments: 'Endelea kwenye nyaraka',
      payoutsNeedVerification: 'Malipo yanahitaji utambulisho uliothibitishwa',
      bookingIsHeld: 'Uhifadhi wako umezuiliwa',
      payoutHeldHint: 'Malipo yako yanabaki yamezuiliwa hadi ukaguzi uidhinishe nyaraka zako.',
      returnToPayment: 'Rudi kwenye malipo baada ya utambulisho wako kuidhinishwa.',
      documents: 'Nyaraka',
      documentsHint: 'Pakia picha zilizo wazi au faili za PDF. Kila faili inaweza kufikia 8MB.',
      required: 'Inahitajika',
      review: 'Kagua',
      reviewHint: 'Angalia maelezo yako na nyaraka zinazohitajika kabla ya kuwasilisha.',
      submitForReview: 'Wasilisha kwa ukaguzi',
      returnToTrips: 'Rudi kwenye safari',
      submittedInfoShown: 'Taarifa ulizowasilisha zinaonekana hapo juu.',
      noEligibleBooking: 'Hakuna uhifadhi unaostahili',
      disputeNeedsBooking: 'Mgogoro unaweza kufunguliwa baada ya kuwa na uhifadhi kwenye akaunti yako.',
      goToTrips: 'Nenda kwenye safari',
      startWithBooking: 'Anza na uhifadhi',
      disputeStaysTogether: 'Ripoti yako na historia ya uhifadhi hubaki pamoja kwa timu ya utatuzi.',
      booking: 'Uhifadhi',
      issueCategory: 'Aina ya tatizo',
      whatHappened: 'Nini kilitokea?',
      describeIssuePlaceholder: 'Eleza tatizo na matokeo unayohitaji.',
      disputeSharedWith: 'Tunashiriki hii tu na washiriki wa uhifadhi na timu ya utatuzi ya ZuriLofts.',
      loadingReports: 'Inapakia ripoti zako...',
      reportAnIssue: 'Ripoti tatizo',
      issueSummary: 'Muhtasari wa tatizo',
      evidence: 'Ushahidi',
      noEvidenceYet: 'Hakuna ushahidi ulioongezwa bado.',
      addEvidence: 'Ongeza ushahidi',
      disputePrivacy: 'Taarifa zako hushirikiwa tu na washiriki na timu ya utatuzi ya ZuriLofts.',
      resolutionThread: 'Mazungumzo ya utatuzi',
      messagesAndEvents: 'Ujumbe na matukio ya hali yaliyorekodiwa',
      disputeClosed: 'Mgogoro huu umefungwa. Utatuzi uliorekodiwa unabaki upatikana hapo juu.',
      addMessageLabel: 'Ongeza ujumbe kwenye mgogoro huu',
      addMessagePlaceholder: 'Ongeza ujumbe kwenye mgogoro huu...',
      send: 'Tuma',
      categoryProperty: 'Hali ya nyumba',
      categoryPayment: 'Malipo',
      categoryConduct: 'Mwenendo',
      categoryCancellation: 'Kughairi',
      categoryOther: 'Nyingine',
      statusOpenAwaiting: 'Wazi - inasubiri ukaguzi',
      statusUnderReview: 'Inakaguliwa',
      statusResolved: 'Imetatuliwa',
      eventOpened: 'Mgogoro umefunguliwa',
      eventEvidence: 'Ushahidi umewasilishwa',
      eventStatus: 'Hali imesasishwa',
      eventResolved: 'Mgogoro umetatuliwa',
      eventDismissed: 'Mgogoro umepuuzwa',
      eventNote: 'Ukaguzi wa ndani umerekodiwa',
      recoveryCheckingTitle: 'Inakagua malipo',
      recoveryCheckingCopy: 'Tunathibitisha malipo yako kwa usalama. Weka ukurasa huu wazi.',
      recoveryPendingTitle: 'Malipo yanasubiri',
      recoveryPendingCopy: 'Mtoa huduma wako bado anachakata malipo. Hutatozwa tena.',
      recoveryFailedTitle: 'Malipo hayakukamilika',
      recoveryFailedCopy: 'Hakuna uhifadhi unaothibitishwa hadi mtoa huduma athibitishe malipo.',
      openDisputeOne: 'Mgogoro wazi',
      openDisputeOther: 'Migogoro wazi',
      bookingHeldOne: 'Uhifadhi uliozuiliwa',
      bookingHeldOther: 'Uhifadhi uliozuiliwa',
      firstResponseTarget: 'Lengo la jibu la kwanza',
      trustLoadFailed: 'Data ya uaminifu na urejeshaji haikuweza kupakiwa.',
      guestFallback: 'Mgeni',
      idNational: 'Kitambulisho cha kitaifa',
      idPassport: 'Pasipoti',
      idAlien: 'Kitambulisho cha mgeni',
      statusNotVerified: 'Haijathibitishwa',
      statusVerified: 'Imethibitishwa',
      secureUpload: 'Upakiaji salama',
      docIdFront: 'Kitambulisho / Pasipoti (mbele)',
      docIdBack: 'Kitambulisho (nyuma)',
      docSelfie: 'Selfie ukiwa na kitambulisho chako',
      notUploadedYet: 'Haijapakiwa bado',
      uploadedEncrypted: 'Imepakiwa na kusimbwa',
      verifyLoadFailed: 'Imeshindikana kupakia maelezo ya uthibitisho wako.',
      detailsSaved: 'Maelezo yamehifadhiwa.',
      detailsSaveFailed: 'Imeshindikana kuhifadhi maelezo yako.',
      documentUploaded: 'Nyaraka imepakiwa.',
      documentUploadFailed: 'Imeshindikana kupakia nyaraka hii.',
      takePhoto: 'Piga picha',
      retakePhoto: 'Piga picha tena',
      uploadInstead: 'Pakia faili badala yake',
      dropToUpload: 'Achia faili hapa ili kuipakia',
      cameraTitleId: 'Piga picha ya kitambulisho chako',
      cameraHintId: 'Laza kadi juu ya uso tambarare mahali penye mwanga wa kutosha na uijaze fremu. Picha husimbwa unapoipiga.',
      fileWrongType: 'ZuriLofts hukubali picha ya JPEG, PNG au WebP, au PDF.',
      fileTooLarge: 'Faili hiyo inazidi 8MB. Chagua ndogo zaidi.',
      cameraTitle: 'Piga selfie yako',
      cameraHint: 'Shika kitambulisho chako kando ya uso wako na uweke uso wote ndani ya fremu. Picha husimbwa unapoipiga.',
      cameraStarting: 'Inawasha kamera',
      cameraCapture: 'Piga picha',
      cameraDenied: 'ZuriLofts haikuweza kufikia kamera yako. Ruhusu ufikiaji wa kamera kwenye kivinjari chako, au pakia picha uliyo nayo tayari.',
      cameraUnsupported: 'Kivinjari hiki hakiwezi kufungua kamera hapa. Kinahitaji muunganisho salama (https), au unaweza kupakia picha badala yake.',
      submittedForReview: 'Imewasilishwa kwa ukaguzi. Kwa kawaida huchukua chini ya siku moja.',
      completeRequiredFirst: 'Kamilisha sehemu zinazohitajika na nyaraka kabla ya kuwasilisha.',
      fileFallback: 'Faili',
      needHelp: 'Unahitaji msaada?',
      openMenu: 'Fungua menyu',
      dismissNotification: 'Ondoa taarifa',
      switchToDarkMode: 'Badilisha hali ya giza',
      switchToLightMode: 'Badilisha hali ya mwanga',
      backToListings: 'Rudi kwa matangazo yako',
      listingSettings: 'Mipangilio ya tangazo',
      editorSections: 'Sehemu za kuhariri tangazo',
      closeMenu: 'Funga menyu',
      openAccountMenu: 'Fungua menyu ya akaunti',
      toggleNavigation: 'Badilisha menyu ya urambazaji',
      searchDestination: 'Tafuta eneo unakoenda',
      accountAndNavigation: 'Menyu ya akaunti na urambazaji',
      justNow: 'Sasa hivi',
      evidenceOpenFailed: 'Imeshindikana kufungua ushahidi huu',
      describeMinChars: 'Eleza tatizo kwa herufi 10 au zaidi.',
      disputeOpenFailed: 'Imeshindikana kufungua mgogoro huu',
      stayBooking: 'Uhifadhi wa makaazi',
      messageSent: 'Ujumbe umetumwa.',
      messageSendFailed: 'Imeshindikana kutuma ujumbe huu',
      evidenceUploaded: 'Ushahidi umepakiwa.',
      evidenceUploadFailed: 'Imeshindikana kupakia ushahidi huu',
      selectDispute: 'Chagua mgogoro',
      eventDisputeUpdated: 'Mgogoro umesasishwa',
    },
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
 
 
 



 
 
 
 
    misc: {
      shortlistUnavailable: 'Orodha haipatikani',
      sharedShortlist: 'Orodha iliyoshirikiwa',
      signInToSave: 'Ingia ili kuhifadhi orodha hii kwenye akaunti yako na kuisawazisha kwenye vifaa vyote.',
      signIn: 'Ingia',
      noStaysInShortlist: 'Hakuna makaazi kwenye orodha hii',
      shortlistSharedEmpty: 'Mkusanyiko huu umeshirikiwa, lakini hakuna nyumba zilizoongezwa bado.',
      trustEyebrow: 'UAMINIFU NA UREJESHAJI',
      trustTitle: 'Weka akaunti yako salama',
      trustDescription: 'Uthibitishaji wa utambulisho, utatuzi wa migogoro na urejeshaji wa malipo mahali pamoja.',
      trustOverview: 'Muhtasari wa uaminifu na urejeshaji',
      trustSections: 'Sehemu za uaminifu',
      identityVerification: 'Uthibitishaji wa utambulisho',
      paymentRecovery: 'Urejeshaji wa malipo',
      security: 'Usalama',
      logOut: 'Toka',
      paymentRecoveryHint: 'Kile wageni wanachokiona ikiwa malipo yamekatizwa.',
      secureProviderCheck: 'Ukaguzi salama wa mtoa huduma',
      reviewBooking: 'Pitia uhifadhi',
      tryPaymentAgain: 'Jaribu malipo tena',
      returnToBooking: 'Rudi kwenye uhifadhi',
      checkingBookingState: 'Inakagua hali ya uhifadhi wako...',
    },
 
 
 
 
 


 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 


 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 


 
 
 
 
 
 
 
 
 
 
 


 
 
 
 
    common: {
      save: 'Hifadhi',
      saveChanges: 'Hifadhi mabadiliko',
      saveDraft: 'Hifadhi rasimu',
      saving: 'Inahifadhi...',
      cancel: 'Ghairi',
      close: 'Funga',
      next: 'Endelea',
      back: 'Rudi',
      continue: 'Endelea',
      confirm: 'Thibitisha',
      submit: 'Wasilisha',
      submitting: 'Inawasilisha...',
      retry: 'Jaribu tena',
      refresh: 'Sasisha',
      loading: 'Inapakia...',
      search: 'Tafuta',
      clear: 'Futa',
      apply: 'Tumia',
      edit: 'Hariri',
      delete: 'Futa',
      remove: 'Ondoa',
      add: 'Ongeza',
      view: 'Tazama',
      viewAll: 'Tazama zote',
      seeAll: 'Tazama zote',
      viewDetails: 'Tazama maelezo',
      optional: 'Si lazima',
      required: 'Inahitajika',
      none: 'Hakuna',
      yes: 'Ndiyo',
      no: 'Hapana',
      all: 'Zote',
      none_yet: 'Hakuna chochote bado',
      of: 'kati ya',
      and: 'na',
      from: 'Kuanzia',
      to: 'Hadi',
      show: 'Onyesha',
      hide: 'Ficha',
      more: 'Zaidi',
      less: 'Kidogo',
      done: 'Imekamilika',
      working: 'Inafanya kazi...',
      dismiss: 'Ondoa',
      guest_one: 'mgeni {count}',
      guest_other: 'wageni {count}',
      night_one: 'usiku {count}',
      night_other: 'usiku {count}',
      bedroom_one: 'chumba cha kulala {count}',
      bedroom_other: 'vyumba vya kulala {count}',
      bathroom_one: 'bafu {count}',
      bathroom_other: 'bafu {count}',
      review_one: 'maoni {count}',
      review_other: 'maoni {count}',
      booking_one: 'uhifadhi {count}',
      booking_other: 'uhifadhi {count}',
      night: 'usiku',
      nights: 'usiku',
      perNight: 'kwa usiku',
      total: 'Jumla',
      subtotal: 'Jumla ndogo',
      email: 'Barua pepe',
      phone: 'Namba ya simu',
      password: 'Nenosiri',
      name: 'Jina',
      guest: 'Mgeni',
      typeToConfirm: 'Andika',
      firstName: 'Jina la kwanza',
      lastName: 'Jina la mwisho',
      date: 'Tarehe',
      status: 'Hali',
      actions: 'Vitendo',
      details: 'Maelezo',
      notes: 'Maelezo ya ndani',
      couldNotLoad: 'Haikuweza kupakiwa.',
      couldNotSave: 'Haikuweza kuhifadhiwa.',
      checkConnection: 'Angalia muunganisho wako kisha ujaribu tena.',
      signInRequired: 'Ingia ili kuendelea.',
      somethingWentWrong: 'Kuna hitilafu imetokea.',
    },
    mobileNav: {
      home: 'Nyumbani',
      saved: 'Vipendwa',
      trips: 'Safari',
      inbox: 'Kikasha',
      profile: 'Wasifu',
      today: 'Leo',
      calendar: 'Kalenda',
      listings: 'Matangazo',
      earnings: 'Mapato',
    },
    listingStatus: {
      draft: 'Rasimu',
      inReview: 'Inakaguliwa',
      published: 'Imechapishwa',
      needsChanges: 'Inahitaji marekebisho',
      suspended: 'Imesimamishwa',
      copyPublished: 'Inaonekana kwa wageni na inapokea uhifadhi.',
      copyInReview: 'Iliwasilishwa kwa ukaguzi. Mabadiliko yanabaki faragha hadi itakapoidhinishwa.',
      copyRejected: 'Sasisha maelezo yaliyoombwa kabla ya kuwasilisha tena.',
      copySuspended: 'Imefichwa kwa wageni wakati imesimamishwa.',
      copyDraft: 'Ongeza maelezo, picha na bei, kisha iwasilishe kwa ukaguzi.',
    },
  },
};
