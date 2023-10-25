export const getSiteDomain = (props: {
  domainName: string;
  siteSubDomain: string;
}): string => `${props.siteSubDomain}.${props.domainName}`;

export const getAliases = (props: {
  domainName: string;
  siteSubDomain: string;
  aliasSubDomains?: string[];
}): string[] => {
  const aliases = props.aliasSubDomains
    ? props.aliasSubDomains.map((alias) => `${alias}.${props.domainName}`)
    : [];
  aliases.push(getSiteDomain(props));
  return aliases;
};
