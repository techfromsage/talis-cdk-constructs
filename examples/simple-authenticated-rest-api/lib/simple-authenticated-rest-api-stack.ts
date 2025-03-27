import * as cdk from 'aws-cdk-lib';
import { aws_sns as sns } from "aws-cdk-lib";
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import { AuthenticatedRestApi, AuthenticatedRestApiFunction } from "../../../lib";

export const STAGING_TALIS_TLS_CERT_ARN =
  "arn:aws:acm:eu-west-1:302477901552:certificate/46e0fb43-bba8-4aa7-bf98-a3b2038cf760";

export class SimpleAuthenticatedRestApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use AWS_PREFIX to give all resources in this sample
    // a unique name. This is usually `development-xx` where xx are your initials.
    // If you do not set AWS_PREFIX, when you deploy this stack, it may conflict
    // with someone elses stack who has also not set AWS_PREFIX
    const prefix = process.env.AWS_PREFIX
      ? process.env.AWS_PREFIX
      : "development-xx-";

    // AuthenticatedApi requires an existing SNS topic to publish alarms to.
    const alarmTopic = new sns.Topic(
      this,
      `${prefix}simple-authenticated-rest-api-alarm`,
      { topicName: `${prefix}simple-authenticated-rest-api-alarm` },
    );

    // Create the lambda's to be passed into the AuthenticatedApi construct
    const route1Handler = new AuthenticatedRestApiFunction(
      this,
      `${prefix}simple-authenticated-rest-api-route1-handler`,
      {
        name: `${prefix}route1-handler`,
        entry: "src/lambda/route1.js",
        environment: {},
        handler: "route",
        timeout: cdk.Duration.seconds(30),
        // A security group is optional. If you need to specify one, you would do so here:
        // securityGroups: lambdaSecurityGroups,
        // A VPC is optional. If you need to specify one, you would do so here:
        // vpc: vpc,
        // vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      },
    );
  }
}
