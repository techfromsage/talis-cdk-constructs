const _ = require('lodash');
const { persona } = require('talis-node');
const AuthPolicy = require('./authPolicy');

// let config;
let personaClient;

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
const parseMethodArn = function parseMethodArn(methodArn/*, logger */) {
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

  const methodArnParts = methodArn.split(':');
console.log(`X Method ARN Parts: ${JSON.stringify(methodArnParts)}`);
  let apiGatewayArn = methodArnParts[API_GATEWAY_ARN_INDEX];
console.log(`api gateway arn 1: ${apiGatewayArn}`);
  // If the split created more than the expected number of parts, then the
  // apiGatewayArn must have had one or more :'s in it. Recreate the apiGateway arn.
  for (let index = METHOD_ARN_INDEXES.length; index < methodArnParts.length; index += 1) {
    apiGatewayArn += `:${methodArnParts[index]}`;
  }
console.log(`api gateway arn 2: ${apiGatewayArn}`);

  const apiGatewayArnParts = apiGatewayArn.split('/');
console.log(`api gateway ARN Parts: ${JSON.stringify(apiGatewayArnParts)}`);
  // If the split created more than the expected number of parts, then the
  // resource path must have had one or more /'s in it. Recreate the resource path.
  let resourcePath = '';
  for (let i = API_GATEWAY_ARN_INDEXES.length; i < apiGatewayArnParts.length; i += 1) {
    resourcePath += `/${apiGatewayArnParts[i]}`;
  }
console.log(`resource path: ${JSON.stringify(resourcePath)}`);
  const result = {
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
  console.log(`Auth Policy: ${JSON.stringify(result)}`);
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
};

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
 * @param {Logger} A Winston logger object for debugging what this function does.
 * @returns {*|Object} A built auth policy document object.
 */
const buildAuthPolicy = function buildAuthPolicy(principalId, parsedMethodArn, allow/*, logger */) {
  const policy = new AuthPolicy(
    principalId,
    parsedMethodArn.awsAccountId,
    parsedMethodArn.apiOptions,
  );

  const versionedResourcePath = `/${parsedMethodArn.apiVersion}${parsedMethodArn.resourcePath}`;
  if (allow === true) {
    console.log('allowing request for', principalId);
    policy.allowMethod(parsedMethodArn.method, versionedResourcePath);
  } else {
    console.log('denying request for', principalId);
    policy.denyMethod(parsedMethodArn.method, versionedResourcePath);
  }

  const builtPolicy = policy.build();
  console.log('applying policy', builtPolicy);
  return builtPolicy;
};

const getScope = function getScope(/*conf,*/ parsedMethodArn) {

  const conf = {
    aws: {
      api: {
        1: {
          // eslint-disable-next-line no-useless-escape
          '^\/route1$': {
            GET: {
              scope: 'analytics:admin',
            },
          },
        },
      }
    },
  };

  if (conf.aws.api[parsedMethodArn.apiVersion]) {
    const apiVersion = conf.aws.api[parsedMethodArn.apiVersion];
    for (pathRegEx of Object.keys(apiVersion)) {
    // for (pathRegEx in apiVersion) {
      if (parsedMethodArn.resourcePath.match(pathRegEx)) {
        if (apiVersion[pathRegEx][parsedMethodArn.method]) {
          if (apiVersion[pathRegEx][parsedMethodArn.method].scope) {
            return apiVersion[pathRegEx][parsedMethodArn.method].scope;
          }
        }
      }
      return null;
    };
  }
  return null;
};

/**
 * Lambda function that validates an OAuth token prior to accessing an API gateway route.
 * @param {{}} event The lambda event object:
 *
 *   {
 *     "type":"TOKEN",
 *     "authorizationToken":"<Incoming bearer token>",
 *     "methodArn":"arn:aws:execute-api:<Region id>:<Account id>:<APIid>/<Stage>/<Method>/<Path>"
 *   }
 *
 * @param {{}} context The Lambda context object.
 * - If validation passes the context's succeed function will be called.
 * - If validation fails with an invalid/expired token, the context's fail function will be
 * called and an auth policy will be created to allow access to the resource identified by the path.
 * - If validation fails because the token does not contain the scope required by the given
 * resource, the context's succeed function will be called but the auth policy will deny access
 * to the resource.
 */
exports.validateToken = function validateToken(event, context) {
  // if (config == null) {
  //       config = require('../../../config'); // eslint-disable-line
  // }
  const personaConfig = {
    persona_host: process.env.PERSONA_HOST,
    persona_scheme: process.env.PERSONA_SCHEME,
    persona_port: process.env.PERSONA_PORT,
    persona_oauth_route: process.env.PERSONA_OAUTH_ROUTE,
  };

    // var logger = require('../../lib/logger')(config); // eslint-disable-line
  // logger.verbose('Received event', event);
  console.log('Received event', event);

  // if (event.authorizationToken == null) {
  if (event.headers.authorization == null) {
    console.log('Missing auth token');
    return context.fail('Unauthorized');
  }

  if (personaClient == null) {
    personaClient = persona.createClient(`${process.env.PERSONA_CLIENT_NAME} (lambda; NODE_ENV=${process.env.NODE_ENV})`, _.merge(personaConfig/*config.persona*/, {
      // logger,
    }));
  }

  // const parsedMethodArn = parseMethodArn(event.methodArn/*, logger */);
  const parsedMethodArn = parseMethodArn(event.routeArn/*, logger */);
  console.log(`Parsed Method Arn: ${JSON.stringify(parsedMethodArn)}`);

  const scope = getScope(/*config,*/ parsedMethodArn);
  console.log(`Method has scope: ${scope}`);

  let validationOpts = {
    // token: _.replace(event.authorizationToken, 'Bearer', '').trim(),
    token: _.replace(event.headers.authorization, 'Bearer', '').trim(),
  };
  if (scope != null) {
    validationOpts = _.merge(validationOpts, { scope });
  }
  console.log(`Validation ops: ${JSON.stringify(validationOpts)}`);

  console.log('validating token against request', `/${parsedMethodArn.apiVersion}${parsedMethodArn.resourcePath}`);

  if (!validationOpts.token || validationOpts.token.length === 0) {
    console.log('token missing');
    return context.fail('Unauthorized');
  }

  personaClient.validateToken(validationOpts, (error, __, decodedToken) => {
   // TODO See https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
   // API Gateway V2 doesn't return a policy. It returns a JSON object as bellow
   const success =
   {
     isAuthorized: true,
       context: {
         exampleKey: "exampleValue"
       }
   };
   const insuffcientScope =
   {
     isAuthorized: false,
       context: {
         decsription: "Insufficient Scope",
         exampleKey: "exampleValue",
       }
   };
   const failure =
   {
     isAuthorized: false,
       context: {
         exampleKey: "exampleValue"
       }
   };

    // Token validation failure cannot always return the token for various reasons.
    const principalId = _.get(decodedToken, 'aud', 'invalid_oauth');
    let authPolicy;
    if (error) {
      console.log('token validation failed', error);
      if (error === persona.errorTypes.INSUFFICIENT_SCOPE) {
        // authPolicy = buildAuthPolicy(principalId, parsedMethodArn, false /*, logger */);
        // Must call succeed to return a 403 status code.
        // return context.succeed(authPolicy);
// TODO How to return 403?
        return context.succeed(success);
      }
      // return context.fail('Unauthorized');
      return context.success(failure);
    }

    // authPolicy = buildAuthPolicy(principalId, parsedMethodArn, true /*, logger */);
    // return context.succeed(authPolicy);
    return context.succeed(success);
  });

  return null; // Added in for linting - previously no return!
};
            // return apiVersion[pathRegEx][parsedMethodArn.method].scope;
          // }
        // }
      // }
// console.log('MSL 8');
      // return null;
    // });
  // }
// console.log('MSL 9');
  // return null;
// };

/**
 * Lambda function that validates an OAuth token prior to accessing an API gateway route.
 * @param {{}} event The lambda event object:
 *
 *   {
 *     "type":"TOKEN",
 *     "authorizationToken":"<Incoming bearer token>",
 *     "methodArn":"arn:aws:execute-api:<Region id>:<Account id>:<APIid>/<Stage>/<Method>/<Path>"
 *   }
 *
 * @param {{}} context The Lambda context object.
 * - If validation passes the context's succeed function will be called.
 * - If validation fails with an invalid/expired token, the context's fail function will be
 * called and an auth policy will be created to allow access to the resource identified by the path.
 * - If validation fails because the token does not contain the scope required by the given
 * resource, the context's succeed function will be called but the auth policy will deny access
 * to the resource.
 */
//exports.validateToken = function validateToken(event, context) {
//  // if (config == null) {
//  //       config = require('../../../config'); // eslint-disable-line
//  // }
//  const personaConfig = {
//    persona_host: process.env.PERSONA_HOST,
//    persona_scheme: process.env.PERSONA_SCHEME,
//    persona_port: process.env.PERSONA_PORT,
//    persona_oauth_route: process.env.PERSONA_OAUTH_ROUTE,
//  };

//    // var logger = require('../../lib/logger')(config); // eslint-disable-line
//  // logger.verbose('Received event', event);
//  console.log('Received event', event);

//  // if (event.authorizationToken == null) {
//  if (event.headers.authorization == null) {
//    console.log('Missing auth token');
//    return context.fail('Unauthorized');
//  }

//  if (personaClient == null) {
//    personaClient = persona.createClient(`${process.env.PERSONA_CLIENT_NAME} (lambda; NODE_ENV=${process.env.NODE_ENV})`, _.merge(personaConfig/*config.persona*/, {
//      // logger,
//    }));
//  }

//  // const parsedMethodArn = parseMethodArn(event.methodArn/*, logger */);
//  const parsedMethodArn = parseMethodArn(event.routeArn/*, logger */);
//  console.log(`Parsed Method Arn: ${JSON.stringify(parsedMethodArn)}`);

//  const scope = getScope(/*config,*/ parsedMethodArn);
//  console.log(`Method has scope: ${scope}`);

//  let validationOpts = {
//    // token: _.replace(event.authorizationToken, 'Bearer', '').trim(),
//    token: _.replace(event.headers.authorization, 'Bearer', '').trim(),
//  };
//  if (scope != null) {
//    validationOpts = _.merge(validationOpts, { scope });
//  }
//  console.log(`Validation ops: ${JSON.stringify(validationOpts)}`);

//  console.log('validating token against request', `/${parsedMethodArn.apiVersion}${parsedMethodArn.resourcePath}`);

//  if (!validationOpts.token || validationOpts.token.length === 0) {
//    console.log('token missing');
//    return context.fail('Unauthorized');
//  }

//  personaClient.validateToken(validationOpts, (error, __, decodedToken) => {

//    // TODO See https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
//    // API Gateway V2 doesn't return a policy. It returns a JSON object as bellow
//    const success =
//    {
//      isAuthorized: true,
//        context: {
//          exampleKey: "exampleValue"
//        }
//    };
//    const insuffcientScope =
//    {
//      isAuthorized: false,
//        context: {
//          decsription: "Insufficient Scope",
//          exampleKey: "exampleValue",
//        }
//    };
//    const failure =
//    {
//      isAuthorized: false,
//        context: {
//          exampleKey: "exampleValue"
//        }
//    };


//    // Token validation failure cannot always return the token for various reasons.
//    const principalId = _.get(decodedToken, 'aud', 'invalid_oauth');
//    let authPolicy;
//    if (error) {
//      console.log('token validation failed', error);
//      if (error === persona.errorTypes.INSUFFICIENT_SCOPE) {
//        authPolicy = buildAuthPolicy(principalId, parsedMethodArn, false /*, logger */);
//        // Must call succeed to return a 403 status code.
//        //return context.succeed(authPolicy);
//        return context.fail(insuffcientScope);
//      }
//      // return context.fail('Unauthorized');
//      return context.fail(failure);
//    }

//    // authPolicy = buildAuthPolicy(principalId, parsedMethodArn, true /*, logger */);
//    // return context.succeed(authPolicy);
//    return context.succeed(success);
//  });

//  return null; // Added in for linting - previously no return!
//};
