const roomPresence = new Map<string, Set<string>>();

export const addPresence = (roomId: string, userId: string) => {
  const members = roomPresence.get(roomId) ?? new Set<string>();
  members.add(userId);
  roomPresence.set(roomId, members);
};

export const removePresence = (roomId: string, userId: string) => {
  const members = roomPresence.get(roomId);
  if (!members) {
    return;
  }

  members.delete(userId);
  if (members.size === 0) {
    roomPresence.delete(roomId);
  }
};

export const listPresence = (roomId: string) => {
  return Array.from(roomPresence.get(roomId) ?? []);
};
