import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as sns from "@aws-cdk/aws-sns";

import { AuthenticatedApi, AuthenticatedApiFunction } from "../../../lib";

export const STAGING_TALIS_TLS_CERT_ARN =
  "arn:aws:acm:eu-west-1:302477901552:certificate/46e0fb43-bba8-4aa7-bf98-a3b2038cf760";

export class SimpleAuthenticatedApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use AWS_PREFIX to give all resources in this sample
    // a unique name. This is usually `development-xx` where xx are your initials.
    // If you do not set AWS_PREFIX, when you deploy this stack, it may conflict
    // with someone elses stack who has also not set AWS_PREFIX
    const prefix = process.env.AWS_PREFIX
      ? process.env.AWS_PREFIX
      : "development-xx-";

    // AuthenticatedApi requires an existing SNS topic to publish alarms to.
    // TODO : A real app would not create this topic which is already created by terraform.
    // Can we pull in this alarm which is defined in terraform as an example of how to do that
    const alarmTopic = new sns.Topic(
      this,
      `${prefix}simple-lambda-Worker-alarm`,
      { topicName: `${prefix}simple-authenticated-api-alarm` }
    );

    const vpc = ec2.Vpc.fromLookup(this, `${prefix}-vpc`, {
      vpcId: "vpc-0155db5e1ab5c28b6",
    });

    // Setting a security group is an option. This is an example of importing and using a
    // pre existing security group. This one is defined in terraform.
    // An ulterior motive for importing this security group is that without specifying
    // one, the default group created will add significant time to deploy and destroy
    // steps in the build. This is not a problem IRL where the group will only be created
    // once instead of being created and destroyed on every build.
    const lambdaSecurityGroups = [
      ec2.SecurityGroup.fromSecurityGroupId(
        this,
        "a-talis-cdk-constructs-build",
        "sg-0ac646f0077b5ce03",
        {
          mutable: false,
        }
      ),
    ];

    // Create the lambda's to be passed into the AuthenticatedApi construct
    const route1Handler = new AuthenticatedApiFunction(
      this,
      `${prefix}simple-authenticated-api-route1-handler`,
      {
        name: `${prefix}route1-handler`,
        entry: "src/lambda/route1.js",
        environment: {},
        handler: "route",
        timeout: cdk.Duration.seconds(30),
        securityGroups: lambdaSecurityGroups,
        vpc: vpc,
      }
    );

    const route2Handler = new AuthenticatedApiFunction(
      this,
      `${prefix}simple-authenticated-api-route2-handler`,
      {
        name: `${prefix}route2-handler`,
        entry: "src/lambda/route2.js",
        environment: {},
        handler: "route",
        timeout: cdk.Duration.seconds(30),
        securityGroups: lambdaSecurityGroups,
        vpc: vpc,
      }
    );

    /* const api = */ new AuthenticatedApi(
      this,
      `${prefix}simple-authenticated-api`,
      {
        prefix,
        name: `simple-authenticated-api`,
        description: "A simple example API",
        stageName: "development", // This should be development / staging / production as appropriate
        alarmTopic,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        securityGroups: lambdaSecurityGroups,
        domainName: `${prefix}simple-authenticated-api.talis.com`,
        certificateArn: STAGING_TALIS_TLS_CERT_ARN,
        corsDomain: [
          "http://localhost:4200",
          `https://${prefix}simple-authenticated-api.talis.com`,
        ],

        persona: {
          host: "staging-users.talis.com",
          scheme: "https",
          port: "443",
          oauth_route: "/oauth/tokens/",
        },

        routes: [
          {
            name: "route1",
            paths: ["/1/route1"],
            method: apigatewayv2.HttpMethod.GET,
            lambda: route1Handler,
            requiredScope: "analytics:admin",
          },
          {
            name: "route2",
            paths: ["/1/route2"],
            method: apigatewayv2.HttpMethod.GET,
            lambda: route2Handler,
            isPublic: true,
          },
        ],
      }
    );
  }
}
