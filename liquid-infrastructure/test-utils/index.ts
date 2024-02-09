import { TestERC20A } from "../typechain-types";
import { TestERC20B } from "../typechain-types";
import { TestERC20C } from "../typechain-types";
import { LiquidInfrastructureNFT } from "../typechain-types";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { LiquidInfrastructureERC20 } from "../typechain-types";

export async function deployContracts(signer?: HardhatEthersSigner) {

  const testERC20A = await ethers.deployContract("TestERC20A", signer) as unknown as TestERC20A;
  // const testERC20A = await TestERC20A.deploy() as TestERC20A;

  const testERC20B = await ethers.deployContract("TestERC20B", signer) as unknown as TestERC20B;

  const testERC20C = await ethers.deployContract("TestERC20C", signer) as unknown as TestERC20C;

  return { testERC20A, testERC20B, testERC20C };
}

export async function deployERC20A(signer: HardhatEthersSigner) {
  return await ethers.deployContract("TestERC20A", signer) as unknown as TestERC20A;
}

export async function deployLiquidNFT(account: HardhatEthersSigner) {
  return await ethers.deployContract("LiquidInfrastructureNFT", [account.address], account) as unknown as LiquidInfrastructureNFT;
}

export async function deployLiquidERC20(
  owner: HardhatEthersSigner,
  erc20Name: string,
  erc20Symbol: string,
  managedNFTs: string[],
  approvedHolders: string[],
  minDistributionPeriod: number,
  distributableErc20s: string[],
) {
  return await ethers.deployContract("LiquidInfrastructureERC20", [erc20Name, erc20Symbol, managedNFTs, approvedHolders, minDistributionPeriod, distributableErc20s], owner) as unknown as LiquidInfrastructureERC20;
}
