/**
 * Sync middleware will hit the API when the server first renders the page and
 * when the router updates the app location.
 *
 * In order to call the correct API, it matches the current location to a route,
 * and the route specifies the function that can be called to build an API
 * request config (query)
 *
 * @module SyncMiddleware
 */

import Rx from 'rxjs';
import { bindActionCreators } from 'redux';
import { LOCATION_CHANGE } from 'react-router-redux';
import {
	apiRequest,
	apiSuccess,
	apiError,
	apiComplete,
	locationSync,
} from '../actions/syncActionCreators';
import { activeRouteQueries$ } from '../util/routeUtils';
import { fetchQueries } from '../util/fetchUtils';

/**
 * We want to make sure there is always and only one data-fetching subscription
 * open at a time, so we create an empty subscription that is scoped to the
 * request. When a new fetch happens, this subscription will get replaced with
 * a new subscription.
 */
let apiFetchSub = new Rx.Subscription();

/**
 * The middleware is exported as a getter because it needs the application's
 * routes in order to sync correctly.
 *
 * The middleware itself - passes the queries to the application server, which
 * will make necessary calls to the API
 */
const getSyncMiddleware = routes => store => next => action => {
	if (action.type === LOCATION_CHANGE ||  // client nav
		action.type === '@@server/RENDER' ||
		action.type === 'LOCATION_SYNC') {
		const dispatchApiRequest = bindActionCreators(apiRequest, store.dispatch);

		const location = action.payload;
		const activeQueries$ = activeRouteQueries$(routes, { location })
			.delay(0)  // needed in order for LOCATION_CHANGE to finish processing
			.filter(queries => queries);  // only emit value if queries exist

		activeQueries$.subscribe(dispatchApiRequest);
	}

	if (action.type === 'CONFIGURE_AUTH' && !action.meta) {
		setTimeout(() => {
			store.dispatch(locationSync(store.getState().routing.locationBeforeTransitions));
		}, 0);
	}

	if (action.type === 'API_REQUEST') {
		const actions = bindActionCreators(
			{ apiSuccess, apiError, apiComplete },
			store.dispatch
		);
		const {
			auth,
			config,
		} = store.getState();
		// should read auth from cookie if on browser, only read from state if on server

		const apiFetch$ = Rx.Observable.of(action.payload)
			.flatMap(fetchQueries(config.apiUrl, { method: 'GET', auth }));

		// Before creating a new subscription, we need to destroy any
		// existing subscriptions
		apiFetchSub.unsubscribe();
		// Now, set up the subscription to the new fetch
		apiFetchSub = apiFetch$.subscribe(
			actions.apiSuccess,
			actions.apiError,
			actions.apiComplete
		);
	}

	return next(action);
};

export default getSyncMiddleware;

