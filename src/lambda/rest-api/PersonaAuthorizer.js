"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonaAuthorizer = void 0;
const _ = require("lodash");
const talis_node_1 = require("talis-node");
/* eslint-disable @typescript-eslint/no-var-requires */
const AuthPolicy = require("./authPolicy");
// Constants used by parseMethodArn:
//
// Example MethodARN:
//   "arn:aws:execute-api:<Region id>:<Account id>:<API id>/<Stage>/<Method>/<Resource path>"
// Method ARN Index:  0   1   2           3           4            5
// API Gateway ARN Index:                                          0        1       2        3
//
//
const ARN_INDEX = 0;
const AWS_INDEX = 1;
const EXECUTE_INDEX = 2;
const REGION_INDEX = 3;
const ACCOUNT_ID_INDEX = 4;
const API_GATEWAY_ARN_INDEX = 5;
const METHOD_ARN_INDEXES = [
    ARN_INDEX,
    AWS_INDEX,
    EXECUTE_INDEX,
    REGION_INDEX,
    ACCOUNT_ID_INDEX,
    API_GATEWAY_ARN_INDEX,
];
const API_ID_INDEX = 0;
const STAGE_INDEX = 1;
const METHOD_INDEX = 2;
const RESOURCE_PATH_INDEX = 3;
const API_GATEWAY_ARN_INDEXES = [
    API_ID_INDEX,
    STAGE_INDEX,
    METHOD_INDEX,
    RESOURCE_PATH_INDEX,
];
/* eslint-disable @typescript-eslint/no-explicit-any */
class PersonaAuthorizer {
    constructor(event, context) {
        this.event = event;
        this.context = context;
        this.personaClient = undefined;
    }
    async handle() {
        console.log("Received event", this.event);
        if (!this.event?.authorizationToken ||
            this.event.authorizationToken == null) {
            console.log("Missing auth token");
            return this.context.fail("Unauthorized");
        }
        const parsedMethodArn = this.parseMethodArn(this.event.methodArn);
        console.log(`Parsed Method Arn: ${JSON.stringify(parsedMethodArn)}`);
        const scope = this.getScope(parsedMethodArn);
        console.log(`Method has scope: ${scope}`);
        let validationOpts = {
            token: _.replace(this.event.authorizationToken, "Bearer", "").trim(),
        };
        if (scope != null) {
            validationOpts = _.merge(validationOpts, { scope });
        }
        console.log(`Validation ops: ${JSON.stringify(validationOpts)}`);
        console.log("validating token against request", `${parsedMethodArn.resourcePath}`);
        if (!validationOpts.token || validationOpts.token.length === 0) {
            console.log("token missing");
            return this.context.fail("Unauthorized");
        }
        try {
            const decodedToken = await this.validateToken(validationOpts);
            const principalId = _.get(decodedToken, "aud", "invalid_oauth");
            const authPolicy = this.buildAuthPolicy(principalId, parsedMethodArn, true);
            return this.context.succeed(authPolicy);
        }
        catch (err) {
            console.log("token validation failed", err);
            // In the case of suceess - the principal id is coming from the
            // decoded token. We don't have it here for the case of an invalid token.
            // Leaving the proncipal id blank in the auth policy for deny for now.
            // But could this be found?
            const principalId = "";
            const authPolicy = this.buildAuthPolicy(principalId, parsedMethodArn, false);
            return this.context.succeed(authPolicy);
        }
    }
    validateToken(validationOpts) {
        const client = this.getPersonaClient();
        return new Promise(function (resolve, reject) {
            client.validateToken(validationOpts, (error, ok, decodedToken) => {
                if (error) {
                    reject({
                        error: error,
                        token: decodedToken,
                    });
                }
                resolve(decodedToken);
            });
        });
    }
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
    parseMethodArn(methodArn) {
        const methodArnParts = methodArn.split(":");
        console.log(`Method ARN Parts: ${JSON.stringify(methodArnParts)}`);
        let apiGatewayArn = methodArnParts[API_GATEWAY_ARN_INDEX];
        // If the split created more than the expected number of parts, then the
        // apiGatewayArn must have had one or more :'s in it. Recreate the apiGateway arn.
        for (let index = METHOD_ARN_INDEXES.length; index < methodArnParts.length; index += 1) {
            apiGatewayArn += `:${methodArnParts[index]}`;
        }
        const apiGatewayArnParts = apiGatewayArn.split("/");
        console.log(`api gateway arn parts: ${JSON.stringify(apiGatewayArnParts)}`);
        // If the split created more than the expected number of parts, then the
        // resource path must have had one or more /'s in it. Recreate the resource path.
        let resourcePath = "";
        for (let i = API_GATEWAY_ARN_INDEXES.length - 1; i < apiGatewayArnParts.length; i += 1) {
            resourcePath += `/${apiGatewayArnParts[i]}`;
        }
        console.log(`resource path: ${JSON.stringify(resourcePath)}`);
        return {
            method: apiGatewayArnParts[METHOD_INDEX],
            resourcePath,
            apiOptions: {
                region: methodArnParts[REGION_INDEX],
                restApiId: apiGatewayArnParts[API_ID_INDEX],
                stage: apiGatewayArnParts[STAGE_INDEX],
            },
            awsAccountId: methodArnParts[ACCOUNT_ID_INDEX],
            apiVersion: apiGatewayArnParts[API_ID_INDEX],
        };
    }
    getScope(parsedMethodArn) {
        const scopeConfig = process.env["SCOPE_CONFIG"];
        if (scopeConfig != undefined) {
            const conf = JSON.parse(scopeConfig);
            for (const path of Object.keys(conf)) {
                if (this.pathMatch(path, parsedMethodArn.resourcePath)) {
                    return conf[path];
                }
            }
        }
        return null;
    }
    getPersonaClient() {
        if (this.personaClient == null) {
            const personaConfig = {
                persona_host: process.env["PERSONA_HOST"],
                persona_scheme: process.env["PERSONA_SCHEME"],
                persona_port: process.env["PERSONA_PORT"],
                persona_oauth_route: process.env["PERSONA_OAUTH_ROUTE"],
                cert_background_refresh: false,
            };
            this.personaClient = talis_node_1.persona.createClient(`${process.env["PERSONA_CLIENT_NAME"]} (lambda; NODE_ENV=${process.env["NODE_ENV"]})`, _.merge(personaConfig, {}));
        }
        return this.personaClient;
    }
    pathMatch(pathDefinition, path) {
        const pathDefinitionParts = pathDefinition.split("/");
        const pathParts = path.split("/");
        if (pathDefinitionParts.length !== pathParts.length) {
            return false;
        }
        for (let i = 0; i < pathDefinitionParts.length; i++) {
            const pathDefinitionSegment = pathDefinitionParts[i];
            const pathSegment = pathParts[i];
            if (pathDefinitionSegment.startsWith("{") &&
                pathDefinitionSegment.endsWith("}")) {
                // Matches path argument
            }
            else {
                // Should match directly
                if (pathDefinitionSegment !== pathSegment) {
                    return false;
                }
            }
        }
        return true;
    }
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
    buildAuthPolicy(principalId, parsedMethodArn, allow) {
        const policy = new AuthPolicy(principalId, parsedMethodArn.awsAccountId, parsedMethodArn.apiOptions);
        // const versionedResourcePath = `/${parsedMethodArn.apiVersion}${parsedMethodArn.resourcePath}`;
        const versionedResourcePath = parsedMethodArn.resourcePath;
        if (allow === true) {
            console.log("allowing request for", principalId);
            policy.allowMethod(parsedMethodArn.method, versionedResourcePath);
        }
        else {
            console.log("denying request for", principalId);
            policy.denyMethod(parsedMethodArn.method, versionedResourcePath);
        }
        const builtPolicy = policy.build();
        console.log("applying policy", builtPolicy);
        return builtPolicy;
    }
}
exports.PersonaAuthorizer = PersonaAuthorizer;
/* eslint-enable @typescript-eslint/no-explicit-any */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVyc29uYUF1dGhvcml6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQZXJzb25hQXV0aG9yaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsMkNBQW9EO0FBRXBELHVEQUF1RDtBQUN2RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFjM0Msb0NBQW9DO0FBQ3BDLEVBQUU7QUFDRixxQkFBcUI7QUFDckIsNkZBQTZGO0FBQzdGLG9FQUFvRTtBQUNwRSw4RkFBOEY7QUFDOUYsRUFBRTtBQUNGLEVBQUU7QUFDRixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFDcEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQztBQUN4QixNQUFNLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDdkIsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7QUFDM0IsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7QUFFaEMsTUFBTSxrQkFBa0IsR0FBRztJQUN6QixTQUFTO0lBQ1QsU0FBUztJQUNULGFBQWE7SUFDYixZQUFZO0lBQ1osZ0JBQWdCO0lBQ2hCLHFCQUFxQjtDQUN0QixDQUFDO0FBRUYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQztBQUN0QixNQUFNLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDdkIsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7QUFFOUIsTUFBTSx1QkFBdUIsR0FBRztJQUM5QixZQUFZO0lBQ1osV0FBVztJQUNYLFlBQVk7SUFDWixtQkFBbUI7Q0FDcEIsQ0FBQztBQUVGLHVEQUF1RDtBQUN2RCxNQUFhLGlCQUFpQjtJQUs1QixZQUFZLEtBQVUsRUFBRSxPQUFZO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxP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RSxXQUFXLENBQUMsQ0FBQztRQUM1QyxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUE3UEQsOENBNlBDO0FBQ0Qsc0RBQXNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgeyBwZXJzb25hLCBQZXJzb25hQ2xpZW50IH0gZnJvbSBcInRhbGlzLW5vZGVcIjtcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXZhci1yZXF1aXJlcyAqL1xuY29uc3QgQXV0aFBvbGljeSA9IHJlcXVpcmUoXCIuL2F1dGhQb2xpY3lcIik7XG5cbnR5cGUgUGFyc2VkQXJuID0ge1xuICBtZXRob2Q6IHN0cmluZztcbiAgcmVzb3VyY2VQYXRoOiBzdHJpbmc7XG4gIGFwaVZlcnNpb246IHN0cmluZztcbiAgYXBpT3B0aW9uczoge1xuICAgIHJlZ2lvbjogc3RyaW5nO1xuICAgIHJlc3RBcGlJZDogc3RyaW5nO1xuICAgIHN0YWdlOiBzdHJpbmc7XG4gIH07XG4gIGF3c0FjY291bnRJZDogc3RyaW5nO1xufTtcblxuLy8gQ29uc3RhbnRzIHVzZWQgYnkgcGFyc2VNZXRob2RBcm46XG4vL1xuLy8gRXhhbXBsZSBNZXRob2RBUk46XG4vLyAgIFwiYXJuOmF3czpleGVjdXRlLWFwaTo8UmVnaW9uIGlkPjo8QWNjb3VudCBpZD46PEFQSSBpZD4vPFN0YWdlPi88TWV0aG9kPi88UmVzb3VyY2UgcGF0aD5cIlxuLy8gTWV0aG9kIEFSTiBJbmRleDogIDAgICAxICAgMiAgICAgICAgICAgMyAgICAgICAgICAgNCAgICAgICAgICAgIDVcbi8vIEFQSSBHYXRld2F5IEFSTiBJbmRleDogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwICAgICAgICAxICAgICAgIDIgICAgICAgIDNcbi8vXG4vL1xuY29uc3QgQVJOX0lOREVYID0gMDtcbmNvbnN0IEFXU19JTkRFWCA9IDE7XG5jb25zdCBFWEVDVVRFX0lOREVYID0gMjtcbmNvbnN0IFJFR0lPTl9JTkRFWCA9IDM7XG5jb25zdCBBQ0NPVU5UX0lEX0lOREVYID0gNDtcbmNvbnN0IEFQSV9HQVRFV0FZX0FSTl9JTkRFWCA9IDU7XG5cbmNvbnN0IE1FVEhPRF9BUk5fSU5ERVhFUyA9IFtcbiAgQVJOX0lOREVYLFxuICBBV1NfSU5ERVgsXG4gIEVYRUNVVEVfSU5ERVgsXG4gIFJFR0lPTl9JTkRFWCxcbiAgQUNDT1VOVF9JRF9JTkRFWCxcbiAgQVBJX0dBVEVXQVlfQVJOX0lOREVYLFxuXTtcblxuY29uc3QgQVBJX0lEX0lOREVYID0gMDtcbmNvbnN0IFNUQUdFX0lOREVYID0gMTtcbmNvbnN0IE1FVEhPRF9JTkRFWCA9IDI7XG5jb25zdCBSRVNPVVJDRV9QQVRIX0lOREVYID0gMztcblxuY29uc3QgQVBJX0dBVEVXQVlfQVJOX0lOREVYRVMgPSBbXG4gIEFQSV9JRF9JTkRFWCxcbiAgU1RBR0VfSU5ERVgsXG4gIE1FVEhPRF9JTkRFWCxcbiAgUkVTT1VSQ0VfUEFUSF9JTkRFWCxcbl07XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbmV4cG9ydCBjbGFzcyBQZXJzb25hQXV0aG9yaXplciB7XG4gIGV2ZW50OiBhbnk7XG4gIGNvbnRleHQ6IGFueTtcbiAgcGVyc29uYUNsaWVudDogUGVyc29uYUNsaWVudCB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihldmVudDogYW55LCBjb250ZXh0OiBhbnkpIHtcbiAgICB0aGlzLmV2ZW50ID0gZXZlbnQ7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcblxuICAgIHRoaXMucGVyc29uYUNsaWVudCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFzeW5jIGhhbmRsZSgpIHtcbiAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIGV2ZW50XCIsIHRoaXMuZXZlbnQpO1xuXG4gICAgaWYgKFxuICAgICAgIXRoaXMuZXZlbnQ/LmF1dGhvcml6YXRpb25Ub2tlbiB8fFxuICAgICAgdGhpcy5ldmVudC5hdXRob3JpemF0aW9uVG9rZW4gPT0gbnVsbFxuICAgICkge1xuICAgICAgY29uc29sZS5sb2coXCJNaXNzaW5nIGF1dGggdG9rZW5cIik7XG4gICAgICByZXR1cm4gdGhpcy5jb250ZXh0LmZhaWwoXCJVbmF1dGhvcml6ZWRcIik7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VkTWV0aG9kQXJuID0gdGhpcy5wYXJzZU1ldGhvZEFybih0aGlzLmV2ZW50Lm1ldGhvZEFybik7XG4gICAgY29uc29sZS5sb2coYFBhcnNlZCBNZXRob2QgQXJuOiAke0pTT04uc3RyaW5naWZ5KHBhcnNlZE1ldGhvZEFybil9YCk7XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuZ2V0U2NvcGUocGFyc2VkTWV0aG9kQXJuKTtcbiAgICBjb25zb2xlLmxvZyhgTWV0aG9kIGhhcyBzY29wZTogJHtzY29wZX1gKTtcblxuICAgIGxldCB2YWxpZGF0aW9uT3B0cyA9IHtcbiAgICAgIHRva2VuOiBfLnJlcGxhY2UodGhpcy5ldmVudC5hdXRob3JpemF0aW9uVG9rZW4sIFwiQmVhcmVyXCIsIFwiXCIpLnRyaW0oKSxcbiAgICB9O1xuICAgIGlmIChzY29wZSAhPSBudWxsKSB7XG4gICAgICB2YWxpZGF0aW9uT3B0cyA9IF8ubWVyZ2UodmFsaWRhdGlvbk9wdHMsIHsgc2NvcGUgfSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGBWYWxpZGF0aW9uIG9wczogJHtKU09OLnN0cmluZ2lmeSh2YWxpZGF0aW9uT3B0cyl9YCk7XG5cbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIFwidmFsaWRhdGluZyB0b2tlbiBhZ2FpbnN0IHJlcXVlc3RcIixcbiAgICAgIGAke3BhcnNlZE1ldGhvZEFybi5yZXNvdXJjZVBhdGh9YCxcbiAgICApO1xuXG4gICAgaWYgKCF2YWxpZGF0aW9uT3B0cy50b2tlbiB8fCB2YWxpZGF0aW9uT3B0cy50b2tlbi5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKFwidG9rZW4gbWlzc2luZ1wiKTtcbiAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuZmFpbChcIlVuYXV0aG9yaXplZFwiKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVjb2RlZFRva2VuID0gYXdhaXQgdGhpcy52YWxpZGF0ZVRva2VuKHZhbGlkYXRpb25PcHRzKTtcbiAgICAgIGNvbnN0IHByaW5jaXBhbElkID0gXy5nZXQoZGVjb2RlZFRva2VuLCBcImF1ZFwiLCBcImludmFsaWRfb2F1dGhcIik7XG4gICAgICBjb25zdCBhdXRoUG9saWN5ID0gdGhpcy5idWlsZEF1dGhQb2xpY3koXG4gICAgICAgIHByaW5jaXBhbElkLFxuICAgICAgICBwYXJzZWRNZXRob2RBcm4sXG4gICAgICAgIHRydWUsXG4gICAgICApO1xuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5zdWNjZWVkKGF1dGhQb2xpY3kpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2coXCJ0b2tlbiB2YWxpZGF0aW9uIGZhaWxlZFwiLCBlcnIpO1xuXG4gICAgICAvLyBJbiB0aGUgY2FzZSBvZiBzdWNlZXNzIC0gdGhlIHByaW5jaXBhbCBpZCBpcyBjb21pbmcgZnJvbSB0aGVcbiAgICAgIC8vIGRlY29kZWQgdG9rZW4uIFdlIGRvbid0IGhhdmUgaXQgaGVyZSBmb3IgdGhlIGNhc2Ugb2YgYW4gaW52YWxpZCB0b2tlbi5cbiAgICAgIC8vIExlYXZpbmcgdGhlIHByb25jaXBhbCBpZCBibGFuayBpbiB0aGUgYXV0aCBwb2xpY3kgZm9yIGRlbnkgZm9yIG5vdy5cbiAgICAgIC8vIEJ1dCBjb3VsZCB0aGlzIGJlIGZvdW5kP1xuICAgICAgY29uc3QgcHJpbmNpcGFsSWQgPSBcIlwiO1xuXG4gICAgICBjb25zdCBhdXRoUG9saWN5ID0gdGhpcy5idWlsZEF1dGhQb2xpY3koXG4gICAgICAgIHByaW5jaXBhbElkLFxuICAgICAgICBwYXJzZWRNZXRob2RBcm4sXG4gICAgICAgIGZhbHNlLFxuICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuc3VjY2VlZChhdXRoUG9saWN5KTtcbiAgICB9XG4gIH1cblxuICB2YWxpZGF0ZVRva2VuKHZhbGlkYXRpb25PcHRzOiBhbnkpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIGFueT4+IHtcbiAgICBjb25zdCBjbGllbnQgPSB0aGlzLmdldFBlcnNvbmFDbGllbnQoKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY2xpZW50LnZhbGlkYXRlVG9rZW4oXG4gICAgICAgIHZhbGlkYXRpb25PcHRzLFxuICAgICAgICAoZXJyb3I6IGFueSwgb2s6IGFueSwgZGVjb2RlZFRva2VuOiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJlamVjdCh7XG4gICAgICAgICAgICAgIGVycm9yOiBlcnJvcixcbiAgICAgICAgICAgICAgdG9rZW46IGRlY29kZWRUb2tlbixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKGRlY29kZWRUb2tlbik7XG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJyZWFrIGRvd24gYW4gQVBJIGdhdGV3YXkgbWV0aG9kIEFSTiBpbnRvIGl0J3MgY29uc3RpdHVlbnQgcGFydHMuXG4gICAqIE1ldGhvZCBBUk5zIHRha2UgdGhlIGZvbGxvd2luZyBmb3JtYXQ6XG4gICAqXG4gICAqICAgYXJuOmF3czpleGVjdXRlLWFwaTo8UmVnaW9uIGlkPjo8QWNjb3VudCBpZD46PEFQSSBpZD4vPFN0YWdlPi88TWV0aG9kPi88UmVzb3VyY2UgcGF0aD5cbiAgICpcbiAgICogZS5nOlxuICAgKlxuICAgKiAgIGFybjphd3M6ZXhlY3V0ZS1hcGk6ZXUtd2VzdC0xOjEyMzphYmMvZGV2ZWxvcG1lbnQvR0VULzIvd29ya3NcbiAgICpcbiAgICogQHBhcmFtIG1ldGhvZEFybiB7c3RyaW5nfSBUaGUgbWV0aG9kIEFSTiBwcm92aWRlZCBieSB0aGUgZXZlbnQgaGFuZGVkIHRvIGEgTGFtYmRhIGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHt7XG4gICAqICAgbWV0aG9kOiBzdHJpbmcsXG4gICAqICAgcmVzb3VyY2VQYXRoOiBzdHJpbmcsXG4gICAqICAgYXBpT3B0aW9uczoge1xuICAgKiAgICAgcmVnaW9uOiBzdHJpbmcsXG4gICAqICAgICByZXN0QXBpSWQ6IHN0cmluZyxcbiAgICogICAgIHN0YWdlOiBzdHJpbmdcbiAgICogICB9LFxuICAgKiAgIGF3c0FjY291bnRJZDogc3RyaW5nXG4gICAqICAgfX1cbiAgICovXG4gIHBhcnNlTWV0aG9kQXJuKG1ldGhvZEFybjogc3RyaW5nKTogUGFyc2VkQXJuIHtcbiAgICBjb25zdCBtZXRob2RBcm5QYXJ0cyA9IG1ldGhvZEFybi5zcGxpdChcIjpcIik7XG4gICAgY29uc29sZS5sb2coYE1ldGhvZCBBUk4gUGFydHM6ICR7SlNPTi5zdHJpbmdpZnkobWV0aG9kQXJuUGFydHMpfWApO1xuICAgIGxldCBhcGlHYXRld2F5QXJuID0gbWV0aG9kQXJuUGFydHNbQVBJX0dBVEVXQVlfQVJOX0lOREVYXTtcbiAgICAvLyBJZiB0aGUgc3BsaXQgY3JlYXRlZCBtb3JlIHRoYW4gdGhlIGV4cGVjdGVkIG51bWJlciBvZiBwYXJ0cywgdGhlbiB0aGVcbiAgICAvLyBhcGlHYXRld2F5QXJuIG11c3QgaGF2ZSBoYWQgb25lIG9yIG1vcmUgOidzIGluIGl0LiBSZWNyZWF0ZSB0aGUgYXBpR2F0ZXdheSBhcm4uXG4gICAgZm9yIChcbiAgICAgIGxldCBpbmRleCA9IE1FVEhPRF9BUk5fSU5ERVhFUy5sZW5ndGg7XG4gICAgICBpbmRleCA8IG1ldGhvZEFyblBhcnRzLmxlbmd0aDtcbiAgICAgIGluZGV4ICs9IDFcbiAgICApIHtcbiAgICAgIGFwaUdhdGV3YXlBcm4gKz0gYDoke21ldGhvZEFyblBhcnRzW2luZGV4XX1gO1xuICAgIH1cblxuICAgIGNvbnN0IGFwaUdhdGV3YXlBcm5QYXJ0cyA9IGFwaUdhdGV3YXlBcm4uc3BsaXQoXCIvXCIpO1xuICAgIGNvbnNvbGUubG9nKGBhcGkgZ2F0ZXdheSBhcm4gcGFydHM6ICR7SlNPTi5zdHJpbmdpZnkoYXBpR2F0ZXdheUFyblBhcnRzKX1gKTtcblxuICAgIC8vIElmIHRoZSBzcGxpdCBjcmVhdGVkIG1vcmUgdGhhbiB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHBhcnRzLCB0aGVuIHRoZVxuICAgIC8vIHJlc291cmNlIHBhdGggbXVzdCBoYXZlIGhhZCBvbmUgb3IgbW9yZSAvJ3MgaW4gaXQuIFJlY3JlYXRlIHRoZSByZXNvdXJjZSBwYXRoLlxuICAgIGxldCByZXNvdXJjZVBhdGggPSBcIlwiO1xuICAgIGZvciAoXG4gICAgICBsZXQgaSA9IEFQSV9HQVRFV0FZX0FSTl9JTkRFWEVTLmxlbmd0aCAtIDE7XG4gICAgICBpIDwgYXBpR2F0ZXdheUFyblBhcnRzLmxlbmd0aDtcbiAgICAgIGkgKz0gMVxuICAgICkge1xuICAgICAgcmVzb3VyY2VQYXRoICs9IGAvJHthcGlHYXRld2F5QXJuUGFydHNbaV19YDtcbiAgICB9XG4gICAgY29uc29sZS5sb2coYHJlc291cmNlIHBhdGg6ICR7SlNPTi5zdHJpbmdpZnkocmVzb3VyY2VQYXRoKX1gKTtcbiAgICByZXR1cm4ge1xuICAgICAgbWV0aG9kOiBhcGlHYXRld2F5QXJuUGFydHNbTUVUSE9EX0lOREVYXSxcbiAgICAgIHJlc291cmNlUGF0aCxcbiAgICAgIGFwaU9wdGlvbnM6IHtcbiAgICAgICAgcmVnaW9uOiBtZXRob2RBcm5QYXJ0c1tSRUdJT05fSU5ERVhdLFxuICAgICAgICByZXN0QXBpSWQ6IGFwaUdhdGV3YXlBcm5QYXJ0c1tBUElfSURfSU5ERVhdLFxuICAgICAgICBzdGFnZTogYXBpR2F0ZXdheUFyblBhcnRzW1NUQUdFX0lOREVYXSxcbiAgICAgIH0sXG4gICAgICBhd3NBY2NvdW50SWQ6IG1ldGhvZEFyblBhcnRzW0FDQ09VTlRfSURfSU5ERVhdLFxuICAgICAgYXBpVmVyc2lvbjogYXBpR2F0ZXdheUFyblBhcnRzW0FQSV9JRF9JTkRFWF0sXG4gICAgfTtcbiAgfVxuXG4gIGdldFNjb3BlKHBhcnNlZE1ldGhvZEFybjogUGFyc2VkQXJuKSB7XG4gICAgY29uc3Qgc2NvcGVDb25maWcgPSBwcm9jZXNzLmVudltcIlNDT1BFX0NPTkZJR1wiXTtcbiAgICBpZiAoc2NvcGVDb25maWcgIT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjb25mID0gSlNPTi5wYXJzZShzY29wZUNvbmZpZyk7XG4gICAgICBmb3IgKGNvbnN0IHBhdGggb2YgT2JqZWN0LmtleXMoY29uZikpIHtcbiAgICAgICAgaWYgKHRoaXMucGF0aE1hdGNoKHBhdGgsIHBhcnNlZE1ldGhvZEFybi5yZXNvdXJjZVBhdGgpKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbmZbcGF0aF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRQZXJzb25hQ2xpZW50KCkge1xuICAgIGlmICh0aGlzLnBlcnNvbmFDbGllbnQgPT0gbnVsbCkge1xuICAgICAgY29uc3QgcGVyc29uYUNvbmZpZyA9IHtcbiAgICAgICAgcGVyc29uYV9ob3N0OiBwcm9jZXNzLmVudltcIlBFUlNPTkFfSE9TVFwiXSxcbiAgICAgICAgcGVyc29uYV9zY2hlbWU6IHByb2Nlc3MuZW52W1wiUEVSU09OQV9TQ0hFTUVcIl0sXG4gICAgICAgIHBlcnNvbmFfcG9ydDogcHJvY2Vzcy5lbnZbXCJQRVJTT05BX1BPUlRcIl0sXG4gICAgICAgIHBlcnNvbmFfb2F1dGhfcm91dGU6IHByb2Nlc3MuZW52W1wiUEVSU09OQV9PQVVUSF9ST1VURVwiXSxcbiAgICAgICAgY2VydF9iYWNrZ3JvdW5kX3JlZnJlc2g6IGZhbHNlLFxuICAgICAgfTtcblxuICAgICAgdGhpcy5wZXJzb25hQ2xpZW50ID0gcGVyc29uYS5jcmVhdGVDbGllbnQoXG4gICAgICAgIGAke3Byb2Nlc3MuZW52W1wiUEVSU09OQV9DTElFTlRfTkFNRVwiXX0gKGxhbWJkYTsgTk9ERV9FTlY9JHtwcm9jZXNzLmVudltcIk5PREVfRU5WXCJdfSlgLFxuICAgICAgICBfLm1lcmdlKHBlcnNvbmFDb25maWcsIHt9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGVyc29uYUNsaWVudDtcbiAgfVxuXG4gIHBhdGhNYXRjaChwYXRoRGVmaW5pdGlvbjogc3RyaW5nLCBwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBwYXRoRGVmaW5pdGlvblBhcnRzID0gcGF0aERlZmluaXRpb24uc3BsaXQoXCIvXCIpO1xuICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuXG4gICAgaWYgKHBhdGhEZWZpbml0aW9uUGFydHMubGVuZ3RoICE9PSBwYXRoUGFydHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXRoRGVmaW5pdGlvblBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBwYXRoRGVmaW5pdGlvblNlZ21lbnQgPSBwYXRoRGVmaW5pdGlvblBhcnRzW2ldO1xuICAgICAgY29uc3QgcGF0aFNlZ21lbnQgPSBwYXRoUGFydHNbaV07XG5cbiAgICAgIGlmIChcbiAgICAgICAgcGF0aERlZmluaXRpb25TZWdtZW50LnN0YXJ0c1dpdGgoXCJ7XCIpICYmXG4gICAgICAgIHBhdGhEZWZpbml0aW9uU2VnbWVudC5lbmRzV2l0aChcIn1cIilcbiAgICAgICkge1xuICAgICAgICAvLyBNYXRjaGVzIHBhdGggYXJndW1lbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNob3VsZCBtYXRjaCBkaXJlY3RseVxuICAgICAgICBpZiAocGF0aERlZmluaXRpb25TZWdtZW50ICE9PSBwYXRoU2VnbWVudCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyB0ZW1wb3JhcnkgSUFNIHBvbGljeSB0aGF0IGFwcGxpZXMgdG8gYSBnaXZlbiByZXNvdXJjZS4gQSBwb2xpY3kgZWl0aGVyIGFsbG93cyBvclxuICAgKiBkZW5pZXMgYWNjZXNzLiBBbGxvd2luZyBhY2Nlc3Mgd2lsbCB0cmlnZ2VyIHRoZSBuZXh0IExhbWJkYSBmdW5jdGlvbiByZXNwb25zaWJsZSBmb3IgaGFuZGxpbmdcbiAgICogdGhlIHJvdXRlLiBEZW55aW5nIGFjY2VzcyB3aWxsIHJldHVybiBhIDQwMyByZXNwb25zZSB0byB0aGUgY2xpZW50LlxuICAgKlxuICAgKiBJbXBvcnRhbnQ6IFRoaXMgbWV0aG9kIGFzc3VtZXMgdGhhdCB0aGUgYXV0aG9yaXplciBUVEwgaXMgc2V0IHRvIDAgKG5vIGNhY2hlKS5cbiAgICogU2VlIHRoaXMgdGhyZWFkIGZvciBtb3JlIGRldGFpbHM6IGh0dHBzOi8vZm9ydW1zLmF3cy5hbWF6b24uY29tL21lc3NhZ2UuanNwYT9tZXNzYWdlSUQ9NzA0MDMwXG4gICAqXG4gICAqIEBwYXJhbSBwcmluY2lwYWxJZCB7c3RyaW5nfSBUaGUgdXNlciByZXF1ZXN0aW5nIGFjY2VzcyB0byB0aGUgcmVzb3VyY2UsIHRoaXMgaXMgYSBKV1QgYXVkIGNsYWltLlxuICAgKiBAcGFyYW0gcGFyc2VkTWV0aG9kQXJuIHt7fX0gQSBtZXRob2QgQVJOIHRoYXQgaWRlbnRpZmllZCB0aGUgcmVzb3VyY2UgYmVpbmcgYWNjZXNzZWQuXG4gICAqIEBwYXJhbSBhbGxvdyB7Ym9vbGVhbn0gSWYgdHJ1ZSwgZ3JhbnQgYWNjZXNzIHRvIHRoZSByZXNvdXJjZS4gSWYgZmFsc2UsIGRlbnkgYWNjZXNzLlxuICAgKiBAcmV0dXJucyB7KnxPYmplY3R9IEEgYnVpbHQgYXV0aCBwb2xpY3kgZG9jdW1lbnQgb2JqZWN0LlxuICAgKi9cbiAgYnVpbGRBdXRoUG9saWN5KFxuICAgIHByaW5jaXBhbElkOiBzdHJpbmcsXG4gICAgcGFyc2VkTWV0aG9kQXJuOiBQYXJzZWRBcm4sXG4gICAgYWxsb3c6IGJvb2xlYW4sXG4gICkge1xuICAgIGNvbnN0IHBvbGljeSA9IG5ldyBBdXRoUG9saWN5KFxuICAgICAgcHJpbmNpcGFsSWQsXG4gICAgICBwYXJzZWRNZXRob2RBcm4uYXdzQWNjb3VudElkLFxuICAgICAgcGFyc2VkTWV0aG9kQXJuLmFwaU9wdGlvbnMsXG4gICAgKTtcblxuICAgIC8vIGNvbnN0IHZlcnNpb25lZFJlc291cmNlUGF0aCA9IGAvJHtwYXJzZWRNZXRob2RBcm4uYXBpVmVyc2lvbn0ke3BhcnNlZE1ldGhvZEFybi5yZXNvdXJjZVBhdGh9YDtcbiAgICBjb25zdCB2ZXJzaW9uZWRSZXNvdXJjZVBhdGggPSBwYXJzZWRNZXRob2RBcm4ucmVzb3VyY2VQYXRoO1xuICAgIGlmIChhbGxvdyA9PT0gdHJ1ZSkge1xuICAgICAgY29uc29sZS5sb2coXCJhbGxvd2luZyByZXF1ZXN0IGZvclwiLCBwcmluY2lwYWxJZCk7XG4gICAgICBwb2xpY3kuYWxsb3dNZXRob2QocGFyc2VkTWV0aG9kQXJuLm1ldGhvZCwgdmVyc2lvbmVkUmVzb3VyY2VQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJkZW55aW5nIHJlcXVlc3QgZm9yXCIsIHByaW5jaXBhbElkKTtcbiAgICAgIHBvbGljeS5kZW55TWV0aG9kKHBhcnNlZE1ldGhvZEFybi5tZXRob2QsIHZlcnNpb25lZFJlc291cmNlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbHRQb2xpY3kgPSBwb2xpY3kuYnVpbGQoKTtcbiAgICBjb25zb2xlLmxvZyhcImFwcGx5aW5nIHBvbGljeVwiLCBidWlsdFBvbGljeSk7XG4gICAgcmV0dXJuIGJ1aWx0UG9saWN5O1xuICB9XG59XG4vKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbiJdfQ==