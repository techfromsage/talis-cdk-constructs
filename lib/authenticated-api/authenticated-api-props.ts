import { RouteLambdaProps } from "./route-lambda-props";

export interface AuthenticatedApiProps {
  prefix: string;
  name: string;
  description: string;
  stageName: string;
  authenticateAllRoutes: boolean;

  // Persona props are all strings - even the port.
  // These are set as environment variables on the Auth Lambda.
  persona: {
    host: string;
    scheme: string;
    port: string;
    oauth_route: string;
  };

  routes: Array<RouteLambdaProps>;
}
