/**
 * Accessibility-only copy.
 *
 * Screen-reader labels, field placeholders and the alt text that never appears
 * in a screenshot. They are still read aloud, so leaving them English makes a
 * page unusable with a screen reader in Swahili.
 *
 * Fragments that start with a comma are suffixes of a longer label assembled by
 * the page (a calendar day, a date cell): the punctuation stays in the string so
 * the joined sentence reads correctly in both languages.
 */
export const a11y2 = {
  en: {
    a11y2: {
      // Journey and screen-reader status lines
      backToMessages: 'Back to messages',
      loadingMessages: 'Loading messages',
      loadingBooking: 'Loading booking',
      loadingArrivalGuide: 'Loading arrival guide',
      viewStay: 'View {name}',
      stay: 'stay',
      guest: 'Guest',
      stayBarTooltip: '{guest}, {start} to {end}',

      // Message composer
      replyToPlaceholder: 'Reply to {name}...',
      messageTo: 'Message {name}',

      // Arrival guide fields
      addDetails: 'Add details',
      directionsPlaceholder: 'Landmarks, the gate colour, where to park, which floor.',
      wifiNetworkPlaceholder: 'The name a guest picks from the wifi list',
      wifiPasswordPlaceholder: 'Case matters, as it does on the router',
      houseManualPlaceholder: 'Appliances, hot water, bins, anything that is not obvious.',
      houseRulesPlaceholder: 'Up to 2 overnight guests\nNo pets\nNo smoking',

      // Earnings and insights controls
      chartPeriod: 'Chart period',
      chartView: 'Chart view',
      tableView: 'Table view',
      reportPeriod: 'Report period',
      outOfFive: '{rating} out of 5',
      scoreNotRated: '{label}: not rated yet',
      scoreOutOfFive: '{label}: {score} out of 5',

      // Host today
      todaysOperations: "Today's operations",

      // Host settings
      bank: 'Bank',
      chooseYourBank: 'Choose your bank',

      // Calendar
      listing: 'Listing',
      clearSelection: 'Clear selection',
      outsideThisMonth: ', outside this month',
      notEditable: ', not editable',
      selected: ', selected',
      tapToSelect: ', tap to select',

      // Profile
      selectCountryCode: 'Select country code',
      selectYourBank: 'Select your bank',
      selectPayoutFrequency: 'Select payout frequency',
      starOne: '{count} star',
      starOther: '{count} stars',
      ratingOptional: '{label} rating (optional)',
      publicReviewPlaceholder: 'Share what other guests should know about this stay. This appears publicly with your first name.',
      privateNotePlaceholder: 'Only the ZuriLofts team will see this. Tell us what we could do better.',

      // Checkout
      numberOfGuests: 'Number of guests',
      checkOutTime: 'Check-out time',
      decreaseQuantity: 'Decrease {name} quantity',
      increaseQuantity: 'Increase {name} quantity',
    },
  },
  sw: {
    a11y2: {
      backToMessages: 'Rudi kwenye ujumbe',
      loadingMessages: 'Inapakia ujumbe',
      loadingBooking: 'Inapakia uhifadhi',
      loadingArrivalGuide: 'Inapakia mwongozo wa kuwasili',
      viewStay: 'Tazama {name}',
      stay: 'makaazi',
      guest: 'Mgeni',
      stayBarTooltip: '{guest}, {start} hadi {end}',

      replyToPlaceholder: 'Jibu {name}...',
      messageTo: 'Ujumbe kwa {name}',

      addDetails: 'Ongeza maelezo',
      directionsPlaceholder: 'Alama za eneo, rangi ya geti, mahali pa kuegesha gari, ghorofa.',
      wifiNetworkPlaceholder: 'Jina ambalo mgeni huchagua kwenye orodha ya mtandao wa wifi',
      wifiPasswordPlaceholder: 'Herufi kubwa na ndogo zinahesabiwa, kama kwenye router',
      houseManualPlaceholder: 'Vifaa, maji ya moto, mapipa ya taka, chochote kisicho dhahiri.',
      houseRulesPlaceholder: 'Hadi wageni 2 wa kulala\nHakuna wanyama\nHakuna kuvuta sigara',

      chartPeriod: 'Kipindi cha chati',
      chartView: 'Mwonekano wa chati',
      tableView: 'Mwonekano wa jedwali',
      reportPeriod: 'Kipindi cha ripoti',
      outOfFive: '{rating} kati ya 5',
      scoreNotRated: '{label}: haijapimwa bado',
      scoreOutOfFive: '{label}: {score} kati ya 5',

      todaysOperations: 'Shughuli za leo',

      bank: 'Benki',
      chooseYourBank: 'Chagua benki yako',

      listing: 'Tangazo',
      clearSelection: 'Ondoa uteuzi',
      outsideThisMonth: ', nje ya mwezi huu',
      notEditable: ', haiwezi kuhaririwa',
      selected: ', imechaguliwa',
      tapToSelect: ', gusa ili kuchagua',

      selectCountryCode: 'Chagua msimbo wa nchi',
      selectYourBank: 'Chagua benki yako',
      selectPayoutFrequency: 'Chagua marudio ya malipo kwa mkaribishaji',
      starOne: 'nyota {count}',
      starOther: 'nyota {count}',
      ratingOptional: 'Ukadiriaji wa {label} (hiari)',
      publicReviewPlaceholder: 'Shiriki kile wageni wengine wanapaswa kujua kuhusu makaazi haya. Hii inaonekana hadharani pamoja na jina lako la kwanza.',
      privateNotePlaceholder: 'Timu ya ZuriLofts pekee itaona hii. Tuambie tunachoweza kufanya vizuri zaidi.',

      numberOfGuests: 'Idadi ya wageni',
      checkOutTime: 'Muda wa kutoka',
      decreaseQuantity: 'Punguza idadi ya {name}',
      increaseQuantity: 'Ongeza idadi ya {name}',
    },
  },
};
