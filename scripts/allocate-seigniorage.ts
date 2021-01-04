import { network, ethers } from 'hardhat';
import Treasury from '../build/artifacts/contracts/Treasury.sol/Treasury.json';

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
  const treasury = await ethers.getContractAt(Treasury.abi, addresses.treasury);

  console.log(
    `Current EBTC TWAP: ${await treasury.getSeigniorageOraclePrice()}`
  );
  console.log(
    `Calling allocateSeigniorage on treasury at ${addresses.treasury} ...`
  );
  try {
    const tx = await treasury.connect(operator).allocateSeigniorage(override);
    await wait(ethers, tx.hash, `oracle.update`);
  } catch (e) {
    throw new Error(`Failed to allocate seigniorage. Error: ${e}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
