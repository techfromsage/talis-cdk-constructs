import * as _ from "lodash";
import { persona, PersonaClient } from "talis-node";

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

export type AuthEvent = {
  authorizationHeader?: string;
  path: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class PersonaAuthorizer {
  event: AuthEvent;
  context: any;
  personaClient: PersonaClient | undefined;

  constructor(event: any, context: any) {
    this.event = event;
    this.context = context;

    this.personaClient = undefined;
  }

  async handle() {
    console.log("Received event", this.event);

console.log("0 header: ", this.event.authorizationHeader);
    if (this.event.authorizationHeader == null) {
      console.log("Missing auth token");
console.log("1 Missing auth token");
      return this.context.fail("Unauthorized");
    }

console.log("2");
    const parsedMethodArn = this.parseMethodArn(this.event.path);
    console.log(`Parsed Method Arn: ${JSON.stringify(parsedMethodArn)}`);

    const scope = this.getScope(parsedMethodArn);
    console.log(`Method has scope: ${scope}`);

    let validationOpts = {
      token: _.replace(
        this.event.authorizationHeader,
        "Bearer",
        "",
      ).trim(),
    };
    if (scope != null) {
      validationOpts = _.merge(validationOpts, { scope });
    }
    console.log(`Validation ops: ${JSON.stringify(validationOpts)}`);

    console.log(
      "validating token against request",
      `${parsedMethodArn.resourcePath}`,
    );

    if (!validationOpts.token || validationOpts.token.length === 0) {
      console.log("token missing");
      return this.context.fail("Unauthorized");
    }

    try {
      const token = await this.validateToken(validationOpts);
      const success = {
        isAuthorized: true,
        context: {
          clientId: token["sub"],
        },
      };
      return this.context.succeed(success);
    } catch (err) {
      console.log("token validation failed", err);

      const error = err as { error: any; token: Record<string, any> };

      if (error.error === persona.errorTypes.INSUFFICIENT_SCOPE) {
        const insufficientScope = {
          isAuthorized: false,
          context: {
            description: "Insufficient Scope",
            clientId: error?.token ? error.token["sub"] : "",
          },
        };
        return this.context.succeed(insufficientScope);
      }

      const failure = {
        isAuthorized: false,
        context: {
          clientId: error?.token ? error.token["sub"] : "",
        },
      };
      return this.context.succeed(failure);
    }
  }

  validateToken(validationOpts: any): Promise<Record<string, any>> {
console.log("VT 1");
console.log("opts", validationOpts);
    const client = this.getPersonaClient();
console.log("VT 2");
    return new Promise(function (resolve, reject) {
console.log("VT 3");
      client.validateToken(
        validationOpts,
        (error: any, ok: any, decodedToken: any) => {
console.log("VT 4");
          if (error) {
console.log("VT 5");
            reject({
              error: error,
              token: decodedToken,
            });
          }
console.log("VT 6");
          resolve(decodedToken);
        },
      );
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
  parseMethodArn(methodArn: string): ParsedArn {
    const methodArnParts = methodArn.split(":");
    console.log(`Method ARN Parts: ${JSON.stringify(methodArnParts)}`);
    let apiGatewayArn = methodArnParts[API_GATEWAY_ARN_INDEX];
    // If the split created more than the expected number of parts, then the
    // apiGatewayArn must have had one or more :'s in it. Recreate the apiGateway arn.
    for (
      let index = METHOD_ARN_INDEXES.length;
      index < methodArnParts.length;
      index += 1
    ) {
      apiGatewayArn += `:${methodArnParts[index]}`;
    }

    const apiGatewayArnParts = apiGatewayArn.split("/");
    console.log(`api gateway arn parts: ${JSON.stringify(apiGatewayArnParts)}`);

    // If the split created more than the expected number of parts, then the
    // resource path must have had one or more /'s in it. Recreate the resource path.
    let resourcePath = "";
    for (
      let i = API_GATEWAY_ARN_INDEXES.length - 1;
      i < apiGatewayArnParts.length;
      i += 1
    ) {
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
    };
  }

  getScope(parsedMethodArn: ParsedArn) {
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

      this.personaClient = persona.createClient(
        `${process.env["PERSONA_CLIENT_NAME"]} (lambda; NODE_ENV=${process.env["NODE_ENV"]})`,
        _.merge(personaConfig, {}),
      );
    }

    return this.personaClient;
  }

  pathMatch(pathDefinition: string, path: string): boolean {
    const pathDefinitionParts = pathDefinition.split("/");
    const pathParts = path.split("/");

    if (pathDefinitionParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < pathDefinitionParts.length; i++) {
      const pathDefinitionSegment = pathDefinitionParts[i];
      const pathSegment = pathParts[i];

      if (
        pathDefinitionSegment.startsWith("{") &&
        pathDefinitionSegment.endsWith("}")
      ) {
        // Matches path argument
      } else {
        // Should match directly
        if (pathDefinitionSegment !== pathSegment) {
          return false;
        }
      }
    }

    return true;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
