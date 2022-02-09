import { CfnSecurityGroupProps } from "@aws-cdk/aws-ec2";

export const CfnSecurityGroupProperties: CfnSecurityGroupProps = {
  groupDescription: "groupDescription",

  // the properties below are optional
  groupName: "groupName",
  securityGroupEgress: [
    {
      ipProtocol: "ipProtocol",

      // the properties below are optional
      cidrIp: "cidrIp",
      cidrIpv6: "cidrIpv6",
      description: "description",
      destinationPrefixListId: "destinationPrefixListId",
      destinationSecurityGroupId: "destinationSecurityGroupId",
      fromPort: 123,
      toPort: 123,
    },
  ],
  securityGroupIngress: [
    {
      ipProtocol: "ipProtocol",

      // the properties below are optional
      cidrIp: "cidrIp",
      cidrIpv6: "cidrIpv6",
      description: "description",
      fromPort: 123,
      sourcePrefixListId: "sourcePrefixListId",
      sourceSecurityGroupId: "sourceSecurityGroupId",
      sourceSecurityGroupName: "sourceSecurityGroupName",
      sourceSecurityGroupOwnerId: "sourceSecurityGroupOwnerId",
      toPort: 123,
    },
  ],
  tags: [
    {
      key: "key",
      value: "value",
    },
  ],
  vpcId: "vpcId",
};
