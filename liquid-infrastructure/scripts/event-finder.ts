import {
  TestERC20A,
  TestERC20B,
  TestERC20C,
  LiquidInfrastructureERC20,
  LiquidInfrastructureNFT,
  ERC20,
} from "../typechain-types";
import fs from "fs";
import commandLineArgs from "command-line-args";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { exit } from "process";
import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AddressLike, BigNumberish } from "ethers";
const hardhat = require("hardhat");
const ethers = hardhat.ethers;

const TestERC20AExpectedAddress = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
const TestERC20BExpectedAddress = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";
const TestERC20CExpectedAddress = "0x0078371BDeDE8aAc7DeBfFf451B74c5EDB385Af7";
const LiquidNFTExpectedAddress = "0xf4e77E5Da47AC3125140c470c71cBca77B5c638c";

async function findEvents() {
  var startTime = new Date();
  const signers = await ethers.getSigners();
  let wallet = signers[0];

  let nft = (await ethers.getContractAt(
    "LiquidInfrastructureNFT",
    LiquidNFTExpectedAddress,
    wallet
  )) as LiquidInfrastructureNFT;
  //   let response = await nft.withdrawBalances([
  //     TestERC20AExpectedAddress,
  //     TestERC20BExpectedAddress,
  //     TestERC20CExpectedAddress,
  //   ]);
  //   let receipt = await response.wait();

  console.log(
    "logs",
    await hardhat.network.provider.send("eth_getLogs", [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        address: LiquidNFTExpectedAddress,
      },
    ])
  );

  //   console.log("Got tx receipt: ", receipt);
  //   console.log("Receipt logs: ", receipt?.logs);
  //   receipt?.logs?.forEach((log) => {
  //     console.log("Found log from withdrawBalances tx: ", log);
  //   });
}

async function main() {
  await findEvents();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
