const clients = new Map();

export const addClient = (wellId, res) => {
  if (!clients.has(wellId)) {
    clients.set(wellId, new Set());
  }
  clients.get(wellId).add(res);
};

export const removeClient = (wellId, res) => {
  const set = clients.get(wellId);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      clients.delete(wellId);
    }
  }
};

export const broadcast = (wellId, event, data) => {
  const set = clients.get(wellId);
  if (set) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      res.write(payload);
    }
  }
};
