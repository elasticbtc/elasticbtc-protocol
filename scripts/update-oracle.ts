import { network, ethers } from 'hardhat';
import Oracle from '../build/artifacts/contracts/Oracle.sol/Oracle.json';

import { wait } from './utils';

async function main() {
  if (
    network.name !== 'kovan' &&
    network.name !== 'mainnet' &&
    network.name !== 'localhost'
  ) {
    throw new Error('Invalid network');
  }

  if (network.name === 'localhost') {
    network.name = 'development';
  }

  const { provider } = ethers;
  const [operator] = await ethers.getSigners();

  const estimateGasPrice = await provider.getGasPrice();
  const gasPrice = estimateGasPrice.mul(3).div(2);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  const override = { gasPrice };

  const addresses = require(`../deployments/addresses.${network.name}.json`);
  const oracleAddress =
    process.env.FOR_SEINIORAGE === 'true'
      ? addresses.seigniorageOracle
      : addresses.bondOracle;
  const oracle = await ethers.getContractAt(Oracle.abi, oracleAddress);

  console.log(`Updating oracle at ${oracleAddress} ...`);
  try {
    const tx = await oracle.connect(operator).update(override);
    await wait(ethers, tx.hash, `oracle.update`);
  } catch (e) {
    throw new Error(`Failed to update oracle at ${oracleAddress}. Error: ${e}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
