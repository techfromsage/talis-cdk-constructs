import { aws_iam as iam } from 'aws-cdk-lib';

export const CfnRoleProperties: iam.CfnRoleProps = {
  assumeRolePolicyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: ["ec2.amazonaws.com"],
        },
        Action: ["sts:AssumeRole"],
      },
    ],
  },

  // the properties below are optional
  description: "description",
  managedPolicyArns: ["managedPolicyArns"],
  maxSessionDuration: 123,
  path: "path",
  permissionsBoundary: "permissionsBoundary",
  policies: [
    {
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "*",
            Resource: "*",
          },
        ],
      },
      policyName: "policyName",
    },
  ],
  roleName: "roleName",
  tags: [
    {
      key: "key",
      value: "value",
    },
  ],
};
