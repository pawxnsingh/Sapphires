/**
 * An array of routes that are accessible to the public
 * These route do not require authentication
 * @type {string[]}
*/

// where as this one which can both used by loggedin and loggedout user
export const publicRoutes = ["/", "/auth/new-verification"]; 

/**
 * An array of routes that are accessible to only authenticated users
 * These route will rediret the logged in user to /setting
 * @type {string[]}
 */
export const authRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/auth/reset",
  "/auth/new-password", // this is only accessible by the logged in user
];

/**
 * The prefix for API authentication routes
 * Routes that start with this prefix are used for API authentication purposes
 * and nextauth need it for the authentication purposes
 * "api/auth"
 *
 * @type {string}
 */
export const apiAuthPrefix = "/api/auth";

/**
 * The default redirect path after loggin in
 * @type {string}
 */

export const DEFAULT_LOGIN_REDIRECT = "/settings";
