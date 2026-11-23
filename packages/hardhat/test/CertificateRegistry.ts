import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();
const hash = ethers.sha256(ethers.toUtf8Bytes("certificate"));

async function setup() {
  const [teacher, student] = await ethers.getSigners();
  const registry = await ethers.deployContract("CertificateRegistry", teacher);
  const guest = await ethers.getContractAt("CertificateRegistry", await registry.getAddress(), student);
  return { registry, guest, teacher };
}

describe("CertificateRegistry", () => {
  it("uses the deployer as teacher and allows public reads", async () => {
    const { registry, guest, teacher } = await networkHelpers.loadFixture(setup);
    expect(await registry.teacher()).to.equal(teacher.address);
    expect(await guest.getStatus(hash)).to.equal(0);
  });

  it("issues a certificate and logs its hash and valid status", async () => {
    const { registry, guest } = await networkHelpers.loadFixture(setup);
    await expect(registry.issueCertificate(hash)).to.emit(registry, "CertificateStatusChanged").withArgs(hash, 1);
    expect(await guest.getStatus(hash)).to.equal(1);
    expect(await guest.getStatus(ethers.id("other"))).to.equal(0);
  });

  it("revokes permanently and logs the revoked status", async () => {
    const { registry } = await networkHelpers.loadFixture(setup);
    await registry.issueCertificate(hash);
    await expect(registry.revokeCertificate(hash)).to.emit(registry, "CertificateStatusChanged").withArgs(hash, 2);
    await expect(registry.issueCertificate(hash)).to.be.revertedWith("Already registered");
    await expect(registry.revokeCertificate(hash)).to.be.revertedWith("Certificate not valid");
    expect(await registry.getStatus(hash)).to.equal(2);
  });

  it("rejects both writes by another account", async () => {
    const { registry, guest } = await networkHelpers.loadFixture(setup);
    await expect(guest.issueCertificate(hash)).to.be.revertedWith("Only teacher");
    await registry.issueCertificate(hash);
    await expect(guest.revokeCertificate(hash)).to.be.revertedWith("Only teacher");
    expect(await registry.getStatus(hash)).to.equal(1);
  });

  it("rejects zero, unknown revocations and duplicate issuance", async () => {
    const { registry } = await networkHelpers.loadFixture(setup);
    await expect(registry.issueCertificate(ethers.ZeroHash)).to.be.revertedWith("Zero hash");
    await expect(registry.revokeCertificate(ethers.ZeroHash)).to.be.revertedWith("Certificate not valid");
    await expect(registry.revokeCertificate(hash)).to.be.revertedWith("Certificate not valid");
    await registry.issueCertificate(hash);
    await expect(registry.issueCertificate(hash)).to.be.revertedWith("Already registered");
    expect(await registry.getStatus(hash)).to.equal(1);
  });
});
