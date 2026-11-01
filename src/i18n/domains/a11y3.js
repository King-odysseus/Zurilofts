/**
 * Hidden accessibility text for the admin screens, the privacy page and the
 * auth shell.
 *
 * These strings never appear in a screenshot: they are screen-reader labels on
 * tables, icon-only controls, filter menus and form placeholders. A sighted
 * user reading the Swahili page never sees them, but a screen-reader user hears
 * every one, so they are translated with the same care as visible copy.
 *
 * {name} placeholders are filled by the second argument to the translate
 * function, e.g. t('a11y3.actionsFor', { name: addOn.name }).
 */
export const a11y3 = {
  en: {
    a11y3: {
      // Shared shapes: a table's name, a row's action menu, a filter menu.
      addOnsTable: 'Add-ons',
      actionsFor: 'Actions for {name}',
      actionsForBookingBy: 'Actions for the booking by {name}',
      selectUser: 'Select {name}',
      changeRoleFor: 'Change role for {name}',
      category: 'Category',
      filterByStatus: 'Filter by status',
      filterListingsByStatus: 'Filter listings by status',
      filterApplicationsByStatus: 'Filter host applications by status',
      filterAuditByType: 'Filter audit activity by type',
      breadcrumb: 'Breadcrumb',

      // Admin messages
      searchConversations: 'Search conversations',
      replyToName: 'Reply to {name}',
      replyToGuestPlaceholder: 'Write a reply to the guest',
      replyToGuestLabel: 'Reply to guest',

      // Admin revenue
      revenueByHost: 'Revenue by host',
      recentPaidBookings: 'Recent paid bookings',

      // Admin host applications
      reviewerNotePlaceholder: 'Required for changes or rejection',

      // Admin users
      payoutFrequency: 'Payout frequency',
      deleteReasonPlaceholder: 'For example: Customer requested account erasure',

      // Admin guides
      guideTitlePlaceholder: 'Best areas to stay in Nairobi',
      guideExcerptPlaceholder: 'A concise summary for listing cards and search.',

      // Auth shell
      fiveStarGuestRating: 'Five-star guest rating',
    },
  },
  sw: {
    a11y3: {
      addOnsTable: 'Huduma za nyongeza',
      actionsFor: 'Vitendo kwa {name}',
      actionsForBookingBy: 'Vitendo kwa uhifadhi wa {name}',
      selectUser: 'Chagua {name}',
      changeRoleFor: 'Badilisha jukumu la {name}',
      category: 'Aina',
      filterByStatus: 'Chuja kwa hali',
      filterListingsByStatus: 'Chuja matangazo kwa hali',
      filterApplicationsByStatus: 'Chuja maombi ya wakaribishaji kwa hali',
      filterAuditByType: 'Chuja shughuli za ukaguzi kwa aina',
      breadcrumb: 'Njia ya ukurasa',

      searchConversations: 'Tafuta mazungumzo',
      replyToName: 'Jibu kwa {name}',
      replyToGuestPlaceholder: 'Andika jibu kwa mgeni',
      replyToGuestLabel: 'Jibu mgeni',

      revenueByHost: 'Mapato kwa mkaribishaji',
      recentPaidBookings: 'Uhifadhi wa karibuni uliolipwa',

      reviewerNotePlaceholder: 'Inahitajika kwa mabadiliko au kukataliwa',

      payoutFrequency: 'Mara ya malipo',
      deleteReasonPlaceholder: 'Kwa mfano: Mteja aliomba akaunti ifutwe',

      guideTitlePlaceholder: 'Maeneo bora ya kukaa Nairobi',
      guideExcerptPlaceholder: 'Muhtasari mfupi kwa kadi za tangazo na utafutaji.',

      fiveStarGuestRating: 'Ukadiriaji wa nyota tano wa mgeni',
    },
  },
};
