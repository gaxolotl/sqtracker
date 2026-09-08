// bittorrent-tracker keys HTTP peers by ip:port (the swarm's LRU key), so a
// single client announcing from two addresses - dual-stack, a changed listen
// port, or a leftover session - looks like two peers. Count unique clients
// (peer ids) instead so "seeders / leechers" match reality.
export const countSwarmPeers = (swarm) => {
  const byPeerId = new Map();
  const keys = swarm?.peers?.keys;
  if (keys?.forEach) {
    keys.forEach((key) => {
      const peer = swarm.peers.peek(key);
      if (!peer) return;
      let entry = byPeerId.get(peer.peerId);
      if (!entry) {
        entry = { seeder: false, leecher: false };
        byPeerId.set(peer.peerId, entry);
      }
      if (peer.complete) entry.seeder = true;
      else entry.leecher = true;
    });
  }

  let peers = 0;
  let seeders = 0;
  let leechers = 0;
  byPeerId.forEach((entry) => {
    peers += 1;
    if (entry.seeder && !entry.leecher) seeders += 1;
    else if (entry.leecher && !entry.seeder) leechers += 1;
    else if (entry.seeder) seeders += 1;
  });
  return { peers, seeders, leechers };
};
