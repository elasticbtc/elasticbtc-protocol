const knownContracts = require('./known-contracts');
const { ebtcPools, POOL_START_DATE } = require('./pools');
const { readAddresses, writeAddresses } = require('./util');

// Tokens
// deployed first
const Cash = artifacts.require('Cash');
const MockWBTC = artifacts.require('MockWBTC');

// ============ Main Migration ============
module.exports = async (deployer, network, accounts) => {
  const seedPools = {};

  for await (const { contractName, token } of ebtcPools) {
    const tokenAddress = knownContracts[token][network] || MockWBTC.address;
    if (!tokenAddress) {
      // network is mainnet, so MockWBTC is not available
      throw new Error(
        `Address of ${token} is not registered on migrations/known-contracts.js!`
      );
    }

    const contract = artifacts.require(contractName);
    const pool = await deployer.deploy(
      contract,
      Cash.address,
      tokenAddress,
      POOL_START_DATE
    );
    seedPools[contractName] = pool.address;
  }

  const addresses = readAddresses(network);
  console.log('Update deployment addresses with seed pools ...');
  addresses.seedPools = seedPools;
  await writeAddresses(addresses, network);
};
