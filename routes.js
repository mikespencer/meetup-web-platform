import Accepts from 'accepts';
import Boom from 'boom';
import chalk from 'chalk';

import apiProxy$ from './apiProxy/api-proxy';
import { duotones, getDuotoneUrls } from './util/duotone';

export default function getRoutes(
	renderRequestMap,
	{
		API_SERVER_ROOT_URL,
		PHOTO_SCALER_SALT,
		localeCodes
	}) {

	console.log(chalk.green(`Supported languages:\n${Object.keys(renderRequestMap).join('\n')}`));
	const proxyApiRequest$ = apiProxy$({
		baseUrl: API_SERVER_ROOT_URL,
		duotoneUrls: getDuotoneUrls(duotones, PHOTO_SCALER_SALT),
	});

	/**
	 * This handler converts the application-supplied queries into external API
	 * calls, and converts the API call responses into a standard format that
	 * the application expects.
	 *
	 * @returns Array query responses, which are in the format defined
	 *   by `apiAdapter.apiResponseToQueryResponse`
	 */
	const apiProxyRoute = {
		method: ['GET', 'POST', 'DELETE', 'PATCH'],
		path: '/api',
		handler: (request, reply) => {
			const queryResponses$ = proxyApiRequest$(request);
			queryResponses$.subscribe(
				queryResponses => {
					reply(JSON.stringify(queryResponses)).type('application/json');
				},
				(err) => { reply(Boom.badImplementation(err.message)); }
			);
		}
	};

	/**
	 * Only one wildcard route for all application GET requests - exceptions are
	 * described in the routes above
	 */
	const applicationRoute = {
		method: 'GET',
		path: '/{wild*}',
		handler: (request, reply) => {
			const requestLanguage = Accepts(request).language(localeCodes) || 'en-US';

			request.log(['info'], chalk.green(`Request received for ${request.url.href} (${requestLanguage})`));
			const render$ = request.authorize()  // `authorize()` method is supplied by anonAuthPlugin
				.flatMap(renderRequestMap[requestLanguage]);

			render$.subscribe(
				({ result, statusCode }) => {
					// response is sent when this function returns (`nextTick`)
					const response = reply(result).code(statusCode);

					request.log(['info'], chalk.green('HTML response ready'));
					if (reply.request.app.setCookies) {
						// when auth cookies are generated on the server rather than the
						// original browser request, we need to send the new cookies
						// back to the browser in the response
						const {
							oauth_token,
							refresh_token,
							expires_in,
							anonymous,
						} = reply.request.state;
						const yearOfMilliseconds = 1000 * 60 * 60 * 24 * 365;

						request.log(['info'], chalk.green(`Setting cookies ${Object.keys(reply.request.state)}`));
						response.state('oauth_token', oauth_token, { ttl: expires_in * 1000 });
						response.state('refresh_token', refresh_token, { ttl: yearOfMilliseconds * 2 });
						response.state('anonymous', anonymous.toString(), { ttl: yearOfMilliseconds * 2 });
					}
				},
				(err) => { reply(Boom.badImplementation(err.message)); }
			);
		}
	};

	return [
		apiProxyRoute,
		applicationRoute,
	];
}

