declare module 'talis-node' {
  type ERROR_TYPES = {
    VALIDATION_FAILURE: 'validation_failure';
    COMMUNICATION_ISSUE: 'communication_issue';
    INVALID_TOKEN: 'invalid_token';
    INSUFFICIENT_SCOPE: 'insufficient_scope';
    INVALID_ARGUMENTS: 'invalid_arguments';
  };

  interface PersonaClient {
    validateToken(opts:any, callback:any):any;
  }

  interface persona {
    validateScopes(scopes:any, requiredScopes:any): boolean;

    createClient(appUA:any, config:any): PersonaClient;

    errorTypes: ERROR_TYPES;
  }

  export const persona: persona;
  export const PersonaClient: PersonaClient;
}
