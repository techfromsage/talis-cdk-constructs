import * as cdk from "aws-cdk-lib";
import { aws_logs as awslogs } from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { aws_sns as sns } from "aws-cdk-lib";

import { RouteLambdaProps } from "./route-lambda-props";
import { RouteUrlProps } from "./route-url-props";

export interface AuthenticatedApiProps {
  prefix: string;
  name: string;
  description: string;
  stageName: string;
  lambdaRoutes?: Array<RouteLambdaProps>;
  urlRoutes?: Array<RouteUrlProps>;
  securityGroups?: Array<ec2.ISecurityGroup>;
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  domainName: string;
  certificateArn: string;
  corsDomain?: string[];
  corsAllowCredentials?: boolean;

  // Access logs via CloudWatch log group
  logging?: {
    /** @default false */
    enabled: boolean;
    /** @default JSON */
    format?: string;
    /** @default awslogs.RetentionDays.TWO_YEARS */
    retention?: awslogs.RetentionDays;
  };

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
