import { PersonaAuthorizer } from "./PersonaAuthorizer";

/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.validateToken = async (event: any, context: any) => {
  const route = new PersonaAuthorizer({authorizationsHeader: event.headers["authorization"], path: event.routeArn}, context);
  return await route.handle();
};
/* eslint-enable @typescript-eslint/no-explicit-any */
