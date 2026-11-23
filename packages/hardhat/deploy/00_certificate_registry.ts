import { artifacts, deployScript } from "../rocketh/deploy.js";

export default deployScript(async env => {
  await env.deploy("CertificateRegistry", {
    account: env.namedAccounts.deployer,
    artifact: artifacts.CertificateRegistry,
    args: [],
  });
}, { tags: ["CertificateRegistry"] });
