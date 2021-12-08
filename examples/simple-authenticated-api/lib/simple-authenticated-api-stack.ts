import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";

import { AuthenticatedApi } from "../../../lib";

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

    /* const lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId( */
    /*   this, */
    /*   "depot-serverless-lambda-security-group", */
    /*   "sg-002cdd87d0c5a0fb0", */
    /*   { */
    /*     mutable: false, */
    /*   } */
    /* ); */
    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      "stack-security-group",
      {
        vpc: vpc,
        description: `${prefix}simple-lambda-worker  Security Group`,
        allowAllOutbound: true,
      }
    );

    const api = new AuthenticatedApi(this, "simple-authenticated-api", {
      prefix,
      name: "simple-authenticated-api",
      description: "A simple example API",
      stageName: "development", // This should be development / staging / production as appropriate
      alarmTopic,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      securityGroup: lambdaSecurityGroup,

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
          lambdaProps: {
            entry: "src/lambda/route1.js",
            handler: "route",
            timeout: cdk.Duration.seconds(30),
          },
          requiredScope: "analytics:admin",
        },
        {
          name: "route2",
          paths: ["/1/route2"],
          method: apigatewayv2.HttpMethod.GET,
          lambdaProps: {
            entry: "src/lambda/route2.js",
            handler: "route",
            timeout: cdk.Duration.seconds(30),
          },
          isPublic: true,
        },
      ],
    });

    api.node.addDependency(lambdaSecurityGroup);
  }
}
