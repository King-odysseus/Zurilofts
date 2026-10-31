function fullName(person, fallback) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || fallback;
}

export function getConversationParticipant(conversation, currentUserId) {
  const property = conversation?.booking?.property || {};
  const guest = conversation?.booking?.user || {};
  const host = property.host || {};
  const currentUserIsGuest = guest.id === currentUserId;
  const person = currentUserIsGuest ? host : guest;
  const fallback = currentUserIsGuest ? 'Host' : 'Guest';
  return {
    name: fullName(person, fallback),
    avatar: person.avatar || null,
    isHost: currentUserIsGuest,
  };
}

// Fired after a thread is marked read. The header badge listens for it so the
// count drops as soon as the messages have actually been seen.
export const CONVERSATIONS_READ_EVENT = 'zuri:conversations-read';
