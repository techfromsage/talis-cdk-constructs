import { PersonaAuthorizer, AuthEvent } from "./PersonaAuthorizer";

/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.validateToken = async (event: any, context: any) => {
  const authEvent: AuthEvent = {
    authorizationHeader: event.authorizationToken, 
    path: event.methodArn,
  }
  const route = new PersonaAuthorizer(authEvent, context);
  return await route.handle();
};
/* eslint-enable @typescript-eslint/no-explicit-any */
