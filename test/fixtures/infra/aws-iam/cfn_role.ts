import { CfnRoleProps } from "@aws-cdk/aws-iam";

export const CfnRoleProperties: CfnRoleProps = {
  assumeRolePolicyDocument: assumeRolePolicyDocument,

  // the properties below are optional
  description: "description",
  managedPolicyArns: ["managedPolicyArns"],
  maxSessionDuration: 123,
  path: "path",
  permissionsBoundary: "permissionsBoundary",
  policies: [
    {
      policyDocument: PolicyDocument,
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
