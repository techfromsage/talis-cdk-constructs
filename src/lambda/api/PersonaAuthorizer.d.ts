import { PersonaClient } from "talis-node";
type ParsedArn = {
    method: string;
    resourcePath: string;
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
}
export {};
