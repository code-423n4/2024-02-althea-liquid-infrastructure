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
import { exit } from "process";
import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AddressLike, BigNumberish } from "ethers";
const hardhat = require("hardhat");
const ethers = hardhat.ethers;

// Create constants for each of the TestERC20*'s and for the liquid nft and liquid erc20
const TestERC20AExpectedAddress = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
const TestERC20BExpectedAddress = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";
const TestERC20CExpectedAddress = "0x0078371BDeDE8aAc7DeBfFf451B74c5EDB385Af7";
const LiquidNFTExpectedAddress = "0xf4e77E5Da47AC3125140c470c71cBca77B5c638c";
const LiquidERC20ExpectedAddress = "0xf784709d2317d872237c4bc22f867d1bae2913ab";

async function deploy() {
  console.log("Enter deploy function");
  var startTime = new Date();
  const signers = await ethers.getSigners();
  let wallet = signers[0];

  var success = false;
  while (!success) {
    console.log("Looping until connection to network is made");
    var present = new Date();
    var timeDiff: number = present.getTime() - startTime.getTime();
    timeDiff = timeDiff / 1000;
    try {
      const number = await ethers.provider.getBlockNumber();
      success = true;
    } catch (e) {
      console.log("Ethereum RPC error, trying again");
    }

    if (timeDiff > 600) {
      console.log(
        "Could not contact Ethereum RPC after 10 minutes, check the URL!"
      );
      exit(1);
    }
    await sleep(1000);
  }
  console.log("Connected to network");

  // this handles several possible locations for the ERC20 artifacts
  var erc20_a_path: string;
  var erc20_b_path: string;
  var erc20_c_path: string;
  var liquid_nft_path: string;
  var liquid_erc20_path: string;

  const erc20_a_main =
    "/liquid/contracts/artifacts/contracts/TestERC20A.sol/TestERC20A.json";
  const erc20_b_main =
    "/liquid/contracts/artifacts/contracts/TestERC20B.sol/TestERC20B.json";
  const erc20_c_main =
    "/liquid/contracts/artifacts/contracts/TestERC20C.sol/TestERC20C.json";
  const liquid_nft_main =
    "/liquid/contracts/artifacts/contracts/LiquidInfrastructureNFT.sol/LiquidInfrastructureNFT.json";
  const liquid_erc20_main =
    "/liquid/contracts/artifacts/contracts/LiquidInfrastructureERC20.sol/LiquidInfrastructureERC20.json";

  const alt_location_1_a =
    "./artifacts/contracts/TestERC20A.sol/TestERC20A.json";
  const alt_location_1_b =
    "./artifacts/contracts/TestERC20B.sol/TestERC20B.json";
  const alt_location_1_c =
    "./artifacts/contracts/TestERC20C.sol/TestERC20C.json";
  const liquid_nft_alt_1 =
    "./artifacts/contracts/LiquidInfrastructureNFT.sol/LiquidInfrastructureNFT.json";
  const liquid_erc20_alt_1 =
    "./artifacts/contracts/LiquidInfrastructureERC20.sol/LiquidInfrastructureERC20.json";

  const alt_location_2_a = "TestERC20A.json";
  const alt_location_2_b = "TestERC20B.json";
  const alt_location_2_c = "TestERC20C.json";
  const liquid_nft_alt_2 = "LiquidInfrastructureNFT.json";
  const liquid_erc20_alt_2 = "LiquidInfrastructureERC20.json";

  if (fs.existsSync(erc20_a_main)) {
    erc20_a_path = erc20_a_main;
    erc20_b_path = erc20_b_main;
    erc20_c_path = erc20_c_main;
    liquid_nft_path = liquid_nft_main;
    liquid_erc20_path = liquid_erc20_main;
  } else if (fs.existsSync(alt_location_1_a)) {
    erc20_a_path = alt_location_1_a;
    erc20_b_path = alt_location_1_b;
    erc20_c_path = alt_location_1_c;
    liquid_nft_path = liquid_nft_alt_1;
    liquid_erc20_path = liquid_erc20_alt_1;
  } else if (fs.existsSync(alt_location_2_a)) {
    erc20_a_path = alt_location_2_a;
    erc20_b_path = alt_location_2_b;
    erc20_c_path = alt_location_2_c;
    liquid_nft_path = liquid_nft_alt_2;
    liquid_erc20_path = liquid_erc20_alt_2;
  } else {
    console.log(
      "Test mode was enabled but the ERC20 contracts can't be found!"
    );
    exit(1);
  }

  let deployed;

  let testERC20A;
  let testERC20B;
  let testERC20C;
  let liquidNFT;
  let liquidERC20;

  let contractsDeployed = false;

  let erc20TestAddressA;
  deployed = (await ethers.getContractAt(
    "TestERC20A",
    TestERC20AExpectedAddress,
    wallet
  )) as TestERC20A;
  if ((await deployed.getDeployedCode()) != null) {
    testERC20A = deployed;
    erc20TestAddressA = await deployed.getAddress();
    console.log("ERC20 found at Address - ", erc20TestAddressA);
  } else {
    contractsDeployed = true;
    const { abi: abiA, bytecode: bytecodeA } =
      getContractArtifacts(erc20_a_path);
    const erc20FactoryA = new ethers.ContractFactory(abiA, bytecodeA, wallet);
    testERC20A = (await erc20FactoryA.deploy()) as TestERC20A;
    await testERC20A.waitForDeployment();
    erc20TestAddressA = await testERC20A.getAddress();
    console.log("ERC20 deployed at Address - ", erc20TestAddressA);
  }

  let erc20TestAddressB;
  deployed = (await ethers.getContractAt(
    "TestERC20B",
    TestERC20BExpectedAddress,
    wallet
  )) as TestERC20B;
  if ((await deployed.getDeployedCode()) != null) {
    testERC20B = deployed;
    erc20TestAddressB = await testERC20B.getAddress();
    console.log("ERC20 found at Address - ", erc20TestAddressB);
  } else {
    contractsDeployed = true;
    const { abi: abiB, bytecode: bytecodeB } =
      getContractArtifacts(erc20_b_path);
    const erc20FactoryB = new ethers.ContractFactory(abiB, bytecodeB, wallet);
    testERC20B = (await erc20FactoryB.deploy()) as TestERC20B;
    await testERC20B.waitForDeployment();
    erc20TestAddressB = await testERC20B.getAddress();
    console.log("ERC20 deployed at Address - ", erc20TestAddressB);
  }

  let erc20TestAddressC;
  deployed = (await ethers.getContractAt(
    "TestERC20C",
    TestERC20CExpectedAddress,
    wallet
  )) as TestERC20C;
  if ((await deployed.getDeployedCode()) != null) {
    testERC20C = deployed;
    erc20TestAddressC = await testERC20C.getAddress();
    console.log("ERC20 found at Address - ", erc20TestAddressC);
  } else {
    contractsDeployed = true;
    const { abi: abiC, bytecode: bytecodeC } =
      getContractArtifacts(erc20_c_path);
    const erc20FactoryC = new ethers.ContractFactory(abiC, bytecodeC, wallet);
    testERC20C = (await erc20FactoryC.deploy()) as TestERC20C;
    await testERC20C.waitForDeployment();
    erc20TestAddressC = await testERC20C.getAddress();
    console.log("ERC20 deployed at Address - ", erc20TestAddressC);
  }

  let liquidNFTAddress;
  deployed = (await ethers.getContractAt(
    "LiquidInfrastructureNFT",
    LiquidNFTExpectedAddress,
    wallet
  )) as LiquidInfrastructureNFT;
  if ((await deployed.getDeployedCode()) != null) {
    liquidNFT = deployed;
    liquidNFTAddress = await liquidNFT.getAddress();
    console.log(
      "LiquidInfrastructureNFT found at Address - ",
      liquidNFTAddress
    );
  } else {
    contractsDeployed = true;
    liquidNFT = await ethers.deployContract("LiquidInfrastructureNFT", [
      wallet.address,
    ]);
    await liquidNFT.waitForDeployment();
    liquidNFTAddress = await liquidNFT.getAddress();
    console.log(
      "LiquidInfrastructureNFT deployed at Address - ",
      liquidNFTAddress
    );
  }

  let liquidERC20Address;
  deployed = (await ethers.getContractAt(
    "LiquidInfrastructureERC20",
    LiquidERC20ExpectedAddress,
    wallet
  )) as LiquidInfrastructureERC20;
  if ((await deployed.getDeployedCode()) != null) {
    liquidERC20 = deployed;
    liquidERC20Address = await liquidERC20.getAddress();
    console.log(
      "LiquidInfrastructureERC20 found at Address - ",
      liquidERC20Address
    );
  } else {
    contractsDeployed = true;
    liquidERC20 = await ethers.deployContract("LiquidInfrastructureERC20", [
      "Infra",
      "INFRA",
      [],
      [],
      10,
      // [erc20TestAddressA, erc20TestAddressB, erc20TestAddressC],
      [erc20TestAddressA],
    ]);
    await liquidERC20.waitForDeployment();
    liquidERC20Address = await liquidERC20.getAddress();
    console.log(
      "LiquidInfrastructureERC20 deployed at Address - ",
      liquidERC20Address
    );
  }

  // Generates multi-token activity
  // await generateActivity(
  //   wallet,
  //   contractsDeployed,
  //   [testERC20A, testERC20B, testERC20C],
  //   liquidNFT,
  //   liquidERC20
  // );

  // Generates single-token activity (testERC20A)
  await generateActivity(
    wallet,
    contractsDeployed,
    [testERC20A],
    liquidNFT,
    liquidERC20
  );

  exit(0);
}

function getContractArtifacts(path: string): { bytecode: string; abi: string } {
  var { bytecode, abi } = JSON.parse(fs.readFileSync(path, "utf8").toString());
  return { bytecode, abi };
}

async function generateActivity(
  owner: HardhatEthersSigner,
  deployed: boolean,
  erc20s: ERC20[],
  nft: LiquidInfrastructureNFT,
  erc20: LiquidInfrastructureERC20
) {
  console.log("Generating activity...");
  // Connect erc20s to owner to prevent silly errors
  for (let i = 0; i < erc20s.length; i++) {
    erc20s[i] = erc20s[i].connect(owner);
  }
  let signers: HardhatEthersSigner[] = await ethers.getSigners();
  let holders = signers.slice(1, 6);

  if (deployed) {
    console.log(
      "Contracts deployed, setting up the NFT to be managed by the ERC20"
    );
    await nft.setThresholds(
      erc20s,
      erc20s.map(() => 0)
    );
    // Transfer the NFT over to the ERC20
    await transferNftToErc20AndManage(erc20, nft, owner);
  }

  // Give the NFT a balance of each ERC20
  for (let erc20 of erc20s) {
    console.log("Granting NFT some of the test erc20 tokens");
    const amount = Math.floor(Math.random() * 1000000) + 1000;

    await erc20.transfer(await nft.getAddress(), amount);
  }

  if (deployed) {
    console.log("Contracts deployed, approving holders for the erc20");
    // Approve all the holders to hold the erc20
    for (let holder of holders) {
      await erc20.approveHolder(holder.address);
    }

    let holderAddresses = holders.map((h) => h.address);
    let holderAmounts = holders.map((_, i) => i * 100);
    await transferERC20ToHolders(erc20, holderAddresses, holderAmounts);
  }

  console.log("Deploying a new NFT to manage with the ERC20");
  // Deploy a new NFT, set its thresholds, and manage it under the ERC20
  let newNFT = await ethers.deployContract("LiquidInfrastructureNFT", [
    owner.address,
  ]);
  await newNFT.waitForDeployment();
  console.log("New NFT deployed at Address - ", await newNFT.getAddress());
  console.log("Waiting for chain settlement");
  await sleep(10000);
  console.log("Setting new NFT's thresholds");
  await newNFT.setThresholds(
    erc20s,
    erc20s.map(() => 0)
  );
  console.log("Waiting for chain settlement");
  await sleep(10000);
  console.log("Transferring new NFT ownership to ERC20");
  await transferNftToErc20AndManage(erc20, newNFT, owner);
  console.log("Waiting for chain settlement");
  await sleep(10000); // wait 10 seconds
  // Grant newNFT it some tokens so they can be withdrawn by the ERC20
  for (let erc20 of erc20s) {
    console.log("Granting the new NFT some of the test erc20 tokens");
    const amount = Math.floor(Math.random() * 400000) + 10000;

    await erc20.transfer(await newNFT.getAddress(), amount);
  }

  console.log("Withdrawing...");
  await erc20.withdrawFromAllManagedNFTs();
  console.log(
    "Withdrawal on or before block: ",
    await owner.provider.getBlockNumber()
  );
  console.log();
  await sleep(10000); // wait 10 seconds

  console.log("Distributing..");
  await erc20.distributeToAllHolders();
  console.log(
    "Distribution on or before block: ",
    await owner.provider.getBlockNumber()
  );
}

async function transferNftToErc20AndManage(
  erc20: LiquidInfrastructureERC20,
  nft: LiquidInfrastructureNFT,
  owner: HardhatEthersSigner
) {
  const infraAddress = await erc20.getAddress();
  const accountId = await nft.AccountId();
  await nft.transferFrom(owner, infraAddress, accountId);
  await sleep(10000);
  await erc20.addManagedNFT(await nft.getAddress());
}

async function transferERC20sToReceiver(
  erc20s: ERC20[],
  receiver: AddressLike,
  amount: BigNumberish
) {
  for (let erc20 of erc20s) {
    await erc20.transfer(await receiver, amount);
  }
}

async function transferERC20ToHolders(
  erc20: LiquidInfrastructureERC20,
  holders: AddressLike[],
  amounts: BigNumberish[]
) {
  if (holders.length != amounts.length) {
    throw new Error("Invalid holders and amounts lengths, they must match");
  }
  for (let i = 0; i < holders.length; i++) {
    let holder = holders[i];
    let amount = amounts[i];
    await erc20.mint(holder, amount);
  }
}

async function main() {
  await deploy();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
