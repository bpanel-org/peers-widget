import assert from 'assert';

import modules from './plugins';
import { getPeers } from './actions';
import { SET_PEERS, STATE_REFRESHED } from './constants';
import PeersList from './components/PeersList';
import PeersMap from './components/PeersMap';
import { getClient } from '@bpanel/bpanel-utils';

const plugins = Object.keys(modules).map(name => modules[name]);

export const metadata = {
  name: '@bpanel/peers-widget',
  pathName: '',
  displayName: 'Peers',
  author: 'bcoin-org',
  description:
    'A widget for displaying peer information on the bPanel Dashboard',
  version: require('../package.json').version
};

export const pluginConfig = { plugins };

export const reduceNode = (state, action) => {
  const { type, payload } = action;

  const newState = { ...state };
  switch (type) {
    case SET_PEERS: {
      assert(Array.isArray(payload), 'Payload for SET_PEERS must be array');
      newState.peers = payload;
      return newState;
    }

    default:
      return state;
  }
};

export const getRouteProps = {
  '@bpanel/dashboard': (parentProps, props) =>
    Object.assign(props, {
      peers: parentProps.peers,
      getPeers: parentProps.getPeers,
      resetPeers: parentProps.resetPeers
    })
};

export const mapComponentDispatch = {
  Panel: (dispatch, map) =>
    Object.assign(map, {
      getPeers: () => dispatch(getPeers()),
      resetPeers: () => dispatch({ type: SET_PEERS, payload: [] })
    })
};

export const mapComponentState = {
  Panel: (state, map) =>
    Object.assign(map, {
      peers: state.node.peers
    })
};

export const middleware = store => next => action => {
  const { dispatch } = store;
  // rehydrate the peers when we've seen the state has refreshed
  if (action.type === STATE_REFRESHED) {
    dispatch(getPeers());
  }

  return next(action);
}

const decorateDashboard = (Dashboard, { React, PropTypes }) => {
  return class extends React.Component {
    constructor(props) {
      super(props);
      const { peers } = props;
      // These components are created with widgetCreator
      // which allows you to append widgets to another plugin without
      // causing full re-renders anytime other props change
      // in the parent plugin. You'll need to update these when
      // your target props change (in this case peers).
      // See componentDidUpdate for example
      this.peersList = PeersList({ peers });
      this.peersMap = PeersMap({ peers });
      this.resetPeers = () => props.resetPeers();
    }

    static get displayName() {
      return 'Peers Widgets';
    }

    static get defaultProps() {
      return {
        peers: []
      };
    }

    static get propTypes() {
      return {
        bottomWidgets: PropTypes.array,
        customChildrenAfter: PropTypes.node,
        peers: PropTypes.arrayOf(PropTypes.object),
        getPeers: PropTypes.func.isRequired,
        resetPeers: PropTypes.func.isRequired
      };
    }

    componentDidMount() {
      this.props.getPeers();
      this.client = getClient();
      this.client.on('set clients', this.resetPeers);
    }

    componentWillUnmount() {
      this.client.removeListener('set clients', this.resetPeers);
    }

    componentWillUpdate({ peers: nextPeers }) {
      const { peers } = this.props;
      if (peers.length !== nextPeers.length) {
        this.peersList = PeersList({ peers: nextPeers });
        this.peersMap = PeersMap({ peers: nextPeers });
      }
    }


    render() {
      const { bottomWidgets = [], customChildrenAfter = [] } = this.props;
      // widget to display table of peers
      bottomWidgets.push(this.peersList);

      // Widget for displaying a map with the peer locations
      customChildrenAfter.push(this.peersMap);

      return (
        <Dashboard
          {...this.props}
          bottomWidgets={bottomWidgets}
          customChildrenAfter={customChildrenAfter}
        />
      );
    }
  };
};

// `decoratePlugin` passes an object with properties to map to the
// plugins they will decorate. Must match target plugin name exactly
export const decoratePlugin = { '@bpanel/dashboard': decorateDashboard };
