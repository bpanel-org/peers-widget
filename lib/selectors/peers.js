import { chain } from 'underscore';
import { createSelector } from 'reselect';
import { isIPv4String, isIPv6String } from 'binet';
import assert from 'bsert';

const getPeers = (peers = []) => peers;

export const getPeerCoordinates = async peers => {
  const getCoordsPromises = peers.map(async ({ addr, id }) => {
    const key = SECRETS.ipstack || '';
    let ip;
    // ipv6 addresses start with a bracket
    if (addr[0] === '[') ip = addr.match(/\[(.*?)\]/)[1];
    else ip = addr.split(':').slice(0, 1)[0];

    // confirm we have a valid ip address
    if (!(isIPv6String(ip) || isIPv4String(ip))) return;

    let protocol = 'http:';
    if (window) protocol = window.location.protocol;
    const response = await fetch(
      `${protocol}//api.ipstack.com/${ip}?access_key=${key}&format=1`
    );
    const location = await response.json();
    const { latitude, longitude } = location;
    return { latitude, longitude, id };
  });

  return await Promise.all(getCoordsPromises);
};

const pickTableData = peers =>
  peers.map(peer =>
    chain(peer)
      .pick((value, key) => {
        const keys = ['id', 'name', 'addr', 'subver', 'inbound', 'relaytxes'];
        if (keys.indexOf(key) > -1) return true;
      })
      .mapObject(value => {
        // for boolean values need to convert to a string
        if (typeof value === 'boolean') return value.toString();
        return value;
      })
      .value()
  );

const peerCoordinates = createSelector([getPeers], getPeerCoordinates);

const peerTableData = createSelector([getPeers], pickTableData);

export default { peerCoordinates, peerTableData };
