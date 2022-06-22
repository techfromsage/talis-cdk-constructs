import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as sns from "@aws-cdk/aws-sns";

import { RouteLambdaProps } from "./route-lambda-props";
import { RouteUrlProps } from "./route-url-props";

export interface AuthenticatedApiProps {
  prefix: string;
  name: string;
  description: string;
  stageName: string;
  lambdaRoutes: Array<RouteLambdaProps>;
  urlRoutes: Array<RouteUrlProps>;
  securityGroups?: Array<ec2.ISecurityGroup>;
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  domainName: string;
  certificateArn: string;
  corsDomain?: string[];

  // Persona props are all strings - even the port.
  // These are set as environment variables on the Auth Lambda.
  persona: {
    host: string;
    scheme: string;
    port: string;
    oauth_route: string;
  };

  // SNS Topic all alarm actions should be sent to
  alarmTopic: sns.ITopic;

  // The ApiGateway will have an alarm for the latency of responces.
  // This covers all routes in the API. By default the threshold for
  // this alarm will be one second. This default can be overriden by
  // setting the apiLatencyAlarmThreshold property.
  apiLatencyAlarmThreshold?: cdk.Duration;
}
