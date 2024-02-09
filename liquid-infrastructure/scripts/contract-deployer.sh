#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
npx hardhat run $SCRIPT_DIR/contract-deployer.ts --network localhost