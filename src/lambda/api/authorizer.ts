import { PersonaAuthorizer } from "./PersonaAuthorizer";

module.exports.validateToken = async (event: any, context: any) => {
  const route = new PersonaAuthorizer(event, context);
  return await route.handle();
};
