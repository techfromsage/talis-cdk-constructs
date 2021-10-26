import { _ } from "lodash";

import { persona } from "talis-node";

class PersonaAuthorizer {
  constructor(event, context) {
    this.event = event;
    this.context = context;

    this.personaClient;
  }

  async handle() {
    const personaConfig = {
      persona_host: process.env.PERSONA_HOST,
      persona_scheme: process.env.PERSONA_SCHEME,
      persona_port: process.env.PERSONA_PORT,
      persona_oauth_route: process.env.PERSONA_OAUTH_ROUTE,
    };

    console.log("Received event", this.event);

    if (this.event.headers.authorization == null) {
      console.log("Missing auth token");
      return this.context.fail("Unauthorized");
    }

    if (this.personaClient == null) {
      this.personaClient = persona.createClient(
        `${process.env.PERSONA_CLIENT_NAME} (lambda; NODE_ENV=${process.env.NODE_ENV})`,
        _.merge(personaConfig, {})
      );
    }

    const parsedMethodArn = this.parseMethodArn(this.event.routeArn);
    console.log(`Parsed Method Arn: ${JSON.stringify(parsedMethodArn)}`);

    const scope = this.getScope(parsedMethodArn);
    console.log(`Method has scope: ${scope}`);

    let validationOpts = {
      token: _.replace(this.event.headers.authorization, "Bearer", "").trim(),
    };
    if (scope != null) {
      validationOpts = _.merge(validationOpts, { scope });
    }
    console.log(`Validation ops: ${JSON.stringify(validationOpts)}`);

    console.log(
      "validating token against request",
      `/${parsedMethodArn.apiVersion}${parsedMethodArn.resourcePath}`
    );

    if (!validationOpts.token || validationOpts.token.length === 0) {
      console.log("token missing");
      return this.context.fail("Unauthorized");
    }

    try {
      await this.validateToken(validationOpts);
      const success = {
        isAuthorized: true,
        context: {
          exampleKey: "exampleValue",
        },
      };
      return this.context.succeed(success);
    } catch (error) {
      console.log("token validation failed", error);
      if (error === persona.errorTypes.INSUFFICIENT_SCOPE) {
        const insuffcientScope = {
          isAuthorized: false,
          context: {
            decsription: "Insufficient Scope",
            exampleKey: "exampleValue",
          },
        };
        return this.context.succeed(insuffcientScope);
      }

      const failure = {
        isAuthorized: false,
        context: {
          exampleKey: "exampleValue",
        },
      };
      return this.context.succeed(failure);
    }
  }

  validateToken(validationOpts) {
    const client = this.personaClient;
    return new Promise(function (resolve, reject) {
      client.validateToken(validationOpts, (error) => {
        if (error) {
          reject(error);
        }
        resolve();
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
   *   apiVersion: string,
   *   apiOptions: {
   *     region: string,
   *     restApiId: string,
   *     stage: string
   *   },
   *   awsAccountId: string
   *   }}
   */
  parseMethodArn(methodArn) {
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

    // If the split created more than the expected number of parts, then the
    // resource path must have had one or more /'s in it. Recreate the resource path.
    let resourcePath = "";
    for (
      let i = API_GATEWAY_ARN_INDEXES.length;
      i < apiGatewayArnParts.length;
      i += 1
    ) {
      resourcePath += `/${apiGatewayArnParts[i]}`;
    }
    return {
      method: apiGatewayArnParts[METHOD_INDEX],
      resourcePath,
      apiVersion: apiGatewayArnParts[RESOURCE_PATH_INDEX],
      apiOptions: {
        region: methodArnParts[REGION_INDEX],
        restApiId: apiGatewayArnParts[API_ID_INDEX],
        stage: apiGatewayArnParts[STAGE_INDEX],
      },
      awsAccountId: methodArnParts[ACCOUNT_ID_INDEX],
    };
  }

  getScope(parsedMethodArn) {
    const conf = {
      aws: {
        api: {
          1: {
            // TODO: Is this needed ? esXlint-disable-next-line no-useless-escape
            "^/route1$": {
              GET: {
                scope: "analytics:admin",
              },
            },
          },
        },
      },
    };

    if (conf.aws.api[parsedMethodArn.apiVersion]) {
      const apiVersion = conf.aws.api[parsedMethodArn.apiVersion];
      for (const pathRegEx of Object.keys(apiVersion)) {
        if (parsedMethodArn.resourcePath.match(pathRegEx)) {
          if (apiVersion[pathRegEx][parsedMethodArn.method]) {
            if (apiVersion[pathRegEx][parsedMethodArn.method].scope) {
              return apiVersion[pathRegEx][parsedMethodArn.method].scope;
            }
          }
        }
        return null;
      }
    }
    return null;
  }
}

module.exports.validateToken = async (event, context) => {
  const route = new PersonaAuthorizer(event, context);
  return await route.handle();
};
