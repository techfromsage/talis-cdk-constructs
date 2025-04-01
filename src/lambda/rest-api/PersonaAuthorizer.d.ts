import { PersonaClient } from "talis-node";
type ParsedArn = {
    method: string;
    resourcePath: string;
    apiVersion: string;
    apiOptions: {
        region: string;
        restApiId: string;
        stage: string;
    };
    awsAccountId: string;
};
export declare class PersonaAuthorizer {
    event: any;
    context: any;
    personaClient: PersonaClient | undefined;
    constructor(event: any, context: any);
    handle(): Promise<any>;
    validateToken(validationOpts: any): Promise<Record<string, any>>;
    /**
     * Break down an API gateway method ARN into it's constituent parts.
     * Method ARNs take the following format:
     *
     *   arn:aws:execute-api:<Region id>:<Account id>:<API id>/<Stage>/<Method>/<Resource path>
     *
     * e.g:
     *
     *   arn:aws:execute-api:eu-west-1:123:abc/development/GET/2/works
     *
     * @param methodArn {string} The method ARN provided by the event handed to a Lambda function
     * @returns {{
     *   method: string,
     *   resourcePath: string,
     *   apiOptions: {
     *     region: string,
     *     restApiId: string,
     *     stage: string
     *   },
     *   awsAccountId: string
     *   }}
     */
    parseMethodArn(methodArn: string): ParsedArn;
    getScope(parsedMethodArn: ParsedArn): any;
    getPersonaClient(): PersonaClient;
    pathMatch(pathDefinition: string, path: string): boolean;
    /**
     * Builds temporary IAM policy that applies to a given resource. A policy either allows or
     * denies access. Allowing access will trigger the next Lambda function responsible for handling
     * the route. Denying access will return a 403 response to the client.
     *
     * Important: This method assumes that the authorizer TTL is set to 0 (no cache).
     * See this thread for more details: https://forums.aws.amazon.com/message.jspa?messageID=704030
     *
     * @param principalId {string} The user requesting access to the resource, this is a JWT aud claim.
     * @param parsedMethodArn {{}} A method ARN that identified the resource being accessed.
     * @param allow {boolean} If true, grant access to the resource. If false, deny access.
     * @returns {*|Object} A built auth policy document object.
     */
    buildAuthPolicy(principalId: string, parsedMethodArn: ParsedArn, allow: boolean): any;
}
export {};
