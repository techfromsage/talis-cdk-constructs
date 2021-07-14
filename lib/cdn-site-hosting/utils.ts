export const getSiteDomain = (props: {
  domainName: string;
  siteSubDomain: string;
}): string => `${props.siteSubDomain}.${props.domainName}`;
