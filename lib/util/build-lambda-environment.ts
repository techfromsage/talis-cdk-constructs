import { FunctionOptions } from "@aws-cdk/aws-lambda";

/**
 * Build environment variables for a lambda function based on the options.
 *
 * Generally, it grabs `environment` from the options and adds the following:
 * - `LAMBDA_EXECUTION_TIMEOUT` - The timeout of the lambda function in seconds.
 *
 * Values in `environment` take precedence.
 *
 * Please note that every lambda also has reserved environment variables:
 * https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
 *
 * @param options Lambda function options
 * @returns Key-value pairs
 */
export function buildLambdaEnvironment(options: Partial<FunctionOptions>): {
  [key: string]: string;
} {
  const environment: { [key: string]: string } = {};

  if (options.timeout) {
    environment.LAMBDA_EXECUTION_TIMEOUT = options.timeout
      .toSeconds()
      .toString();
  }

  if (options.environment) {
    Object.assign(environment, options.environment);
  }

  return environment;
}
