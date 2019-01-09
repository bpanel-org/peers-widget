import { getClient } from '@bpanel/bpanel-utils';
import { SET_PEERS } from './constants';

const client = getClient();

function setPeers(peers) {
  return {
    type: SET_PEERS,
    payload: peers
  };
}

export function getPeers() {
  return async dispatch => {
    if (client && client.node) {
      const peersList = await client.node.execute('getpeerinfo');
      dispatch(setPeers(peersList));
    }
  };
}
